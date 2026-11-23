package com.jfmprinthub.joborder;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface JobOrderRepository extends JpaRepository<JobOrder, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select j from JobOrder j where j.id = :id")
    Optional<JobOrder> findByIdForUpdate(UUID id);

    @EntityGraph(attributePaths = "customer")
    @Query("""
           select j from JobOrder j left join j.customer c
           where j.status in :statuses
             and (:customerId is null or c.id = :customerId)
             and j.createdAt >= :from
             and j.createdAt < :to
             and (:overdue = false or (j.dueAt < :now and j.status not in ('CLAIMED', 'CANCELLED')))
             and (:q is null
                  or lower(j.jobNumber) like lower(concat('%', cast(:q as string), '%'))
                  or lower(coalesce(c.name, j.customerName, '')) like lower(concat('%', cast(:q as string), '%'))
                  or lower(coalesce(j.customerPhone, '')) like lower(concat('%', cast(:q as string), '%')))
           """)
    Page<JobOrder> search(Collection<JobStatus> statuses, UUID customerId, Instant from, Instant to, boolean overdue,
                          Instant now, String q, Pageable pageable);

    /** Open jobs plus recently closed ones for the Kanban board. */
    @EntityGraph(attributePaths = "customer")
    @Query("""
           select j from JobOrder j
           where j.status not in ('CLAIMED', 'CANCELLED') or j.updatedAt >= :closedSince
           order by j.boardPosition asc, j.dueAt asc nulls last
           """)
    List<JobOrder> findBoard(Instant closedSince);

    @Query("select count(j) from JobOrder j where j.status not in ('CLAIMED', 'CANCELLED')")
    long countOpen();

    @EntityGraph(attributePaths = "customer")
    @Query("""
           select j from JobOrder j where j.status not in ('CLAIMED', 'CANCELLED') and j.dueAt is not null
           order by j.dueAt asc
           """)
    List<JobOrder> findUpcoming(Pageable pageable);

    @Query("select j from JobOrder j where j.status not in ('CLAIMED', 'CANCELLED') and j.dueAt < :before")
    List<JobOrder> findOpenDueBefore(Instant before);
}
