package com.jfmprinthub.service;

import com.jfmprinthub.category.Category;
import com.jfmprinthub.common.BaseEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * A sellable print/online service (named CatalogService to avoid clashing with Spring's @Service).
 * Pricing fields are interpreted per {@link PricingModel}; see {@link PricingService}.
 */
@Getter
@Setter
@Entity
@Table(name = "services")
public class CatalogService extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String code;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String slug;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PricingModel pricingModel;

    /** FIXED: price per package. */
    private BigDecimal basePrice = BigDecimal.ZERO;
    /** PER_SQFT: per sq ft. PER_PIECE: per batch of {@link #piecesPerBatch}. PER_PAGE: per B&amp;W page. */
    private BigDecimal rate = BigDecimal.ZERO;
    /** PER_PAGE: per colored page. */
    private BigDecimal colorRate = BigDecimal.ZERO;
    /** PER_PAGE: extra per page for long/legal paper. */
    private BigDecimal longSurcharge = BigDecimal.ZERO;
    private BigDecimal minCharge = BigDecimal.ZERO;
    private int piecesPerBatch = 1;
    private BigDecimal rushFeePercent = BigDecimal.ZERO;
    private String unitLabel;
    private String icon;
    private boolean showOnWebsite = true;
    private boolean active = true;
    private boolean archived;
    private int sortOrder;

    @OneToMany(mappedBy = "service", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ServiceMaterial> materials = new ArrayList<>();

    @OneToMany(mappedBy = "service", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("name")
    private List<ServiceAddon> addons = new ArrayList<>();
}
