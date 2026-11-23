package com.jfmprinthub.product;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class ProductDtos {

    private ProductDtos() {}

    /** Create/update payload. Stock is NOT editable here — use stock movements. */
    public record ProductRequest(
            @Size(max = 40) String sku,                // blank = auto-generate
            @Size(max = 64) String barcode,
            @NotBlank @Size(max = 150) String name,
            String description,
            UUID categoryId,
            @NotNull Product.Unit unit,
            @NotNull @DecimalMin("0") BigDecimal costPrice,
            @NotNull @DecimalMin("0") BigDecimal sellingPrice,
            @DecimalMin("0") BigDecimal reorderLevel,
            UUID supplierId,
            String imagePath,
            @Size(max = 80) String location,
            boolean material,
            @DecimalMin("0") BigDecimal initialStock    // only honoured on create
    ) {}

    public record ProductResponse(
            UUID id, String sku, String barcode, String name, String description,
            UUID categoryId, String categoryName, Product.Unit unit,
            BigDecimal costPrice, BigDecimal sellingPrice, BigDecimal stockOnHand, BigDecimal reorderLevel,
            Product.StockStatus stockStatus, BigDecimal stockValue,
            UUID supplierId, String supplierName, String imagePath, String imageUrl, String location,
            boolean material, boolean archived, Instant createdAt, Instant updatedAt) {}

    /** Compact item for pickers, POS search and command palette. */
    public record ProductOption(UUID id, String sku, String barcode, String name, Product.Unit unit,
                                BigDecimal sellingPrice, BigDecimal stockOnHand, boolean material, String imageUrl) {}

    public record ImportResult(int created, int skipped, List<String> errors) {}
}
