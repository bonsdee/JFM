package com.jfmprinthub.joborder;

import com.jfmprinthub.common.BaseEntity;
import com.jfmprinthub.service.CatalogService;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

/** A priced service line in a job order. {@code specs.billableUnits} drives BOM consumption. */
@Getter
@Setter
@Entity
@Table(name = "job_order_items")
public class JobOrderItem extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "job_order_id", nullable = false)
    private JobOrder jobOrder;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "service_id", nullable = false)
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

    private BigDecimal materialCost = BigDecimal.ZERO;
}
