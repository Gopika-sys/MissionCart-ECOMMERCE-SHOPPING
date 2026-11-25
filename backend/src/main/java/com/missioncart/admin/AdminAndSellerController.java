package com.missioncart.admin;

import com.missioncart.catalog.CatalogImportJob;
import com.missioncart.catalog.CatalogImportJobRepository;
import com.missioncart.catalog.CatalogImportService;
import com.missioncart.catalog.CatalogImportService.ImportRecordInput;
import com.missioncart.catalog.CatalogImportService.ImportResult;
import com.missioncart.catalog.UnmatchedImportImage;
import com.missioncart.catalog.UnmatchedImportImageRepository;
import com.missioncart.catalog.ZipCatalogImportService;
import com.missioncart.categories.*;
import com.missioncart.databoutique.DataBoutiqueService;
import org.springframework.web.multipart.MultipartFile;
import com.missioncart.common.ApiResponse;
import com.missioncart.compatibility.CompatibilityRule;
import com.missioncart.compatibility.CompatibilityRuleRepository;
import com.missioncart.lifecycle.LifecycleRequest;
import com.missioncart.lifecycle.LifecycleRequestRepository;
import com.missioncart.missions.Mission;
import com.missioncart.missions.MissionRepository;
import com.missioncart.orders.Order;
import com.missioncart.orders.OrderItem;
import com.missioncart.orders.OrderItemRepository;
import com.missioncart.orders.OrderRepository;
import com.missioncart.products.*;
import com.missioncart.retailers.RetailerSource;
import com.missioncart.retailers.RetailerSourceRepository;
import com.missioncart.security.AuthenticatedUser;
import com.missioncart.shared.ActivityLog;
import com.missioncart.shared.ActivityLogRepository;
import com.missioncart.users.User;
import com.missioncart.users.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api")
public class AdminAndSellerController {

    private final ProductRepository productRepo;
    private final CategoryRepository categoryRepo;
    private final RetailerSourceRepository retailerRepo;
    private final UserRepository userRepo;
    private final OrderRepository orderRepo;
    private final OrderItemRepository orderItemRepo;
    private final MissionRepository missionRepo;
    private final LifecycleRequestRepository lifecycleRepo;
    private final CompatibilityRuleRepository ruleRepo;
    private final CatalogImportService importService;
    private final ZipCatalogImportService zipImportService;
    private final UnmatchedImportImageRepository unmatchedImageRepo;
    private final DataBoutiqueService dataBoutiqueService;
    private final EditorialCollectionRepository editorialCollectionRepo;
    private final CatalogImportJobRepository importJobRepo;
    private final InventoryHistoryRepository invHistoryRepo;
    private final ProductVariantRepository variantRepo;
    private final ProductImageRepository imageRepo;
    private final ReviewRepository reviewRepo;
    private final ReviewPhotoRepository reviewPhotoRepo;
    private final SystemSettingRepository settingRepo;
    private final ActivityLogRepository logRepo;

    public AdminAndSellerController(
        ProductRepository productRepo,
        CategoryRepository categoryRepo,
        RetailerSourceRepository retailerRepo,
        UserRepository userRepo,
        OrderRepository orderRepo,
        OrderItemRepository orderItemRepo,
        MissionRepository missionRepo,
        LifecycleRequestRepository lifecycleRepo,
        CompatibilityRuleRepository ruleRepo,
        CatalogImportService importService,
        ZipCatalogImportService zipImportService,
        UnmatchedImportImageRepository unmatchedImageRepo,
        DataBoutiqueService dataBoutiqueService,
        EditorialCollectionRepository editorialCollectionRepo,
        CatalogImportJobRepository importJobRepo,
        InventoryHistoryRepository invHistoryRepo,
        ProductVariantRepository variantRepo,
        ProductImageRepository imageRepo,
        ReviewRepository reviewRepo,
        ReviewPhotoRepository reviewPhotoRepo,
        SystemSettingRepository settingRepo,
        ActivityLogRepository logRepo
    ) {
        this.productRepo = productRepo;
        this.categoryRepo = categoryRepo;
        this.retailerRepo = retailerRepo;
        this.userRepo = userRepo;
        this.orderRepo = orderRepo;
        this.orderItemRepo = orderItemRepo;
        this.missionRepo = missionRepo;
        this.lifecycleRepo = lifecycleRepo;
        this.ruleRepo = ruleRepo;
        this.importService = importService;
        this.zipImportService = zipImportService;
        this.unmatchedImageRepo = unmatchedImageRepo;
        this.dataBoutiqueService = dataBoutiqueService;
        this.editorialCollectionRepo = editorialCollectionRepo;
        this.importJobRepo = importJobRepo;
        this.invHistoryRepo = invHistoryRepo;
        this.variantRepo = variantRepo;
        this.imageRepo = imageRepo;
        this.reviewRepo = reviewRepo;
        this.reviewPhotoRepo = reviewPhotoRepo;
        this.settingRepo = settingRepo;
        this.logRepo = logRepo;
    }

