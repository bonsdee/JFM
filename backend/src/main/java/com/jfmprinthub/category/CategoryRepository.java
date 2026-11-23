package com.jfmprinthub.category;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CategoryRepository extends JpaRepository<Category, UUID> {

    Optional<Category> findByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, UUID id);

    boolean existsByNameIgnoreCase(String name);

    List<Category> findAllByOrderByNameAsc();

    @Query("select count(p) from Product p where p.category.id = :id")
    long countProducts(UUID id);

    @Query("select count(s) from CatalogService s where s.category.id = :id")
    long countServices(UUID id);
}
