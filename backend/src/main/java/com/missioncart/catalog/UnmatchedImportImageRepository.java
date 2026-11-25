package com.missioncart.catalog;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface UnmatchedImportImageRepository extends JpaRepository<UnmatchedImportImage, Long> {
    List<UnmatchedImportImage> findByStatusOrderByCreatedAtDesc(String status);
    List<UnmatchedImportImage> findAllByOrderByCreatedAtDesc();
}
