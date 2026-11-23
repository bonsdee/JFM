package com.jfmprinthub.purchase;

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

@Getter
@Setter
@Entity
@Table(name = "purchase_order_items")
public class PurchaseOrderItem extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "purchase_order_id", nullable = false)
    private PurchaseOrder purchaseOrder;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false)
    private BigDecimal qtyOrdered;

    @Column(nullable = false)
    private BigDecimal qtyReceived = BigDecimal.ZERO;

    @Column(nullable = false)
    private BigDecimal unitCost;

    public BigDecimal remaining() {
        return qtyOrdered.subtract(qtyReceived);
    }

    public BigDecimal lineTotal() {
        return qtyOrdered.multiply(unitCost);
    }
}
