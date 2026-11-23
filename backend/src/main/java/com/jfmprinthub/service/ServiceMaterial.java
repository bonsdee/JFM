package com.jfmprinthub.service;

import com.jfmprinthub.common.BaseEntity;
import com.jfmprinthub.product.Product;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

/** Bill-of-materials line: {@code qtyPerUnit} of a material per billable unit of the service. */
@Getter
@Setter
@Entity
@Table(name = "service_materials")
public class ServiceMaterial extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "service_id", nullable = false)
    private CatalogService service;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false)
    private BigDecimal qtyPerUnit;

    private String notes;
}