    public record OverviewStats(
        long totalProducts,
        long totalUsers,
        long totalOrders,
        BigDecimal totalRevenue,
        long activeMissions,
        long pendingLifecycleRequests,
        long lowStockProducts,
        long importJobsCount,
        long verifiedImagesCount,
        long requiresImageCount
    ) {}

    public record AdminProductRequest(
        String sku,
        String name,
        Long categoryId,
        String sourcePlatform,
        String sourceUrl,
        String productType,
        String description,
        BigDecimal price,
        BigDecimal originalPrice,
        Integer stockQuantity,
        String missionTags,
        String priorityTier,
        String imageUrl,
        String imageSource,
        String imageLicense,
        String imageAttribution,
        String imageStatus,
        Boolean published,
        Boolean approved,
        String gender,
        String garmentType,
        String occasion,
        String material,
        String fit,
        String pattern
    ) {}

    public record VariantRequest(
        String variantSku,
        String size,
        String color,
        String colorHex,
        String variantName,
        BigDecimal price,
        BigDecimal originalPrice,
        Integer stockQuantity,
        String imageUrl,
        Boolean defaultVariant
    ) {}

    public record ProductImageRequest(
        String imageUrl,
        String imageSource,
        String imageAttribution,
        String imageLicense,
        String imageType,
        String imageAltText,
        Boolean primaryImage
    ) {}

    public record ImportPayloadRequest(
        String sourcePlatform,
        String format,
        String fileName,
        String content,
        boolean previewOnly,
        boolean updateExisting
    ) {}

