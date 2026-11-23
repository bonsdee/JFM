package com.jfmprinthub.stock;

import com.jfmprinthub.product.Product;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * One immutable row in the inventory ledger. {@code quantity} is a signed delta.
 * Movements are never updated or deleted; corrections are new movements.
 */
@Getter
@Setter
@Entity
@Table(name = "stock_movements")
public class StockMovement {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Enumerated(EnumType.STRING)
    @Column(name = "movement_type", nullable = false)
    private MovementType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MovementReason reason;

    @Column(nullable = false)
    private BigDecimal quantity;

    private BigDecimal unitCost;

    @Column(nullable = false)
    private BigDecimal balanceAfter;

    private String referenceType;
    private UUID referenceId;
    private String referenceNo;
    private String notes;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;
}
