package com.jfmprinthub.service;

import com.jfmprinthub.service.ServiceDtos.AddonResponse;
import com.jfmprinthub.service.ServiceDtos.MaterialResponse;
import com.jfmprinthub.service.ServiceDtos.PublicService;
import com.jfmprinthub.service.ServiceDtos.ServiceResponse;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class ServiceMapper {

    public ServiceResponse toResponse(CatalogService s) {
        return new ServiceResponse(s.getId(), s.getCode(), s.getName(), s.getSlug(),
                s.getCategory() != null ? s.getCategory().getId() : null,
                s.getCategory() != null ? s.getCategory().getName() : null,
                s.getDescription(), s.getPricingModel(), s.getBasePrice(), s.getRate(), s.getColorRate(),
                s.getLongSurcharge(), s.getMinCharge(), s.getPiecesPerBatch(), s.getRushFeePercent(), s.getUnitLabel(),
                s.getIcon(), s.isShowOnWebsite(), s.isActive(), s.isArchived(), s.getSortOrder(),
                s.getMaterials().stream().map(m -> new MaterialResponse(m.getId(), m.getProduct().getId(),
                        m.getProduct().getSku(), m.getProduct().getName(), m.getProduct().getUnit().name(),
                        m.getQtyPerUnit(), m.getProduct().getCostPrice(), m.getNotes())).toList(),
                s.getAddons().stream().map(this::addon).toList());
    }

    public PublicService toPublic(CatalogService s) {
        return new PublicService(s.getSlug(), s.getName(), s.getDescription(), s.getPricingModel(), startingPrice(s),
                s.getUnitLabel(), s.getIcon(), s.getRushFeePercent(), s.getMinCharge(),
                s.getAddons().stream().filter(ServiceAddon::isActive).map(this::addon).toList());
    }

    private AddonResponse addon(ServiceAddon a) {
        return new AddonResponse(a.getId(), a.getName(), a.getChargeType(), a.getAmount(), a.isActive());
    }

    /** "Starts at" price shown on the landing page. */
    private static BigDecimal startingPrice(CatalogService s) {
        return switch (s.getPricingModel()) {
            case FIXED -> s.getBasePrice();
            default -> s.getRate();
        };
    }
}
