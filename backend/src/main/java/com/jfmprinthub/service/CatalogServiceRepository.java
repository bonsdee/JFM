package com.jfmprinthub.service;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CatalogServiceRepository extends JpaRepository<CatalogService, UUID> {

    Optional<CatalogService> findBySlug(String slug);

    boolean existsBySlug(String slug);

    @Query("select s from CatalogService s left join fetch s.category where s.archived = :archived order by s.sortOrder, s.name")
    List<CatalogService> findAllForList(boolean archived);

    @Query("select s from CatalogService s where s.archived = false and s.active = true and s.showOnWebsite = true order by s.sortOrder, s.name")
    List<CatalogService> findPublic();

    @Query("select s from CatalogService s where s.archived = false and s.active = true order by s.sortOrder, s.name")
    List<CatalogService> findActive();
}
