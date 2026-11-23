package com.jfmprinthub.sale;

import com.jfmprinthub.common.BaseEntity;
import com.jfmprinthub.customer.Customer;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "sales")
public class Sale extends BaseEntity {

    public enum Source { POS, JOB_ORDER }

    public enum Status { COMPLETED, VOIDED }

    public enum DiscountType { AMOUNT, PERCENT }

    @Column(nullable = false, unique = true)
    private String saleNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private Customer customer;

    /** Set when the sale was produced by claiming a job order. */
    private UUID jobOrderId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Source source = Source.POS;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.COMPLETED;

    private BigDecimal subtotal = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    private DiscountType discountType;

    private BigDecimal discountValue = BigDecimal.ZERO;
    private BigDecimal discountAmount = BigDecimal.ZERO;
    private BigDecimal taxAmount = BigDecimal.ZERO;
    private BigDecimal total = BigDecimal.ZERO;
    private BigDecimal costTotal = BigDecimal.ZERO;
    private BigDecimal amountTendered = BigDecimal.ZERO;
    private BigDecimal changeDue = BigDecimal.ZERO;
    private String notes;

    @Column(nullable = false)
    private Instant soldAt;

    private Instant voidedAt;
    private String voidReason;

    @OneToMany(mappedBy = "sale", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<SaleItem> items = new ArrayList<>();

    public void addItem(SaleItem item) {
        item.setSale(this);
        items.add(item);
    }
}
