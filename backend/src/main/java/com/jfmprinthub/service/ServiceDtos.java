package com.jfmprinthub.service;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public final class ServiceDtos {

    private ServiceDtos() {}

    public record MaterialRequest(@NotNull UUID productId, @NotNull @DecimalMin("0.001") BigDecimal qtyPerUnit,
                                  @Size(max = 200) String notes) {}

    public record AddonRequest(UUID id, @NotBlank @Size(max = 100) String name, @NotNull ServiceAddon.ChargeType chargeType,
                               @NotNull @DecimalMin("0") BigDecimal amount, boolean active) {}

    public record ServiceRequest(
            @NotBlank @Size(max = 120) String name,
            @Size(max = 120) String slug,
            UUID categoryId,
            String description,
            @NotNull PricingModel pricingModel,
            @DecimalMin("0") BigDecimal basePrice,
            @DecimalMin("0") BigDecimal rate,
            @DecimalMin("0") BigDecimal colorRate,
            @DecimalMin("0") BigDecimal longSurcharge,
            @DecimalMin("0") BigDecimal minCharge,
            @Min(1) Integer piecesPerBatch,
            @DecimalMin("0") @DecimalMax("500") BigDecimal rushFeePercent,
            @Size(max = 30) String unitLabel,
            @Size(max = 40) String icon,
            boolean showOnWebsite,
            boolean active,
            Integer sortOrder,
            List<@Valid MaterialRequest> materials,
            List<@Valid AddonRequest> addons) {}

    public record MaterialResponse(UUID id, UUID productId, String sku, String productName, String unit,
                                   BigDecimal qtyPerUnit, BigDecimal unitCost, String notes) {}

    public record AddonResponse(UUID id, String name, ServiceAddon.ChargeType chargeType, BigDecimal amount, boolean active) {}

    public record ServiceResponse(UUID id, String code, String name, String slug, UUID categoryId, String categoryName,
                                  String description, PricingModel pricingModel, BigDecimal basePrice, BigDecimal rate,
                                  BigDecimal colorRate, BigDecimal longSurcharge, BigDecimal minCharge,
                                  int piecesPerBatch, BigDecimal rushFeePercent, String unitLabel, String icon,
                                  boolean showOnWebsite, boolean active, boolean archived, int sortOrder,
                                  List<MaterialResponse> materials, List<AddonResponse> addons) {}

    /** Landing-page safe view (no BOM / costs). */
    public record PublicService(String slug, String name, String description, PricingModel pricingModel,
                                BigDecimal startingPrice, String unitLabel, String icon, BigDecimal rushFeePercent,
                                BigDecimal minCharge, List<AddonResponse> addons) {}
}
