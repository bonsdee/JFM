package com.jfmprinthub.expense;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public interface ExpenseRepository extends JpaRepository<Expense, UUID> {

    @EntityGraph(attributePaths = "category")
    @Query("""
           select e from Expense e
           where (:categoryId is null or e.category.id = :categoryId)
             and (:from is null or e.expenseDate >= :from)
             and (:to is null or e.expenseDate <= :to)
             and (:q is null or lower(e.description) like lower(concat('%', cast(:q as string), '%')))
           """)
    Page<Expense> search(UUID categoryId, LocalDate from, LocalDate to, String q, Pageable pageable);

    @Query("""
           select coalesce(sum(e.amount), 0) from Expense e
           where (:categoryId is null or e.category.id = :categoryId)
             and (:from is null or e.expenseDate >= :from)
             and (:to is null or e.expenseDate <= :to)
             and (:q is null or lower(e.description) like lower(concat('%', cast(:q as string), '%')))
           """)
    BigDecimal sum(UUID categoryId, LocalDate from, LocalDate to, String q);

    long countByCategoryId(UUID categoryId);
}
