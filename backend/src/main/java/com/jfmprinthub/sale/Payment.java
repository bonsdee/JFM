package com.jfmprinthub.sale;

import com.jfmprinthub.common.BaseEntity;
import com.jfmprinthub.common.PaymentMethod;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Money received. Linked to a POS sale and/or a job order (down/balance payments).
 * When a job order is claimed its payments are also linked to the resulting sale.
 * Cash closing aggregates by {@code paidAt} and {@code method}.
 */
@Getter
@Setter
@Entity
@Table(name = "payments")
public class Payment extends BaseEntity {

    private UUID saleId;
    private UUID jobOrderId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentMethod method;

    @Column(nullable = false)
    private BigDecimal amount;

    private String referenceNo;
    private String notes;
    private boolean voided;

    @Column(nullable = false)
    private Instant paidAt;
}
