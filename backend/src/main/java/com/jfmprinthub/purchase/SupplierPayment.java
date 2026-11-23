package com.jfmprinthub.purchase;

import com.jfmprinthub.common.BaseEntity;
import com.jfmprinthub.common.PaymentMethod;
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
import java.time.Instant;

/** Money paid to a supplier against a purchase order (supplier payables). */
@Getter
@Setter
@Entity
@Table(name = "supplier_payments")
public class SupplierPayment extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "purchase_order_id", nullable = false)
    private PurchaseOrder purchaseOrder;

    @Column(nullable = false)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentMethod method;

    private String referenceNo;
    private String notes;

    @Column(nullable = false)
    private Instant paidAt;
}
