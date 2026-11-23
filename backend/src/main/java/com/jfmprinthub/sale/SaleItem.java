package com.jfmprinthub.sale;

import com.jfmprinthub.common.BaseEntity;
import com.jfmprinthub.product.Product;
import com.jfmprinthub.service.CatalogService;
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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.util.Map;

/** A sale line: either a product or a priced service. Cost fields drive COGS / gross profit. */
@Getter
@Setter
@Entity
@Table(name = "sale_items")
public class SaleItem extends BaseEntity {

    public enum LineType { PRODUCT, SERVICE }

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sale_id", nullable = false)
    private Sale sale;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LineType lineType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id")
    private CatalogService service;

    @Column(nullable = false)
    private String description;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> specs;

    @Column(nullable = false)
    private BigDecimal quantity;

    @Column(nullable = false)
    private BigDecimal unitPrice;

    @Column(nullable = false)
    private BigDecimal lineTotal;

    private BigDecimal unitCost = BigDecimal.ZERO;
    private BigDecimal costTotal = BigDecimal.ZERO;
}
