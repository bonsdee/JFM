package com.jfmprinthub.service;

import com.jfmprinthub.audit.AuditAction;
import com.jfmprinthub.audit.AuditService;
import com.jfmprinthub.category.CategoryRepository;
import com.jfmprinthub.common.DocumentNumberService;
import com.jfmprinthub.common.Money;
import com.jfmprinthub.common.exception.BusinessException;
import com.jfmprinthub.common.exception.NotFoundException;
import com.jfmprinthub.product.Product;
import com.jfmprinthub.product.ProductRepository;
import com.jfmprinthub.service.ServiceDtos.AddonRequest;
import com.jfmprinthub.service.ServiceDtos.MaterialRequest;
import com.jfmprinthub.service.ServiceDtos.PublicService;
import com.jfmprinthub.service.ServiceDtos.ServiceRequest;
import com.jfmprinthub.service.ServiceDtos.ServiceResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/** CRUD for the services catalog including its bill of materials and add-ons. */
@Service
@RequiredArgsConstructor
public class ServiceCatalogService {

    private final CatalogServiceRepository repository;
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final ServiceMapper mapper;
    private final DocumentNumberService numbers;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public List<ServiceResponse> list(boolean archived) {
        return repository.findAllForList(archived).stream().map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<PublicService> publicList() {
        return repository.findPublic().stream().map(mapper::toPublic).toList();
    }

    @Transactional(readOnly = true)
    public CatalogService entity(UUID id) {
        return repository.findById(id).orElseThrow(() -> NotFoundException.of("Service", id));
    }

    @Transactional(readOnly = true)
    public ServiceResponse get(UUID id) {
        return mapper.toResponse(entity(id));
    }

    @Transactional
    public ServiceResponse create(ServiceRequest r) {
        CatalogService s = new CatalogService();
        s.setCode(numbers.nextServiceCode());
        apply(s, r);
        repository.save(s);
        auditService.record(AuditAction.CREATE, "SERVICE", s.getId(), "Created service " + s.getName());
        return mapper.toResponse(s);
    }

    @Transactional
    public ServiceResponse update(UUID id, ServiceRequest r) {
        CatalogService s = entity(id);
        apply(s, r);
        auditService.record(AuditAction.UPDATE, "SERVICE", id, "Updated service " + s.getName(),
                Map.of("pricingModel", s.getPricingModel().name(), "rate", s.getRate()));
        return mapper.toResponse(s);
    }

    @Transactional
    public ServiceResponse setArchived(UUID id, boolean archived) {
        CatalogService s = entity(id);
        s.setArchived(archived);
        auditService.record(archived ? AuditAction.ARCHIVE : AuditAction.RESTORE, "SERVICE", id,
                (archived ? "Archived " : "Restored ") + s.getName());
        return mapper.toResponse(s);
    }

    private void apply(CatalogService s, ServiceRequest r) {
        s.setName(r.name().trim());
        String slug = slugify(r.slug() == null || r.slug().isBlank() ? r.name() : r.slug());
        if (!slug.equals(s.getSlug())) {
            String candidate = slug;
            int n = 2;
            while (repository.existsBySlug(candidate)) candidate = slug + "-" + n++;
            s.setSlug(candidate);
        }
        s.setCategory(r.categoryId() == null ? null : categoryRepository.findById(r.categoryId())
                .orElseThrow(() -> NotFoundException.of("Category", r.categoryId())));
        s.setDescription(r.description());
        s.setPricingModel(r.pricingModel());
        s.setBasePrice(Money.of(r.basePrice()));
        s.setRate(Money.of(r.rate()));
        s.setColorRate(Money.of(r.colorRate()));
        s.setLongSurcharge(Money.of(r.longSurcharge()));
        s.setMinCharge(Money.of(r.minCharge()));
        s.setPiecesPerBatch(r.piecesPerBatch() == null ? 1 : r.piecesPerBatch());
        s.setRushFeePercent(r.rushFeePercent() == null ? BigDecimal.ZERO : r.rushFeePercent());
        s.setUnitLabel(r.unitLabel());
        s.setIcon(r.icon());
        s.setShowOnWebsite(r.showOnWebsite());
        s.setActive(r.active());
        if (r.sortOrder() != null) s.setSortOrder(r.sortOrder());
        validatePricing(s);
        syncMaterials(s, r.materials() == null ? List.of() : r.materials());
        syncAddons(s, r.addons() == null ? List.of() : r.addons());
    }

    private static void validatePricing(CatalogService s) {
        boolean ok = switch (s.getPricingModel()) {
            case FIXED -> Money.isPositive(s.getBasePrice());
            case PER_SQFT, PER_PIECE -> Money.isPositive(s.getRate());
            case PER_PAGE -> Money.isPositive(s.getRate()) || Money.isPositive(s.getColorRate());
        };
        if (!ok) throw new BusinessException("INVALID_PRICING", "Set a price/rate greater than zero for the " + s.getPricingModel() + " model");
    }

    private void syncMaterials(CatalogService s, List<MaterialRequest> requested) {
        Set<UUID> seen = new HashSet<>();
        for (MaterialRequest m : requested) {
            if (!seen.add(m.productId())) throw new BusinessException("DUPLICATE_MATERIAL", "A material is listed twice");
        }
        Map<UUID, ServiceMaterial> existing = s.getMaterials().stream()
                .collect(Collectors.toMap(m -> m.getProduct().getId(), Function.identity()));
        s.getMaterials().removeIf(m -> !seen.contains(m.getProduct().getId()));
        for (MaterialRequest m : requested) {
            ServiceMaterial sm = existing.get(m.productId());
            if (sm == null) {
                Product p = productRepository.findById(m.productId()).orElseThrow(() -> NotFoundException.of("Product", m.productId()));
                sm = new ServiceMaterial();
                sm.setService(s);
                sm.setProduct(p);
                s.getMaterials().add(sm);
            }
            sm.setQtyPerUnit(Money.qty(m.qtyPerUnit()));
            sm.setNotes(m.notes());
        }
    }

    private void syncAddons(CatalogService s, List<AddonRequest> requested) {
        Set<UUID> keep = requested.stream().map(AddonRequest::id).filter(java.util.Objects::nonNull).collect(Collectors.toSet());
        s.getAddons().removeIf(a -> !keep.contains(a.getId()));
        Map<UUID, ServiceAddon> byId = s.getAddons().stream().collect(Collectors.toMap(ServiceAddon::getId, Function.identity()));
        for (AddonRequest a : requested) {
            ServiceAddon sa = a.id() == null ? null : byId.get(a.id());
            if (sa == null) {
                sa = new ServiceAddon();
                sa.setService(s);
                s.getAddons().add(sa);
            }
            sa.setName(a.name().trim());
            sa.setChargeType(a.chargeType());
            sa.setAmount(Money.of(a.amount()));
            sa.setActive(a.active());
        }
    }

    static String slugify(String input) {
        String n = Normalizer.normalize(input, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        String slug = n.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
        return slug.isEmpty() ? "service" : slug;
    }
}
