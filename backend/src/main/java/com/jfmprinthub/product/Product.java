package com.jfmprinthub.product;

import com.jfmprinthub.category.Category;
import com.jfmprinthub.common.BaseEntity;
import com.jfmprinthub.supplier.Supplier;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * A retail item or a material (consumable used by services).
 * {@code stockOnHand} and {@code costPrice} (weighted average) are maintained exclusively by
 * {@link com.jfmprinthub.stock.StockService}; never set them anywhere else.
 */
@Getter
@Setter
@Entity
@Table(name = "products")
public class Product extends BaseEntity {

    public enum Unit { PCS, REAM, ROLL, SQFT, ML, BOX, PACK }

    public enum StockStatus { IN_STOCK, LOW, OUT }

    @Column(nullable = false, unique = true)
    private String sku;

    private String barcode;

    @Column(nullable = false)
    private String name;

    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Unit unit;

    @Column(nullable = false)
    private BigDecimal costPrice = BigDecimal.ZERO;

    @Column(nullable = false)
    private BigDecimal sellingPrice = BigDecimal.ZERO;

    @Column(nullable = false)
    private BigDecimal stockOnHand = BigDecimal.ZERO;

    @Column(nullable = false)
    private BigDecimal reorderLevel = BigDecimal.ZERO;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_id")
    private Supplier supplier;

    private String imagePath;
    private String location;

    @Column(name = "is_material", nullable = false)
    private boolean material;

    private boolean archived;

    public StockStatus stockStatus() {
        if (stockOnHand.signum() <= 0) return StockStatus.OUT;
        if (stockOnHand.compareTo(reorderLevel) <= 0) return StockStatus.LOW;
        return StockStatus.IN_STOCK;
    }
}
