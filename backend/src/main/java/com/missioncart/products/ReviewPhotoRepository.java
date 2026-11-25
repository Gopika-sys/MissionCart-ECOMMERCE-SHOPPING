package com.missioncart.products;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ReviewPhotoRepository extends JpaRepository<ReviewPhoto, Long> {
    List<ReviewPhoto> findByProductIdAndModerationStatusOrderByCreatedAtDesc(Long productId, String moderationStatus);
    List<ReviewPhoto> findAllByOrderByCreatedAtDesc();
}
