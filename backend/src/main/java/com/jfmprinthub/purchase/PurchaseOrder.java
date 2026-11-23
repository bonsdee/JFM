package com.jfmprinthub.purchase;

import com.jfmprinthub.common.BaseEntity;
import com.jfmprinthub.supplier.Supplier;
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
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Entity
@Table(name = "purchase_orders")
public class PurchaseOrder extends BaseEntity {

    public enum Status { DRAFT, ORDERED, PARTIALLY_RECEIVED, RECEIVED, CANCELLED }

    @Column(nullable = false, unique = true)
    private String poNumber;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "supplier_id", nullable = false)
    private Supplier supplier;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.DRAFT;

    private LocalDate orderDate;
    private LocalDate expectedDate;
    private String notes;
    private BigDecimal totalAmount = BigDecimal.ZERO;
    private BigDecimal amountPaid = BigDecimal.ZERO;
    private Instant orderedAt;
    private Instant receivedAt;
    private Instant cancelledAt;

    @OneToMany(mappedBy = "purchaseOrder", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt")
    private List<PurchaseOrderItem> items = new ArrayList<>();

    @OneToMany(mappedBy = "purchaseOrder", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("paidAt")
    private List<SupplierPayment> payments = new ArrayList<>();

    public BigDecimal balance() {
        return totalAmount.subtract(amountPaid).max(BigDecimal.ZERO);
    }

    /** Value of goods actually received (what we owe for once delivered). */
    public BigDecimal receivedValue() {
        return items.stream().map(i -> i.getQtyReceived().multiply(i.getUnitCost())).reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
