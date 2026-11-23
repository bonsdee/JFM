package com.jfmprinthub.purchase;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select po from PurchaseOrder po where po.id = :id")
    Optional<PurchaseOrder> findByIdForUpdate(UUID id);

    @EntityGraph(attributePaths = "supplier")
    @Query("""
           select po from PurchaseOrder po
           where po.status in :statuses
             and (:supplierId is null or po.supplier.id = :supplierId)
             and (:from is null or po.orderDate >= :from)
             and (:to is null or po.orderDate <= :to)
             and (:unpaidOnly = false or po.amountPaid < po.totalAmount)
             and (:q is null or lower(po.poNumber) like lower(concat('%', cast(:q as string), '%'))
                  or lower(po.supplier.name) like lower(concat('%', cast(:q as string), '%')))
           """)
    Page<PurchaseOrder> search(Collection<PurchaseOrder.Status> statuses, UUID supplierId, LocalDate from, LocalDate to,
                               boolean unpaidOnly, String q, Pageable pageable);

    /** Quantity still expected per product from open POs (used by reorder suggestions). */
    @Query("""
           select i.product.id, coalesce(sum(i.qtyOrdered - i.qtyReceived), 0)
           from PurchaseOrderItem i
           where i.purchaseOrder.status in ('DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED')
           group by i.product.id
           """)
    List<Object[]> openQuantities();

    @EntityGraph(attributePaths = "supplier")
    @Query("""
           select po from PurchaseOrder po
           where po.status in ('ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED') and po.amountPaid < po.totalAmount
           order by po.createdAt asc
           """)
    List<PurchaseOrder> findUnpaid();

    @Query("""
           select coalesce(sum(po.totalAmount - po.amountPaid), 0) from PurchaseOrder po
           where po.status in ('ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED')
           """)
    BigDecimal totalPayables();
}
