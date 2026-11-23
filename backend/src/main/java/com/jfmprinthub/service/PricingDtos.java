package com.jfmprinthub.service;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Request/response types for the shared pricing calculator. */
public final class PricingDtos {

    private PricingDtos() {}

    public enum PaperSize { SHORT, A4, LONG }

    public record AddonSelection(UUID addonId, @DecimalMin("0") BigDecimal quantity) {}

    /**
     * One priced line. Identify the service by {@code serviceId} or (public endpoint) {@code serviceSlug}.
     * Only the fields relevant to the service's pricing model are used.
     */
    public record QuoteRequest(
            UUID serviceId,
            @Size(max = 120) String serviceSlug,
            @DecimalMin(value = "0.001") @DecimalMax("100000") BigDecimal quantity,
            @DecimalMin("0") @DecimalMax("1000") BigDecimal widthFt,
            @DecimalMin("0") @DecimalMax("1000") BigDecimal heightFt,
            @Min(0) @Max(100000) Integer pages,
            boolean colored,
            PaperSize paperSize,
            boolean rush,
            List<@Valid AddonSelection> addons,
            @Size(max = 255) String notes
    ) {}

    public record AddonLine(UUID addonId, String name, ServiceAddon.ChargeType chargeType, BigDecimal amount) {}

    public record MaterialUse(UUID productId, String sku, String name, String unit, BigDecimal quantity,
                              BigDecimal unitCost, BigDecimal cost, BigDecimal onHand, boolean sufficient) {}

    public record QuoteResult(
            UUID serviceId,
            String serviceName,
            PricingModel pricingModel,
            BigDecimal quantity,
            BigDecimal billableUnits,
            String unitLabel,
            BigDecimal baseAmount,
            boolean minimumApplied,
            List<AddonLine> addons,
            BigDecimal rushFee,
            BigDecimal total,
            BigDecimal unitPrice,
            String description,
            Map<String, Object> specs,
            List<MaterialUse> materials,
            BigDecimal materialCost
    ) {}

    /** Public quote: no cost or stock information. */
    public record PublicQuote(String serviceName, PricingModel pricingModel, BigDecimal quantity,
                              BigDecimal billableUnits, String unitLabel, BigDecimal baseAmount,
                              boolean minimumApplied, List<AddonLine> addons, BigDecimal rushFee,
                              BigDecimal total, String description) {
        public static PublicQuote from(QuoteResult q) {
            return new PublicQuote(q.serviceName(), q.pricingModel(), q.quantity(), q.billableUnits(), q.unitLabel(),
                    q.baseAmount(), q.minimumApplied(), q.addons(), q.rushFee(), q.total(), q.description());
        }
    }
}
