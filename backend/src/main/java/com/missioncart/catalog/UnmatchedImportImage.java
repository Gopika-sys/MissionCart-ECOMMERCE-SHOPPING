package com.missioncart.catalog;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "unmatched_import_images")
public class UnmatchedImportImage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "import_job_id")
    private Long importJobId;

    @Column(name = "country_code", nullable = false, length = 8)
    private String countryCode = "IN";

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Column(name = "extracted_sku_hint", length = 150)
    private String extractedSkuHint;

    @Column(name = "image_data_url", nullable = false, columnDefinition = "TEXT")
    private String imageDataUrl;

    @Column(nullable = false, length = 30)
    private String status = "PENDING_REVIEW";

    @Column(name = "assigned_product_id")
    private Long assignedProductId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public Long getId() { return id; }
    public Long getImportJobId() { return importJobId; }
    public void setImportJobId(Long importJobId) { this.importJobId = importJobId; }
    public String getCountryCode() { return countryCode; }
    public void setCountryCode(String countryCode) { this.countryCode = countryCode; }
    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }
    public String getExtractedSkuHint() { return extractedSkuHint; }
    public void setExtractedSkuHint(String extractedSkuHint) { this.extractedSkuHint = extractedSkuHint; }
    public String getImageDataUrl() { return imageDataUrl; }
    public void setImageDataUrl(String imageDataUrl) { this.imageDataUrl = imageDataUrl; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Long getAssignedProductId() { return assignedProductId; }
    public void setAssignedProductId(Long assignedProductId) { this.assignedProductId = assignedProductId; }
    public Instant getCreatedAt() { return createdAt; }
}
