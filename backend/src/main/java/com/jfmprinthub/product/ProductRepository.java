package com.jfmprinthub.product;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProductRepository extends JpaRepository<Product, UUID> {

    /** Row lock ({@code SELECT ... FOR UPDATE}) used by every stock posting. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Product p where p.id = :id")
    Optional<Product> findByIdForUpdate(UUID id);

    Optional<Product> findBySkuIgnoreCase(String sku);

    Optional<Product> findByBarcode(String barcode);

    boolean existsBySkuIgnoreCase(String sku);

    @EntityGraph(attributePaths = {"category", "supplier"})
    @Query("""
           select p from Product p
           where p.archived = :archived
             and (:q is null
                  or lower(p.name) like lower(concat('%', cast(:q as string), '%'))
                  or lower(p.sku) like lower(concat('%', cast(:q as string), '%'))
                  or p.barcode = cast(:q as string))
             and (:categoryId is null or p.category.id = :categoryId)
             and (:supplierId is null or p.supplier.id = :supplierId)
             and (:material is null or p.material = :material)
             and (:status is null
                  or (cast(:status as string) = 'OUT' and p.stockOnHand <= 0)
                  or (cast(:status as string) = 'LOW' and p.stockOnHand > 0 and p.stockOnHand <= p.reorderLevel)
                  or (cast(:status as string) = 'IN_STOCK' and p.stockOnHand > p.reorderLevel))
           """)
    Page<Product> search(String q, UUID categoryId, UUID supplierId, Boolean material, String status,
                         boolean archived, Pageable pageable);

    @EntityGraph(attributePaths = {"category", "supplier"})
    @Query("select p from Product p where p.archived = false and p.stockOnHand <= p.reorderLevel order by p.stockOnHand asc, p.name asc")
    List<Product> findLowStock();

    @Query("select count(p) from Product p where p.archived = false and p.stockOnHand <= p.reorderLevel")
    long countLowStock();

    @Query("select coalesce(sum(p.stockOnHand * p.costPrice), 0) from Product p where p.archived = false and p.stockOnHand > 0")
    BigDecimal inventoryValue();

    @EntityGraph(attributePaths = {"category", "supplier"})
    List<Product> findAllByArchivedFalseOrderByNameAsc();
}
