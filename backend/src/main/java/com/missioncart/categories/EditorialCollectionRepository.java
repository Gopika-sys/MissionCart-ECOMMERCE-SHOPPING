package com.missioncart.categories;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface EditorialCollectionRepository extends JpaRepository<EditorialCollection, Long> {
    List<EditorialCollection> findByCategorySlugIgnoreCaseAndActiveTrueOrderByDisplayOrderAscIdAsc(String categorySlug);
    Optional<EditorialCollection> findBySlugIgnoreCase(String slug);
    List<EditorialCollection> findAllByOrderByCategorySlugAscDisplayOrderAscIdAsc();
}
