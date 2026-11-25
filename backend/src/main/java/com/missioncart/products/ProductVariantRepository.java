package com.missioncart.products;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProductVariantRepository extends JpaRepository<ProductVariant, Long> {
    List<ProductVariant> findByProductIdOrderByDefaultVariantDescIdAsc(Long productId);
    Optional<ProductVariant> findByVariantSkuIgnoreCase(String variantSku);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT v FROM ProductVariant v WHERE v.id = :id")
    Optional<ProductVariant> findByIdForUpdate(@Param("id") Long id);

    @Query("SELECT DISTINCT v.size FROM ProductVariant v WHERE v.size IS NOT NULL AND v.stockQuantity > 0 ORDER BY v.size")
    List<String> findDistinctAvailableSizes();
}
