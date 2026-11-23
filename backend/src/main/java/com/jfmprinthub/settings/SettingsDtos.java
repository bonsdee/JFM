package com.jfmprinthub.settings;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;

public final class SettingsDtos {

    private SettingsDtos() {}

    public record SettingsResponse(
            String businessName, String tagline, String logoPath, String logoUrl, String address, String phone,
            String email, String tin, String facebookUrl, String receiptHeader, String receiptFooter,
            boolean vatEnabled, BigDecimal vatRate, boolean vatInclusive, BigDecimal defaultReorderLevel,
            boolean allowNegativeStock, Instant updatedAt) {}

    public record SettingsRequest(
            @NotBlank @Size(max = 150) String businessName,
            @Size(max = 200) String tagline,
            String logoPath,
            String address,
            @Size(max = 40) String phone,
            @Email @Size(max = 150) String email,
            @Size(max = 40) String tin,
            @Size(max = 255) String facebookUrl,
            String receiptHeader,
            String receiptFooter,
            boolean vatEnabled,
            @NotNull @DecimalMin("0") @DecimalMax("100") BigDecimal vatRate,
            boolean vatInclusive,
            @NotNull @DecimalMin("0") BigDecimal defaultReorderLevel,
            boolean allowNegativeStock) {}

    public record ContentBlock(String key, JsonNode content, Instant updatedAt) {}

    public record ContentUpdateRequest(@NotNull JsonNode content) {}
}
