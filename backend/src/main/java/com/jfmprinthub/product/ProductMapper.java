package com.jfmprinthub.product;

import com.jfmprinthub.common.Money;
import com.jfmprinthub.product.ProductDtos.ProductOption;
import com.jfmprinthub.product.ProductDtos.ProductResponse;
import com.jfmprinthub.storage.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Hand-written mapper because responses need storage URLs and derived stock fields. */
@Component
@RequiredArgsConstructor
public class ProductMapper {

    private final StorageService storageService;

    public ProductResponse toResponse(Product p) {
        return new ProductResponse(
                p.getId(), p.getSku(), p.getBarcode(), p.getName(), p.getDescription(),
                p.getCategory() != null ? p.getCategory().getId() : null,
                p.getCategory() != null ? p.getCategory().getName() : null,
                p.getUnit(), p.getCostPrice(), p.getSellingPrice(), p.getStockOnHand(), p.getReorderLevel(),
                p.stockStatus(), Money.of(p.getStockOnHand().max(java.math.BigDecimal.ZERO).multiply(p.getCostPrice())),
                p.getSupplier() != null ? p.getSupplier().getId() : null,
                p.getSupplier() != null ? p.getSupplier().getName() : null,
                p.getImagePath(), imageUrl(p), p.getLocation(), p.isMaterial(), p.isArchived(),
                p.getCreatedAt(), p.getUpdatedAt());
    }

    public ProductOption toOption(Product p) {
        return new ProductOption(p.getId(), p.getSku(), p.getBarcode(), p.getName(), p.getUnit(),
                p.getSellingPrice(), p.getStockOnHand(), p.isMaterial(), imageUrl(p));
    }

    private String imageUrl(Product p) {
        return storageService.publicUrl(storageService.buckets().productImages(), p.getImagePath());
    }
}
