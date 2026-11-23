package com.jfmprinthub.supplier;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.UUID;

public interface SupplierRepository extends JpaRepository<Supplier, UUID> {

    @Query("""
           select s from Supplier s
           where s.archived = :archived
             and (:q is null or lower(s.name) like lower(concat('%', cast(:q as string), '%'))
                  or lower(coalesce(s.contactPerson, '')) like lower(concat('%', cast(:q as string), '%')))
           """)
    Page<Supplier> search(String q, boolean archived, Pageable pageable);
}
