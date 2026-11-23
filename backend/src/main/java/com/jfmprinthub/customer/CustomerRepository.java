package com.jfmprinthub.customer;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.UUID;

public interface CustomerRepository extends JpaRepository<Customer, UUID> {

    @Query("""
           select c from Customer c
           where c.archived = :archived
             and (:q is null
                  or lower(c.name) like lower(concat('%', cast(:q as string), '%'))
                  or lower(coalesce(c.phone, '')) like lower(concat('%', cast(:q as string), '%'))
                  or lower(coalesce(c.facebookName, '')) like lower(concat('%', cast(:q as string), '%')))
           """)
    Page<Customer> search(String q, boolean archived, Pageable pageable);
}
