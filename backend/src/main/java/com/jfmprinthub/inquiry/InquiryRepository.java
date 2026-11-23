package com.jfmprinthub.inquiry;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.UUID;

public interface InquiryRepository extends JpaRepository<Inquiry, UUID> {

    @Query("""
           select i from Inquiry i
           where i.status in :statuses
             and (:q is null
                  or lower(i.name) like lower(concat('%', cast(:q as string), '%'))
                  or lower(coalesce(i.message, '')) like lower(concat('%', cast(:q as string), '%'))
                  or lower(coalesce(i.email, '')) like lower(concat('%', cast(:q as string), '%')))
           """)
    Page<Inquiry> search(Collection<Inquiry.Status> statuses, String q, Pageable pageable);

    long countByStatus(Inquiry.Status status);
}
