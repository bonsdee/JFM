package com.jfmprinthub.sale;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface SaleRepository extends JpaRepository<Sale, UUID> {

    @EntityGraph(attributePaths = "customer")
    @Query("""
           select s from Sale s left join s.customer c
           where (:status is null or s.status = :status)
             and (:source is null or s.source = :source)
             and (:customerId is null or c.id = :customerId)
             and s.soldAt >= :from
             and s.soldAt < :to
             and (:q is null
                  or lower(s.saleNumber) like lower(concat('%', cast(:q as string), '%'))
                  or lower(coalesce(c.name, '')) like lower(concat('%', cast(:q as string), '%')))
           """)
    Page<Sale> search(Sale.Status status, Sale.Source source, UUID customerId, Instant from, Instant to, String q,
                      Pageable pageable);

    @Query("select coalesce(sum(s.total), 0) from Sale s where s.status = 'COMPLETED' and s.soldAt >= :from and s.soldAt < :to")
    BigDecimal totalBetween(Instant from, Instant to);

    @Query("select coalesce(sum(s.total - s.costTotal), 0) from Sale s where s.status = 'COMPLETED' and s.soldAt >= :from and s.soldAt < :to")
    BigDecimal grossProfitBetween(Instant from, Instant to);

    @Query("select count(s) from Sale s where s.status = 'COMPLETED' and s.soldAt >= :from and s.soldAt < :to")
    long countBetween(Instant from, Instant to);

    @EntityGraph(attributePaths = "customer")
    List<Sale> findTop8ByStatusOrderBySoldAtDesc(Sale.Status status);
}
