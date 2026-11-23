package com.jfmprinthub.stock;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface StockMovementRepository extends JpaRepository<StockMovement, UUID> {

    @EntityGraph(attributePaths = "product")
    @Query("""
           select m from StockMovement m
           where (:productId is null or m.product.id = :productId)
             and (:type is null or m.type = :type)
             and (:reason is null or m.reason = :reason)
             and m.createdAt >= :from
             and m.createdAt < :to
             and (:q is null
                  or lower(m.product.name) like lower(concat('%', cast(:q as string), '%'))
                  or lower(m.product.sku) like lower(concat('%', cast(:q as string), '%'))
                  or lower(coalesce(m.referenceNo, '')) like lower(concat('%', cast(:q as string), '%')))
           """)
    Page<StockMovement> search(UUID productId, MovementType type, MovementReason reason, Instant from, Instant to,
                               String q, Pageable pageable);

    @EntityGraph(attributePaths = "product")
    List<StockMovement> findByReferenceTypeAndReferenceId(String referenceType, UUID referenceId);
}