    @GetMapping("/admin/overview")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<OverviewStats> overview() {
        List<Product> allProds = productRepo.findAll();
        BigDecimal rev = orderRepo.findAll().stream()
            .filter(o -> !"PAYMENT_FAILED".equalsIgnoreCase(o.getStatus()))
            .map(Order::getTotalAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        long verifiedImg = allProds.stream().filter(p -> "VERIFIED".equalsIgnoreCase(p.getImageStatus())).count();
        long reqImg = allProds.stream().filter(p -> "REQUIRES_IMAGE".equalsIgnoreCase(p.getImageStatus())).count();

        return ApiResponse.ok(new OverviewStats(
            allProds.size(),
            userRepo.count(),
            orderRepo.count(),
            rev,
            missionRepo.count(),
            lifecycleRepo.count(),
            productRepo.countByStockQuantityLessThanEqual(5),
            importJobRepo.count(),
            verifiedImg,
            reqImg
        ));
    }

    @GetMapping("/admin/products")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<Product>> adminProducts(
        @RequestParam(required = false, defaultValue = "100") int size,
        @RequestParam(required = false) String imageStatus
    ) {
        int safeSize = Math.min(Math.max(1, size), 250);
        if (imageStatus != null && !imageStatus.isBlank()) {
            return ApiResponse.ok(productRepo.findAll(
                (root, q, cb) -> cb.equal(root.get("imageStatus"), imageStatus.trim().toUpperCase()),
                org.springframework.data.domain.PageRequest.of(0, safeSize)
            ).getContent());
        }
        return ApiResponse.ok(productRepo.findAll(org.springframework.data.domain.PageRequest.of(0, safeSize)).getContent());
    }

    @PostMapping("/admin/products")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Product> createProduct(@AuthenticationPrincipal AuthenticatedUser admin, @RequestBody AdminProductRequest req) {
        if (productRepo.findBySkuIgnoreCase(req.sku()).isPresent()) {
            throw new IllegalStateException("Product with SKU already exists: " + req.sku());
        }
        Product p = new Product();
        applyProductFields(p, req);
        p.setSlug(req.name().toLowerCase().replaceAll("[^a-z0-9]+", "-") + "-" + req.sku().toLowerCase().replaceAll("[^a-z0-9]", ""));
        Product saved = productRepo.save(p);
        audit(admin, "PRODUCT", String.valueOf(saved.getId()), "CREATED", saved.getSku());
        return ApiResponse.ok("Product created", saved);
    }

    @PutMapping("/admin/products/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Product> updateProduct(@AuthenticationPrincipal AuthenticatedUser admin, @PathVariable Long id, @RequestBody AdminProductRequest req) {
        Product p = productRepo.findById(id).orElseThrow(() -> new EntityNotFoundException("Product not found"));
        applyProductFields(p, req);
        Product saved = productRepo.save(p);
        audit(admin, "PRODUCT", String.valueOf(id), "UPDATED", saved.getSku());
        return ApiResponse.ok("Product updated", saved);
    }

    @DeleteMapping("/admin/products/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Void> deleteProduct(@AuthenticationPrincipal AuthenticatedUser admin, @PathVariable Long id) {
        productRepo.deleteById(id);
        audit(admin, "PRODUCT", String.valueOf(id), "DELETED", "Removed product");
        return ApiResponse.ok("Product deleted", null);
    }

    @PatchMapping("/admin/products/{id}/image")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Product> verifyProductImage(@AuthenticationPrincipal AuthenticatedUser admin, @PathVariable Long id, @RequestBody Map<String, String> body) {
        Product p = productRepo.findById(id).orElseThrow(() -> new EntityNotFoundException("Product not found"));
        if (body.containsKey("imageUrl")) p.setImageUrl(body.get("imageUrl"));
        if (body.containsKey("imageSource")) p.setImageSource(body.get("imageSource"));
        if (body.containsKey("imageLicense")) p.setImageLicense(body.get("imageLicense"));
        if (body.containsKey("imageAttribution")) p.setImageAttribution(body.get("imageAttribution"));
        if (body.containsKey("imageStatus")) p.setImageStatus(body.get("imageStatus"));
        Product saved = productRepo.save(p);
        audit(admin, "PRODUCT_IMAGE", String.valueOf(id), "IMAGE_STATUS_" + saved.getImageStatus(), saved.getImageUrl());
        return ApiResponse.ok("Product image updated", saved);
    }

    @PatchMapping("/admin/products/{id}/stock")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Product> adjustStock(@AuthenticationPrincipal AuthenticatedUser admin, @PathVariable Long id, @RequestBody Map<String, Object> body) {
        Product p = productRepo.findById(id).orElseThrow(() -> new EntityNotFoundException("Product not found"));
        int newQty = Integer.parseInt(String.valueOf(body.get("stockQuantity")));
        int delta = newQty - p.getStockQuantity();
        p.setStockQuantity(Math.max(0, newQty));
        p.setAvailabilityStatus(p.getStockQuantity() > 0 ? "IN_STOCK" : "OUT_OF_STOCK");
        productRepo.save(p);

        InventoryHistory ih = new InventoryHistory();
        ih.setProductId(p.getId());
        ih.setDelta(delta);
        ih.setReason(String.valueOf(body.getOrDefault("reason", "Admin stock adjustment")));
        ih.setActorEmail(admin.email());
        invHistoryRepo.save(ih);
        return ApiResponse.ok("Stock updated", p);
    }

    @PostMapping("/admin/categories")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Category> createCategory(@RequestBody Category c) {
        if (c.getSlug() == null || c.getSlug().isBlank()) {
            c.setSlug(c.getName().toLowerCase().replaceAll("[^a-z0-9]+", "-"));
        }
        return ApiResponse.ok("Category saved", categoryRepo.save(c));
    }

    @DeleteMapping("/admin/categories/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Void> deleteCategory(@AuthenticationPrincipal AuthenticatedUser admin, @PathVariable Long id) {
        Category cat = categoryRepo.findById(id).orElseThrow(() -> new EntityNotFoundException("Category not found"));
        long count = productRepo.count((root, q, cb) -> cb.equal(root.get("categoryId"), id));
        if (count > 0) {
            throw new IllegalStateException("Cannot delete category with " + count + " assigned products.");
        }
        categoryRepo.delete(cat);
        audit(admin, "CATEGORY", String.valueOf(id), "DELETED", "Removed category " + cat.getName());
        return ApiResponse.ok("Category deleted", null);
    }

    @PatchMapping("/admin/sources/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<RetailerSource> updateSource(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        RetailerSource s = retailerRepo.findById(id).orElseThrow(() -> new EntityNotFoundException("Source not found"));
        if (body.containsKey("connectionStatus")) s.setConnectionStatus(String.valueOf(body.get("connectionStatus")));
        if (body.containsKey("feedConfigJson")) s.setFeedConfigJson(String.valueOf(body.get("feedConfigJson")));
        return ApiResponse.ok("Retailer source updated", retailerRepo.save(s));
    }

    @PostMapping("/admin/catalog/import")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<ImportResult> runImport(@AuthenticationPrincipal AuthenticatedUser admin, @RequestBody ImportPayloadRequest req) {
        String fmt = req.format() == null ? "JSON" : req.format().toUpperCase();
        List<ImportRecordInput> recs = "CSV".equals(fmt)
            ? importService.parseCsvRecords(req.content(), req.sourcePlatform())
            : importService.parseJsonRecords(req.content(), req.sourcePlatform());
        ImportResult result = importService.executeImport(
            recs, req.sourcePlatform(), fmt, req.fileName(), req.previewOnly(), req.updateExisting(), admin.email()
        );
        return ApiResponse.ok(req.previewOnly() ? "Preview validated" : "Catalog import completed", result);
    }

    @GetMapping("/admin/catalog/jobs")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<CatalogImportJob>> importJobs() {
        return ApiResponse.ok(importJobRepo.findAllByOrderByCreatedAtDesc());
    }

    @PostMapping("/admin/catalog/import-file")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<ZipCatalogImportService.ZipImportPreviewResult> importFile(
        @AuthenticationPrincipal AuthenticatedUser admin,
        @RequestParam("file") MultipartFile file,
        @RequestParam(required = false) String sourcePlatform,
        @RequestParam(required = false) String countryCode,
        @RequestParam(defaultValue = "true") boolean previewOnly,
        @RequestParam(defaultValue = "false") boolean updateExisting,
        @RequestParam(defaultValue = "false") boolean autoApproveImages
    ) throws java.io.IOException {
        var res = zipImportService.processUpload(
            file, sourcePlatform, countryCode, previewOnly, updateExisting, autoApproveImages, admin.email()
        );
        if (!previewOnly) {
            audit(admin, "ZIP_IMPORT", String.valueOf(res.jobId()), "IMPORT_COMMITTED",
                file.getOriginalFilename() + " (" + res.detectedCountry() + ") +" + res.insertedCount() + " records");
        }
        return ApiResponse.ok(previewOnly ? "ZIP preview generated" : "Country catalog archive imported", res);
    }

    @GetMapping("/admin/catalog/unmatched-images")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<UnmatchedImportImage>> unmatchedImages() {
        return ApiResponse.ok(unmatchedImageRepo.findByStatusOrderByCreatedAtDesc("PENDING_REVIEW"));
    }

    @PostMapping("/admin/catalog/unmatched-images/{id}/assign")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<UnmatchedImportImage> assignUnmatchedImage(
        @AuthenticationPrincipal AuthenticatedUser admin,
        @PathVariable Long id,
        @RequestBody Map<String, Object> body
    ) {
        UnmatchedImportImage uii = unmatchedImageRepo.findById(id).orElseThrow(() -> new EntityNotFoundException("Unmatched image not found"));
        Long productId = Long.valueOf(String.valueOf(body.get("productId")));
        Product p = productRepo.findById(productId).orElseThrow(() -> new EntityNotFoundException("Product not found"));
        p.setImageUrl(uii.getImageDataUrl());
        p.setImageStatus("VERIFIED");
        p.setImageVerifiedAt(Instant.now());
        p.setImageSource("Admin Matched ZIP Media");
        productRepo.save(p);

        uii.setAssignedProductId(p.getId());
        uii.setStatus("ASSIGNED");
        audit(admin, "UNMATCHED_IMAGE", String.valueOf(id), "ASSIGNED_TO_" + p.getSku(), p.getName());
        return ApiResponse.ok("Image matched and verified on product", unmatchedImageRepo.save(uii));
    }

    @DeleteMapping("/admin/catalog/unmatched-images/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Void> discardUnmatchedImage(@PathVariable Long id) {
        UnmatchedImportImage uii = unmatchedImageRepo.findById(id).orElseThrow(() -> new EntityNotFoundException("Unmatched image not found"));
        uii.setStatus("DISCARDED");
        unmatchedImageRepo.save(uii);
        return ApiResponse.ok("Unmatched image discarded", null);
    }

    @GetMapping("/sources/luxury-status")
    public ApiResponse<DataBoutiqueService.DataBoutiqueStatusDto> publicLuxuryStatus(@RequestParam(required = false) String country) {
        return ApiResponse.ok(dataBoutiqueService.getStatus(country));
    }

    @GetMapping("/admin/databoutique/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<DataBoutiqueService.DataBoutiqueStatusDto> adminDataBoutiqueStatus(@RequestParam(required = false) String country) {
        return ApiResponse.ok(dataBoutiqueService.getStatus(country));
    }

    @PostMapping("/admin/databoutique/sync")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<DataBoutiqueService.DataBoutiqueStatusDto> syncDataBoutique(@AuthenticationPrincipal AuthenticatedUser admin) {
        var res = dataBoutiqueService.syncCatalogFromApi();
        audit(admin, "DATABOUTIQUE", "CATALOG_SYNC", res.tokenConfigured() ? "SYNCED" : "TOKEN_MISSING", res.message());
        return ApiResponse.ok(res.message(), res);
    }

    @GetMapping("/admin/collections")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<EditorialCollection>> adminCollections() {
        return ApiResponse.ok(editorialCollectionRepo.findAllByOrderByCategorySlugAscDisplayOrderAscIdAsc());
    }

    @PostMapping("/admin/collections")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<EditorialCollection> saveCollection(@AuthenticationPrincipal AuthenticatedUser admin, @RequestBody EditorialCollection col) {
        if (col.getSlug() == null || col.getSlug().isBlank()) {
            col.setSlug(col.getTitle().toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", ""));
        }
        EditorialCollection saved = editorialCollectionRepo.save(col);
        audit(admin, "EDITORIAL_COLLECTION", String.valueOf(saved.getId()), "SAVED", saved.getCategorySlug() + "/" + saved.getSlug());
        return ApiResponse.ok("Editorial collection saved", saved);
    }

    @DeleteMapping("/admin/collections/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Void> deleteCollection(@PathVariable Long id) {
        editorialCollectionRepo.deleteById(id);
        return ApiResponse.ok("Editorial collection deleted", null);
    }

    @GetMapping("/admin/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<Map<String, Object>>> listUsers() {
        return ApiResponse.ok(userRepo.findAll().stream().map(u -> Map.<String, Object>of(
            "id", u.getId(), "email", u.getEmail(), "fullName", u.getFullName(),
            "role", u.getRole(), "enabled", u.isEnabled(), "createdAt", u.getCreatedAt()
        )).toList());
    }

    @PatchMapping("/admin/users/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Void> updateUser(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        User u = userRepo.findById(id).orElseThrow();
        if (body.containsKey("role")) u.setRole(String.valueOf(body.get("role")));
        if (body.containsKey("enabled")) u.setEnabled(Boolean.parseBoolean(String.valueOf(body.get("enabled"))));
        userRepo.save(u);
        return ApiResponse.ok("User updated", null);
    }

    @GetMapping("/admin/orders")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<Order>> allOrders() {
        return ApiResponse.ok(orderRepo.findAll());
    }

    @PatchMapping("/admin/orders/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Order> updateOrderStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Order o = orderRepo.findById(id).orElseThrow();
        if (body.containsKey("status")) o.setStatus(body.get("status"));
        if (body.containsKey("trackingStatus")) o.setTrackingStatus(body.get("trackingStatus"));
        return ApiResponse.ok("Order updated", orderRepo.save(o));
    }

    @GetMapping("/admin/lifecycle")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<LifecycleRequest>> allLifecycle() {
        return ApiResponse.ok(lifecycleRepo.findAllByOrderByCreatedAtDesc());
    }

    @PatchMapping("/admin/lifecycle/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<LifecycleRequest> updateLifecycle(@PathVariable Long id, @RequestBody Map<String, String> body) {
        LifecycleRequest lr = lifecycleRepo.findById(id).orElseThrow();
        if (body.containsKey("status")) lr.setStatus(body.get("status"));
        return ApiResponse.ok("Lifecycle status updated", lifecycleRepo.save(lr));
    }

    @PostMapping("/admin/compatibility/rules")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<CompatibilityRule> saveRule(@RequestBody CompatibilityRule rule) {
        return ApiResponse.ok("Compatibility rule saved", ruleRepo.save(rule));
    }

    @GetMapping("/admin/analytics")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Map<String, Object>> analytics() {
        List<Mission> missions = missionRepo.findAll();
        Map<String, Long> byPurpose = new LinkedHashMap<>();
        Map<String, Long> byProvider = new LinkedHashMap<>();
        for (Mission m : missions) {
            byPurpose.merge(m.getPurpose() != null ? m.getPurpose() : "Other", 1L, Long::sum);
            byProvider.merge(m.getAiProviderUsed(), 1L, Long::sum);
        }
        return ApiResponse.ok(Map.of(
            "totalMissions", missions.size(),
            "missionsByPurpose", byPurpose,
            "missionsByAiProvider", byProvider,
            "recentAuditLogs", logRepo.findTop50ByOrderByCreatedAtDesc()
        ));
    }

    @GetMapping("/admin/reviews")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<Review>> adminReviews() {
        return ApiResponse.ok(reviewRepo.findAll());
    }

    @GetMapping("/admin/review-photos")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<ReviewPhoto>> adminReviewPhotos() {
        return ApiResponse.ok(reviewPhotoRepo.findAllByOrderByCreatedAtDesc());
    }

    @PatchMapping("/admin/review-photos/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<ReviewPhoto> moderateReviewPhoto(@AuthenticationPrincipal AuthenticatedUser admin, @PathVariable Long id, @RequestBody Map<String, String> body) {
        ReviewPhoto photo = reviewPhotoRepo.findById(id).orElseThrow(() -> new EntityNotFoundException("Review photo not found"));
        String status = body.getOrDefault("moderationStatus", "APPROVED").toUpperCase();
        photo.setModerationStatus(status);
        audit(admin, "REVIEW_PHOTO", String.valueOf(id), "MODERATION_" + status, photo.getCaption());
        return ApiResponse.ok("Customer photo moderation updated", reviewPhotoRepo.save(photo));
    }

    @PostMapping("/admin/products/{id}/variants")
    @PreAuthorize("hasAnyRole('ADMIN', 'SELLER')")
    public ApiResponse<ProductVariant> addVariant(@AuthenticationPrincipal AuthenticatedUser actor, @PathVariable Long id, @RequestBody VariantRequest req) {
        Product p = productRepo.findById(id).orElseThrow(() -> new EntityNotFoundException("Product not found"));
        if ("SELLER".equalsIgnoreCase(actor.role()) && !actor.id().equals(p.getSellerId())) {
            throw new IllegalArgumentException("You can only manage variants on your own products.");
        }
        ProductVariant v = new ProductVariant();
        v.setProductId(p.getId());
        v.setVariantSku((req.variantSku() != null && !req.variantSku().isBlank()) ? req.variantSku().trim().toUpperCase() : (p.getSku() + "-" + UUID.randomUUID().toString().substring(0, 4).toUpperCase()));
        v.setSize(req.size());
        v.setColor(req.color());
        v.setColorHex(req.colorHex());
        v.setVariantName(req.variantName() != null ? req.variantName() : (p.getName() + (req.size() != null ? " " + req.size() : "")));
        v.setPrice(req.price() != null ? req.price() : p.getPrice());
        v.setOriginalPrice(req.originalPrice());
        int qty = Math.max(0, req.stockQuantity() != null ? req.stockQuantity() : p.getStockQuantity());
        v.setStockQuantity(qty);
        v.setAvailabilityStatus(qty > 0 ? "IN_STOCK" : "OUT_OF_STOCK");
        v.setImageUrl(req.imageUrl() != null ? req.imageUrl() : p.getImageUrl());
        v.setDefaultVariant(Boolean.TRUE.equals(req.defaultVariant()));
        return ApiResponse.ok("Variant saved", variantRepo.save(v));
    }

    @DeleteMapping("/admin/variants/{variantId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SELLER')")
    public ApiResponse<Void> deleteVariant(@PathVariable Long variantId) {
        variantRepo.deleteById(variantId);
        return ApiResponse.ok("Variant deleted", null);
    }

    @PostMapping("/admin/products/{id}/images")
    @PreAuthorize("hasAnyRole('ADMIN', 'SELLER')")
    public ApiResponse<ProductImage> addProductGalleryImage(@PathVariable Long id, @RequestBody ProductImageRequest req) {
        Product p = productRepo.findById(id).orElseThrow(() -> new EntityNotFoundException("Product not found"));
        ProductImage img = new ProductImage();
        img.setProductId(p.getId());
        img.setImageUrl(req.imageUrl());
        img.setImageSource(req.imageSource() != null ? req.imageSource() : "Admin Upload");
        img.setImageAttribution(req.imageAttribution());
        img.setImageLicense(req.imageLicense());
        img.setImageType(req.imageType() != null ? req.imageType() : "DETAIL_VIEW");
        img.setImageStatus("VERIFIED");
        img.setImageVerifiedAt(Instant.now());
        img.setImageAltText(req.imageAltText() != null ? req.imageAltText() : p.getName());
        img.setPrimaryImage(Boolean.TRUE.equals(req.primaryImage()));
        return ApiResponse.ok("Product gallery image added", imageRepo.save(img));
    }

    @GetMapping("/seller/orders")
    @PreAuthorize("hasAnyRole('SELLER', 'ADMIN')")
    public ApiResponse<List<Map<String, Object>>> sellerOrders(@AuthenticationPrincipal AuthenticatedUser seller) {
        Set<Long> sellerProdIds = productRepo.findBySellerId(seller.id()).stream().map(Product::getId).collect(java.util.stream.Collectors.toSet());
        List<Map<String, Object>> out = new ArrayList<>();
        if (sellerProdIds.isEmpty()) return ApiResponse.ok(out);
        for (Order o : orderRepo.findAll()) {
            List<OrderItem> matchedItems = orderItemRepo.findByOrderId(o.getId()).stream()
                .filter(oi -> sellerProdIds.contains(oi.getProductId())).toList();
            if (!matchedItems.isEmpty()) {
                BigDecimal sellerSub = matchedItems.stream().map(OrderItem::getLineTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
                out.add(Map.of(
                    "orderId", o.getId(),
                    "orderNumber", o.getOrderNumber(),
                    "status", o.getStatus(),
                    "trackingStatus", o.getTrackingStatus(),
                    "sellerSubtotal", sellerSub,
                    "items", matchedItems,
                    "createdAt", o.getCreatedAt()
                ));
            }
        }
        return ApiResponse.ok(out);
    }

    @GetMapping("/seller/earnings")
    @PreAuthorize("hasAnyRole('SELLER', 'ADMIN')")
    public ApiResponse<Map<String, Object>> sellerEarnings(@AuthenticationPrincipal AuthenticatedUser seller) {
        Set<Long> sellerProdIds = productRepo.findBySellerId(seller.id()).stream().map(Product::getId).collect(java.util.stream.Collectors.toSet());
        BigDecimal gross = BigDecimal.ZERO;
        int units = 0;
        int orderCount = 0;
        if (!sellerProdIds.isEmpty()) {
            for (Order o : orderRepo.findAll()) {
                if ("CANCELLED".equalsIgnoreCase(o.getStatus()) || "PAYMENT_FAILED".equalsIgnoreCase(o.getStatus())) continue;
                List<OrderItem> matched = orderItemRepo.findByOrderId(o.getId()).stream()
                    .filter(oi -> sellerProdIds.contains(oi.getProductId())).toList();
                if (!matched.isEmpty()) {
                    orderCount++;
                    for (OrderItem oi : matched) {
                        gross = gross.add(oi.getLineTotal());
                        units += oi.getQuantity();
                    }
                }
            }
        }
        return ApiResponse.ok(Map.of(
            "grossRevenueInr", gross,
            "unitsSold", units,
            "orderCount", orderCount,
            "settlementNote", "Calculated from verified non-cancelled orders containing your seller SKUs."
        ));
    }

    @GetMapping("/admin/settings")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<SystemSetting>> getSettings() {
        return ApiResponse.ok(settingRepo.findAll());
    }

    @PostMapping("/admin/settings")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<SystemSetting> saveSetting(@RequestBody SystemSetting setting) {
        setting.setUpdatedAt(Instant.now());
        return ApiResponse.ok("Setting saved", settingRepo.save(setting));
    }

    // Seller Portal Endpoints
    @GetMapping("/seller/products")
    @PreAuthorize("hasAnyRole('SELLER', 'ADMIN')")
    public ApiResponse<List<Product>> sellerProducts(@AuthenticationPrincipal AuthenticatedUser seller) {
        return ApiResponse.ok(productRepo.findBySellerId(seller.id()));
    }

    @PostMapping("/seller/products")
    @PreAuthorize("hasAnyRole('SELLER', 'ADMIN')")
    public ApiResponse<Product> sellerSubmitProduct(@AuthenticationPrincipal AuthenticatedUser seller, @RequestBody AdminProductRequest req) {
        Product p = new Product();
        applyProductFields(p, req);
        p.setSellerId(seller.id());
        p.setProductType("SELLER_MANAGED");
        p.setSourcePlatform("MISSIONCART_DIRECT");
        p.setApproved(false); // Requires admin approval before public showcase
        p.setSlug(req.name().toLowerCase().replaceAll("[^a-z0-9]+", "-") + "-" + req.sku().toLowerCase().replaceAll("[^a-z0-9]", ""));
        return ApiResponse.ok("Product submitted for admin approval", productRepo.save(p));
    }

    @DeleteMapping("/seller/products/{id}")
    @PreAuthorize("hasAnyRole('SELLER', 'ADMIN')")
    public ApiResponse<Void> sellerDeleteProduct(@AuthenticationPrincipal AuthenticatedUser seller, @PathVariable Long id) {
        Product p = productRepo.findById(id).orElseThrow(() -> new EntityNotFoundException("Product not found"));
        if (!"ADMIN".equalsIgnoreCase(seller.role()) && !seller.id().equals(p.getSellerId())) {
            throw new IllegalArgumentException("You can only delete your own seller listings.");
        }
        productRepo.delete(p);
        audit(seller, "PRODUCT", String.valueOf(id), "DELETED", "Seller removed listing " + p.getSku());
        return ApiResponse.ok("Listing deleted", null);
    }

    private void applyProductFields(Product p, AdminProductRequest req) {
        if (req.sku() != null) p.setSku(req.sku().trim().toUpperCase());
        if (req.name() != null) p.setName(req.name().trim());
        if (req.categoryId() != null) p.setCategoryId(req.categoryId());
        if (req.sourcePlatform() != null) p.setSourcePlatform(req.sourcePlatform());
        if (req.sourceUrl() != null) p.setSourceUrl(req.sourceUrl());
        if (req.productType() != null) p.setProductType(req.productType());
        if (req.description() != null) p.setDescription(req.description());
        if (req.price() != null) p.setPrice(req.price());
        if (req.originalPrice() != null) p.setOriginalPrice(req.originalPrice());
        if (req.stockQuantity() != null) {
            p.setStockQuantity(Math.max(0, req.stockQuantity()));
            p.setAvailabilityStatus(p.getStockQuantity() > 0 ? "IN_STOCK" : "OUT_OF_STOCK");
        }
        if (req.missionTags() != null) p.setMissionTags(req.missionTags());
        if (req.priorityTier() != null) p.setPriorityTier(req.priorityTier());
        if (req.imageUrl() != null) p.setImageUrl(req.imageUrl());
        if (req.imageSource() != null) p.setImageSource(req.imageSource());
        if (req.imageLicense() != null) p.setImageLicense(req.imageLicense());
        if (req.imageAttribution() != null) p.setImageAttribution(req.imageAttribution());
        if (req.imageStatus() != null) p.setImageStatus(req.imageStatus());
        if (req.published() != null) p.setPublished(req.published());
        if (req.approved() != null) p.setApproved(req.approved());
        if (req.gender() != null) p.setGender(req.gender());
        if (req.garmentType() != null) p.setGarmentType(req.garmentType());
        if (req.occasion() != null) p.setOccasion(req.occasion());
        if (req.material() != null) p.setMaterial(req.material());
        if (req.fit() != null) p.setFit(req.fit());
        if (req.pattern() != null) p.setPattern(req.pattern());
        if (p.getPrice() != null && p.getPrice().compareTo(BigDecimal.ZERO) > 0 && "UNAVAILABLE".equalsIgnoreCase(p.getPriceStatus())) {
            p.setPriceStatus("VERIFIED");
            p.setPriceVerified(true);
            p.setPriceLastVerifiedAt(Instant.now());
        }
    }

    private void audit(AuthenticatedUser admin, String entityType, String entityId, String action, String details) {
        ActivityLog log = new ActivityLog();
        log.setActorEmail(admin.email());
        log.setActorRole(admin.role());
        log.setEntityType(entityType);
        log.setEntityId(entityId);
        log.setAction(action);
        log.setDetails(details);
        logRepo.save(log);
    }
}
