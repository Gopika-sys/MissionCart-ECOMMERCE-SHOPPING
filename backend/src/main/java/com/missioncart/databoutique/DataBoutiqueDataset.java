package com.missioncart.databoutique;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "data_boutique_datasets")
public class DataBoutiqueDataset {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "contract_id", unique = true, length = 120)
    private String contractId;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(name = "brand_name", length = 120)
    private String brandName;

    @Column(length = 120)
    private String geography;

    @Column(name = "geography_code", length = 16)
    private String geographyCode;

    @Column(name = "schema_name", length = 120)
    private String schemaName;

    @Column(name = "source_website", length = 300)
    private String sourceWebsite;

    @Column(name = "refresh_policy", length = 120)
    private String refreshPolicy;

    @Column(name = "dataset_price", length = 64)
    private String datasetPrice;

    @Column(name = "sample_file_url", length = 500)
    private String sampleFileUrl;

    @Column(name = "last_delivered_date", length = 64)
    private String lastDeliveredDate;

    @Column(name = "dataset_url", length = 500)
    private String datasetUrl;

    @Column(name = "ingest_status", nullable = false, length = 40)
    private String ingestStatus = "DATASET_PENDING";

    @Column(name = "imported_record_count", nullable = false)
    private int importedRecordCount = 0;

    @Column(name = "synced_at", nullable = false)
    private Instant syncedAt = Instant.now();

    public Long getId() { return id; }
    public String getContractId() { return contractId; }
    public void setContractId(String contractId) { this.contractId = contractId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getBrandName() { return brandName; }
    public void setBrandName(String brandName) { this.brandName = brandName; }
    public String getGeography() { return geography; }
    public void setGeography(String geography) { this.geography = geography; }
    public String getGeographyCode() { return geographyCode; }
    public void setGeographyCode(String geographyCode) { this.geographyCode = geographyCode; }
    public String getSchemaName() { return schemaName; }
    public void setSchemaName(String schemaName) { this.schemaName = schemaName; }
    public String getSourceWebsite() { return sourceWebsite; }
    public void setSourceWebsite(String sourceWebsite) { this.sourceWebsite = sourceWebsite; }
    public String getRefreshPolicy() { return refreshPolicy; }
    public void setRefreshPolicy(String refreshPolicy) { this.refreshPolicy = refreshPolicy; }
    public String getDatasetPrice() { return datasetPrice; }
    public void setDatasetPrice(String datasetPrice) { this.datasetPrice = datasetPrice; }
    public String getSampleFileUrl() { return sampleFileUrl; }
    public void setSampleFileUrl(String sampleFileUrl) { this.sampleFileUrl = sampleFileUrl; }
    public String getLastDeliveredDate() { return lastDeliveredDate; }
    public void setLastDeliveredDate(String lastDeliveredDate) { this.lastDeliveredDate = lastDeliveredDate; }
    public String getDatasetUrl() { return datasetUrl; }
    public void setDatasetUrl(String datasetUrl) { this.datasetUrl = datasetUrl; }
    public String getIngestStatus() { return ingestStatus; }
    public void setIngestStatus(String ingestStatus) { this.ingestStatus = ingestStatus; }
    public int getImportedRecordCount() { return importedRecordCount; }
    public void setImportedRecordCount(int importedRecordCount) { this.importedRecordCount = importedRecordCount; }
    public Instant getSyncedAt() { return syncedAt; }
    public void setSyncedAt(Instant syncedAt) { this.syncedAt = syncedAt; }
}
