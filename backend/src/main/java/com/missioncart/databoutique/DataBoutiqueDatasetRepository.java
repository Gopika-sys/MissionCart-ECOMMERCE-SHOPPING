package com.missioncart.databoutique;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface DataBoutiqueDatasetRepository extends JpaRepository<DataBoutiqueDataset, Long> {
    Optional<DataBoutiqueDataset> findByContractId(String contractId);
    List<DataBoutiqueDataset> findAllByOrderBySyncedAtDescTitleAsc();
}
