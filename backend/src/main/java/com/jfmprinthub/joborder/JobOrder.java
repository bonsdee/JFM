package com.jfmprinthub.joborder;

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
import jakarta.persistence.OrderBy;
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
@Table(name = "job_orders")
public class JobOrder extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String jobNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private Customer customer;

    private String customerName;
    private String customerPhone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private JobStatus status = JobStatus.PENDING;

    private Instant dueAt;
    private String notes;
    private BigDecimal subtotal = BigDecimal.ZERO;
    private BigDecimal discountAmount = BigDecimal.ZERO;
    private BigDecimal total = BigDecimal.ZERO;
    private BigDecimal amountPaid = BigDecimal.ZERO;
    private boolean materialsConsumed;
    private Instant printedAt;
    private Instant claimedAt;
    private Instant cancelledAt;
    private String cancelReason;
    private UUID saleId;
    private int boardPosition;

    @OneToMany(mappedBy = "jobOrder", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt")
    private List<JobOrderItem> items = new ArrayList<>();

    @OneToMany(mappedBy = "jobOrder", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt")
    private List<JobOrderFile> files = new ArrayList<>();

    public BigDecimal balance() {
        return total.subtract(amountPaid).max(BigDecimal.ZERO);
    }

    public boolean isOverdue() {
        return dueAt != null && dueAt.isBefore(Instant.now()) && status.isOpen();
    }

    public String displayCustomer() {
        if (customer != null) return customer.getName();
        return customerName == null || customerName.isBlank() ? "Walk-in" : customerName;
    }
}
