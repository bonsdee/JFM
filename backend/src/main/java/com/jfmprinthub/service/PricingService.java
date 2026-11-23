package com.jfmprinthub.service;

import com.jfmprinthub.common.Money;
import com.jfmprinthub.common.exception.BusinessException;
import com.jfmprinthub.common.exception.NotFoundException;
import com.jfmprinthub.product.Product;
import com.jfmprinthub.service.PricingDtos.AddonLine;
import com.jfmprinthub.service.PricingDtos.AddonSelection;
import com.jfmprinthub.service.PricingDtos.MaterialUse;
import com.jfmprinthub.service.PricingDtos.PaperSize;
import com.jfmprinthub.service.PricingDtos.QuoteRequest;
import com.jfmprinthub.service.PricingDtos.QuoteResult;
import com.jfmprinthub.stock.MovementReason;
import com.jfmprinthub.stock.StockPost;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * THE single source of truth for service prices. The landing page estimator (via /api/public/quote),
 * the POS and job orders all call {@link #quote(QuoteRequest)}, so a 3×5 ft tarp is priced identically everywhere.
 */
@Service
@RequiredArgsConstructor
public class PricingService {

    private final CatalogServiceRepository serviceRepository;

    @Transactional(readOnly = true)
    public QuoteResult quote(QuoteRequest req) {
        return calculate(resolve(req), req);
    }

    @Transactional(readOnly = true)
    public CatalogService resolve(QuoteRequest req) {
        CatalogService s;
        if (req.serviceId() != null) {
            s = serviceRepository.findById(req.serviceId()).orElseThrow(() -> NotFoundException.of("Service", req.serviceId()));
        } else if (req.serviceSlug() != null && !req.serviceSlug().isBlank()) {
            s = serviceRepository.findBySlug(req.serviceSlug())
                    .orElseThrow(() -> new NotFoundException("Service not found: " + req.serviceSlug()));
        } else {
            throw new BusinessException("SERVICE_REQUIRED", "serviceId or serviceSlug is required");
        }
        if (s.isArchived() || !s.isActive()) throw new BusinessException("SERVICE_INACTIVE", s.getName() + " is not available");
        return s;
    }

    /** Pure calculation (no I/O besides lazy BOM access) — unit tested directly. */
    public QuoteResult calculate(CatalogService s, QuoteRequest req) {
        BigDecimal qty = req.quantity() == null ? BigDecimal.ONE : req.quantity();
        if (qty.signum() <= 0) throw new BusinessException("INVALID_QUANTITY", "Quantity must be greater than zero");

        BigDecimal units;
        BigDecimal base;
        boolean minimumApplied = false;
        Map<String, Object> specs = new LinkedHashMap<>();
        specs.put("quantity", qty);
        String detail;

        switch (s.getPricingModel()) {
            case FIXED -> {
                units = qty;
                base = Money.nz(s.getBasePrice()).multiply(qty);
                detail = qty.stripTrailingZeros().toPlainString() + " × " + nz(s.getUnitLabel(), "package");
            }
            case PER_SQFT -> {
                BigDecimal w = req.widthFt(), h = req.heightFt();
                if (w == null || h == null || w.signum() <= 0 || h.signum() <= 0) {
                    throw new BusinessException("SIZE_REQUIRED", "Width and height (ft) are required for " + s.getName());
                }
                BigDecimal area = w.multiply(h);
                BigDecimal perPiece = area.multiply(Money.nz(s.getRate()));
                if (perPiece.compareTo(Money.nz(s.getMinCharge())) < 0) {
                    perPiece = s.getMinCharge();
                    minimumApplied = true;
                }
                units = area.multiply(qty);
                base = perPiece.multiply(qty);
                specs.put("widthFt", w);
                specs.put("heightFt", h);
                specs.put("areaSqft", Money.qty(area));
                detail = trim(w) + "×" + trim(h) + " ft" + (qty.compareTo(BigDecimal.ONE) > 0 ? " × " + trim(qty) : "");
            }
            case PER_PIECE -> {
                int batch = Math.max(1, s.getPiecesPerBatch());
                BigDecimal batches = qty.divide(BigDecimal.valueOf(batch), 0, RoundingMode.CEILING);
                units = qty;
                base = batches.multiply(Money.nz(s.getRate()));
                if (base.compareTo(Money.nz(s.getMinCharge())) < 0) {
                    base = s.getMinCharge();
                    minimumApplied = true;
                }
                detail = trim(qty) + " pcs" + (batch > 1 ? " (" + batches.toPlainString() + " × " + batch + ")" : "");
            }
            case PER_PAGE -> {
                int pages = req.pages() == null ? 0 : req.pages();
                if (pages <= 0) throw new BusinessException("PAGES_REQUIRED", "Number of pages is required for " + s.getName());
                PaperSize size = req.paperSize() == null ? PaperSize.SHORT : req.paperSize();
                BigDecimal pageRate = req.colored() ? Money.nz(s.getColorRate()) : Money.nz(s.getRate());
                if (size == PaperSize.LONG) pageRate = pageRate.add(Money.nz(s.getLongSurcharge()));
                units = BigDecimal.valueOf(pages).multiply(qty);
                base = units.multiply(pageRate);
                if (base.compareTo(Money.nz(s.getMinCharge())) < 0) {
                    base = s.getMinCharge();
                    minimumApplied = true;
                }
                specs.put("pages", pages);
                specs.put("colored", req.colored());
                specs.put("paperSize", size.name());
                detail = pages + " page" + (pages == 1 ? "" : "s") + (qty.compareTo(BigDecimal.ONE) > 0 ? " × " + trim(qty) + " copies" : "")
                        + " (" + (req.colored() ? "colored" : "B&W") + ", " + size.name().toLowerCase() + ")";
            }
            default -> throw new IllegalStateException("Unknown pricing model");
        }
        base = Money.of(base);

        // Add-ons
        List<AddonLine> addonLines = new ArrayList<>();
        BigDecimal addonTotal = BigDecimal.ZERO;
        List<Map<String, Object>> addonSpecs = new ArrayList<>();
        if (req.addons() != null) {
            for (AddonSelection sel : req.addons()) {
                ServiceAddon a = s.getAddons().stream()
                        .filter(x -> x.getId().equals(sel.addonId()) && x.isActive())
                        .findFirst()
                        .orElseThrow(() -> new BusinessException("INVALID_ADDON", "Add-on not available for " + s.getName()));
                BigDecimal amt = switch (a.getChargeType()) {
                    case FIXED -> a.getAmount();
                    case PERCENT -> Money.percentOf(base, a.getAmount());
                    case PER_UNIT -> a.getAmount().multiply(units);
                    case PER_PIECE -> a.getAmount().multiply(sel.quantity() != null ? sel.quantity() : qty);
                };
                amt = Money.of(amt);
                addonTotal = addonTotal.add(amt);
                addonLines.add(new AddonLine(a.getId(), a.getName(), a.getChargeType(), amt));
                Map<String, Object> as = new LinkedHashMap<>();
                as.put("addonId", a.getId().toString());
                as.put("name", a.getName());
                if (sel.quantity() != null) as.put("quantity", sel.quantity());
                addonSpecs.add(as);
            }
        }
        if (!addonSpecs.isEmpty()) specs.put("addons", addonSpecs);

        BigDecimal subtotal = base.add(addonTotal);
        BigDecimal rushFee = BigDecimal.ZERO;
        if (req.rush() && Money.isPositive(s.getRushFeePercent())) {
            rushFee = Money.percentOf(subtotal, s.getRushFeePercent());
        }
        specs.put("rush", req.rush());
        BigDecimal total = Money.of(subtotal.add(rushFee));
        BigDecimal unitPrice = total.divide(qty, 2, RoundingMode.HALF_UP);
        units = Money.qty(units);
        specs.put("billableUnits", units);
        if (req.notes() != null && !req.notes().isBlank()) specs.put("notes", req.notes());

        // Bill of materials estimate
        List<MaterialUse> materials = materialsFor(s, units);
        BigDecimal materialCost = materials.stream().map(MaterialUse::cost).reduce(BigDecimal.ZERO, BigDecimal::add);

        String description = s.getName() + " — " + detail
                + (addonLines.isEmpty() ? "" : " + " + String.join(", ", addonLines.stream().map(AddonLine::name).toList()))
                + (req.rush() ? " [RUSH]" : "");
        if (description.length() > 255) description = description.substring(0, 252) + "...";

        return new QuoteResult(s.getId(), s.getName(), s.getPricingModel(), qty, units, s.getUnitLabel(), base,
                minimumApplied, addonLines, rushFee, total, unitPrice, description, specs, materials, Money.of(materialCost));
    }

    /** Material requirement for a number of billable units (used by quotes and consumption). */
    public List<MaterialUse> materialsFor(CatalogService s, BigDecimal billableUnits) {
        List<MaterialUse> list = new ArrayList<>();
        for (ServiceMaterial m : s.getMaterials()) {
            Product p = m.getProduct();
            BigDecimal need = Money.qty(billableUnits.multiply(m.getQtyPerUnit()));
            if (need.signum() <= 0) continue;
            list.add(new MaterialUse(p.getId(), p.getSku(), p.getName(), p.getUnit().name(), need, p.getCostPrice(),
                    Money.of(need.multiply(p.getCostPrice())), p.getStockOnHand(),
                    p.getStockOnHand().compareTo(need) >= 0));
        }
        return list;
    }

    /** Stock postings that consume a service's BOM. */
    public List<StockPost> consumptionPosts(CatalogService s, BigDecimal billableUnits, MovementReason reason,
                                            String refType, UUID refId, String refNo) {
        return materialsFor(s, billableUnits).stream()
                .map(m -> StockPost.out(m.productId(), reason, m.quantity(), refType, refId, refNo, s.getName()))
                .toList();
    }

    private static String trim(BigDecimal v) {
        return v.stripTrailingZeros().toPlainString();
    }

    private static String nz(String s, String fallback) {
        return s == null || s.isBlank() ? fallback : s;
    }
}
