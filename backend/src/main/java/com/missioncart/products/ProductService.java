package com.missioncart.products;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.missioncart.categories.Brand;
import com.missioncart.categories.BrandRepository;
import com.missioncart.categories.Category;
import com.missioncart.categories.CategoryRepository;
import com.missioncart.common.PageResponse;
import com.missioncart.products.ProductDtos.*;
import com.missioncart.retailers.RetailerSource;
import com.missioncart.retailers.RetailerSourceRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ProductService {

    private static final Set<String> SEARCH_STOP_WORDS = Set.of(
        "s", "for", "with", "and", "or", "the", "a", "an", "in", "on", "of", "to", "wear", "clothing", "clothes", "items"
    );

    private final ProductRepository productRepo;
    private final CategoryRepository categoryRepo;
    private final BrandRepository brandRepo;
    private final ProductImageRepository imageRepo;
    private final ProductVariantRepository variantRepo;
    private final RetailerSourceRepository retailerRepo;
    private final ObjectMapper objectMapper;

    public ProductService(
        ProductRepository productRepo,
        CategoryRepository categoryRepo,
        BrandRepository brandRepo,
        ProductImageRepository imageRepo,
        ProductVariantRepository variantRepo,
        RetailerSourceRepository retailerRepo,
        ObjectMapper objectMapper
    ) {
        this.productRepo = productRepo;
        this.categoryRepo = categoryRepo;
        this.brandRepo = brandRepo;
        this.imageRepo = imageRepo;
        this.variantRepo = variantRepo;
        this.retailerRepo = retailerRepo;
        this.objectMapper = objectMapper;
    }

    public ProductCountsDto getCounts() {
        long total = productRepo.count();
        long published = productRepo.countByPublishedTrueAndApprovedTrue();
        long imgVerified = productRepo.countByPublishedTrueAndApprovedTrueAndImageStatus("VERIFIED");
        long available = productRepo.countByAvailabilityStatus("IN_STOCK");
        long pendingImg = productRepo.countByImageStatus("REQUIRES_IMAGE");

        Map<String, Long> byRetailer = new LinkedHashMap<>();
        for (Object[] row : productRepo.countGroupedByRetailer()) {
            byRetailer.put(String.valueOf(row[0]), ((Number) row[1]).longValue());
        }

        Map<Long, String> catNames = categoryRepo.findAll().stream()
            .collect(Collectors.toMap(Category::getId, Category::getName));
        Map<String, Long> byCategory = new LinkedHashMap<>();
        for (Object[] row : productRepo.countGroupedByCategory()) {
            Long cid = ((Number) row[0]).longValue();
            byCategory.put(catNames.getOrDefault(cid, "Category #" + cid), ((Number) row[1]).longValue());
        }

        return new ProductCountsDto(total, published, imgVerified, available, pendingImg, byRetailer, byCategory);
    }

    public FashionFacetsDto getFashionFacets() {
        List<Product> fashion = productRepo.findByPublishedTrueAndApprovedTrue().stream()
            .filter(p -> p.getGender() != null || p.getGarmentType() != null)
            .toList();

        Set<Long> fBrandIds = fashion.stream().map(Product::getBrandId).filter(Objects::nonNull).collect(Collectors.toSet());
        List<String> brands = fBrandIds.isEmpty() ? List.of() : brandRepo.findAllById(fBrandIds).stream()
            .map(Brand::getName).filter(Objects::nonNull).distinct().sorted().toList();

        List<String> genders = List.of("WOMEN", "MEN", "UNISEX", "GENDER_NEUTRAL");
        List<String> garmentTypes = fashion.stream().map(Product::getGarmentType).filter(s -> s != null && !s.isBlank()).distinct().sorted().toList();
        List<String> occasions = fashion.stream().map(Product::getOccasion).filter(s -> s != null && !s.isBlank()).distinct().sorted().toList();
        List<String> materials = fashion.stream().map(Product::getMaterial).filter(s -> s != null && !s.isBlank()).distinct().sorted().toList();
        List<String> fits = fashion.stream().map(Product::getFit).filter(s -> s != null && !s.isBlank()).distinct().sorted().toList();
        List<String> patterns = fashion.stream().map(Product::getPattern).filter(s -> s != null && !s.isBlank()).distinct().sorted().toList();
        List<String> sizes = variantRepo.findDistinctAvailableSizes();

        return new FashionFacetsDto(genders, garmentTypes, occasions, brands, sizes, materials, fits, patterns);
    }

    public PageResponse<ProductDto> searchProducts(
        String q,
        String categoryCsv,
        String sourceCsv,
        Long brandId,
        String brandNameFilter,
        BigDecimal minPrice,
        BigDecimal maxPrice,
        String priorityTier,
        Boolean verifiedImagesOnly,
        Boolean inStockOnly,
        String sortBy,
        int page,
        int size
    ) {
        return searchProducts(
            q, categoryCsv, sourceCsv, null, brandId, brandNameFilter,
            minPrice, maxPrice, priorityTier, verifiedImagesOnly, inStockOnly,
            null, null, null, null, null, null, null, null, null, null,
            sortBy, page, size
        );
    }

    public PageResponse<ProductDto> searchProducts(
        String q,
        String categoryCsv,
        String sourceCsv,
        String sourceTypeFilter,
        Long brandId,
        String brandNameFilter,
        BigDecimal minPrice,
        BigDecimal maxPrice,
        String priorityTier,
        Boolean verifiedImagesOnly,
        Boolean inStockOnly,
        String genderFilter,
        String garmentTypeFilter,
        String occasionFilter,
        String clothingSizeFilter,
        String colorFilter,
        String materialFilter,
        String fitFilter,
        String patternFilter,
        Boolean verifiedDiscountOnly,
        String sortBy,
        int page,
        int size
    ) {
        return searchProducts(
            q, categoryCsv, sourceCsv, sourceTypeFilter, brandId, brandNameFilter,
            minPrice, maxPrice, priorityTier, verifiedImagesOnly, inStockOnly,
            genderFilter, garmentTypeFilter, occasionFilter, clothingSizeFilter, colorFilter,
            materialFilter, fitFilter, patternFilter, verifiedDiscountOnly, null,
            sortBy, page, size
        );
    }

    public PageResponse<ProductDto> searchProducts(
        String q,
        String categoryCsv,
        String sourceCsv,
        String sourceTypeFilter,
        Long brandId,
        String brandNameFilter,
        BigDecimal minPrice,
        BigDecimal maxPrice,
        String priorityTier,
        Boolean verifiedImagesOnly,
        Boolean inStockOnly,
        String genderFilter,
        String garmentTypeFilter,
        String occasionFilter,
        String clothingSizeFilter,
        String colorFilter,
        String materialFilter,
        String fitFilter,
        String patternFilter,
        Boolean verifiedDiscountOnly,
        String countryCode,
        String sortBy,
        int page,
        int size
    ) {
        Map<String, Category> catsBySlug = categoryRepo.findAll().stream()
            .collect(Collectors.toMap(c -> c.getSlug().toLowerCase(), c -> c, (a, b) -> a));

        List<Brand> allBrands = brandRepo.findAll();
        List<Long> matchedBrandIds = new ArrayList<>();
        boolean hasBrandFilter = brandNameFilter != null && !brandNameFilter.isBlank();
        if (hasBrandFilter) {
            String bfLower = brandNameFilter.trim().toLowerCase();
            for (Brand b : allBrands) {
                if (b.getName() != null && b.getName().toLowerCase().contains(bfLower)) {
                    matchedBrandIds.add(b.getId());
                }
            }
        }

        Map<String, RetailerSource> sourcesByCode = retailerRepo.findAll().stream()
            .collect(Collectors.toMap(s -> s.getCode().toUpperCase(), s -> s, (a, b) -> a));

        // Detect natural-language gender & token terms inside query string
        String effectiveGender = (genderFilter != null && !genderFilter.isBlank()) ? genderFilter.trim().toUpperCase() : null;
        List<String> queryTokens = new ArrayList<>();
        if (q != null && !q.isBlank()) {
            String normalizedQ = q.toLowerCase()
                .replace("women's", "women")
                .replace("womens", "women")
                .replace("men's", "men")
                .replace("mens", "men");
            for (String raw : normalizedQ.split("[^a-z0-9]+")) {
                if (raw.length() < 2 || SEARCH_STOP_WORDS.contains(raw)) continue;
                if (effectiveGender == null && "women".equals(raw)) {
                    effectiveGender = "WOMEN";
                    continue;
                }
                if (effectiveGender == null && "men".equals(raw)) {
                    effectiveGender = "MEN";
                    continue;
                }
                if (effectiveGender == null && ("unisex".equals(raw) || "genderneutral".equals(raw))) {
                    effectiveGender = "UNISEX";
                    continue;
                }
                String singular = singularize(raw);
                queryTokens.add(singular);
            }
        }

        final String resolvedGender = effectiveGender;
        boolean enforceVerifiedImages = Boolean.TRUE.equals(verifiedImagesOnly);

        Specification<Product> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isTrue(root.get("published")));
            predicates.add(cb.isTrue(root.get("approved")));

            if (enforceVerifiedImages) {
                predicates.add(cb.equal(root.get("imageStatus"), "VERIFIED"));
                predicates.add(cb.isNotNull(root.get("imageUrl")));
            }
            if (!queryTokens.isEmpty()) {
                for (String token : queryTokens) {
                    String pattern = "%" + token + "%";
                    List<Long> tokBrandIds = allBrands.stream()
                        .filter(b -> b.getName() != null && b.getName().toLowerCase().contains(token))
                        .map(Brand::getId).toList();
                    List<Predicate> tokOr = new ArrayList<>();
                    tokOr.add(cb.like(cb.lower(root.get("name")), pattern));
                    tokOr.add(cb.like(cb.lower(root.get("description")), pattern));
                    tokOr.add(cb.like(cb.lower(root.get("missionTags")), pattern));
                    tokOr.add(cb.like(cb.lower(root.get("garmentType")), pattern));
                    tokOr.add(cb.like(cb.lower(root.get("occasion")), pattern));
                    tokOr.add(cb.like(cb.lower(root.get("material")), pattern));
                    tokOr.add(cb.like(cb.lower(root.get("pattern")), pattern));
                    if (!tokBrandIds.isEmpty()) {
                        tokOr.add(root.get("brandId").in(tokBrandIds));
                    }
                    predicates.add(cb.or(tokOr.toArray(new Predicate[0])));
                }
            }
            if (categoryCsv != null && !categoryCsv.isBlank()) {
                List<Long> catIds = Arrays.stream(categoryCsv.split(","))
                    .map(String::trim).map(String::toLowerCase)
                    .map(catsBySlug::get)
                    .filter(Objects::nonNull)
                    .map(Category::getId)
                    .toList();
                if (!catIds.isEmpty()) {
                    predicates.add(cb.or(root.get("categoryId").in(catIds), root.get("subcategoryId").in(catIds)));
                }
            }
            if (sourceCsv != null && !sourceCsv.isBlank()) {
                List<String> srcCodes = Arrays.stream(sourceCsv.split(","))
                    .map(String::trim).map(String::toUpperCase).filter(s -> !s.isEmpty()).toList();
                if (!srcCodes.isEmpty()) {
                    predicates.add(cb.upper(root.get("sourcePlatform")).in(srcCodes));
                }
            }
            if (sourceTypeFilter != null && !sourceTypeFilter.isBlank()) {
                String stUpper = sourceTypeFilter.trim().toUpperCase();
                List<String> matchingCodes = sourcesByCode.values().stream()
                    .filter(s -> stUpper.equalsIgnoreCase(s.getSourceType()))
                    .map(RetailerSource::getCode)
                    .map(String::toUpperCase)
                    .toList();
                if (!matchingCodes.isEmpty()) {
                    predicates.add(cb.upper(root.get("sourcePlatform")).in(matchingCodes));
                } else {
                    predicates.add(cb.disjunction());
                }
            }
            if (brandId != null) {
                predicates.add(cb.equal(root.get("brandId"), brandId));
            }
            if (hasBrandFilter) {
                String bPattern = "%" + brandNameFilter.trim().toLowerCase() + "%";
                if (!matchedBrandIds.isEmpty()) {
                    predicates.add(cb.or(
                        root.get("brandId").in(matchedBrandIds),
                        cb.like(cb.lower(root.get("name")), bPattern)
                    ));
                } else {
                    predicates.add(cb.like(cb.lower(root.get("name")), bPattern));
                }
            }
            if (resolvedGender != null && !"ALL".equals(resolvedGender) && !"ALL_STYLES".equals(resolvedGender)) {
                if ("UNISEX".equals(resolvedGender) || "GENDER_NEUTRAL".equals(resolvedGender)) {
                    predicates.add(cb.upper(root.get("gender")).in("UNISEX", "GENDER_NEUTRAL"));
                } else {
                    predicates.add(cb.equal(cb.upper(root.get("gender")), resolvedGender));
                }
            }
            if (garmentTypeFilter != null && !garmentTypeFilter.isBlank()) {
                String[] parts = garmentTypeFilter.split(",");
                List<Predicate> gtOr = new ArrayList<>();
                for (String pt : parts) {
                    if (!pt.isBlank()) {
                        gtOr.add(cb.like(cb.lower(root.get("garmentType")), "%" + pt.trim().toLowerCase() + "%"));
                    }
                }
                if (!gtOr.isEmpty()) predicates.add(cb.or(gtOr.toArray(new Predicate[0])));
            }
            if (occasionFilter != null && !occasionFilter.isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("occasion")), "%" + occasionFilter.trim().toLowerCase() + "%"));
            }
            if (materialFilter != null && !materialFilter.isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("material")), "%" + materialFilter.trim().toLowerCase() + "%"));
            }
            if (fitFilter != null && !fitFilter.isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("fit")), "%" + fitFilter.trim().toLowerCase() + "%"));
            }
            if (patternFilter != null && !patternFilter.isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("pattern")), "%" + patternFilter.trim().toLowerCase() + "%"));
            }
            if ((clothingSizeFilter != null && !clothingSizeFilter.isBlank()) || (colorFilter != null && !colorFilter.isBlank())) {
                Subquery<Long> sub = query.subquery(Long.class);
                Root<ProductVariant> vRoot = sub.from(ProductVariant.class);
                List<Predicate> vPreds = new ArrayList<>();
                vPreds.add(cb.equal(vRoot.get("productId"), root.get("id")));
                vPreds.add(cb.greaterThan(vRoot.get("stockQuantity"), 0));
                if (clothingSizeFilter != null && !clothingSizeFilter.isBlank()) {
                    vPreds.add(cb.equal(cb.lower(vRoot.get("size")), clothingSizeFilter.trim().toLowerCase()));
                }
                if (colorFilter != null && !colorFilter.isBlank()) {
                    vPreds.add(cb.like(cb.lower(vRoot.get("color")), "%" + colorFilter.trim().toLowerCase() + "%"));
                }
                sub.select(vRoot.get("productId")).where(vPreds.toArray(new Predicate[0]));
                predicates.add(root.get("id").in(sub));
            }
            if (minPrice != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("price"), minPrice));
            }
            if (maxPrice != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("price"), maxPrice));
            }
            if (Boolean.TRUE.equals(verifiedDiscountOnly)) {
                predicates.add(cb.isTrue(root.get("priceVerified")));
                predicates.add(cb.isNotNull(root.get("originalPrice")));
                predicates.add(cb.greaterThan(root.get("originalPrice"), root.get("price")));
            }
            if (priorityTier != null && !priorityTier.isBlank()) {
                predicates.add(cb.equal(cb.upper(root.get("priorityTier")), priorityTier.trim().toUpperCase()));
            }
            if (Boolean.TRUE.equals(inStockOnly)) {
                predicates.add(cb.equal(root.get("availabilityStatus"), "IN_STOCK"));
                predicates.add(cb.greaterThan(root.get("stockQuantity"), 0));
            }
            if (countryCode != null && !countryCode.isBlank()) {
                predicates.add(cb.equal(cb.upper(root.get("countryCode")), countryCode.trim().toUpperCase()));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Sort sort = switch (sortBy == null ? "relevance" : sortBy) {
            case "price_asc" -> Sort.by(Sort.Order.asc("price").nullsLast(), Sort.Order.asc("id"));
            case "price_desc" -> Sort.by(Sort.Order.desc("price").nullsLast(), Sort.Order.asc("id"));
            case "newest" -> Sort.by(Sort.Order.desc("createdAt"), Sort.Order.asc("id"));
            default -> Sort.by(Sort.Order.desc("priceVerified"), Sort.Order.asc("id"));
        };

        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 100), sort);
        Page<Product> result = productRepo.findAll(spec, pageable);
        Map<Long, Category> catMap = categoryRepo.findAll().stream().collect(Collectors.toMap(Category::getId, c -> c));
        Set<Long> brandIds = result.getContent().stream().map(Product::getBrandId).filter(Objects::nonNull).collect(Collectors.toSet());
        Map<Long, Brand> brandMap = brandIds.isEmpty() ? Map.of() : brandRepo.findAllById(brandIds).stream().collect(Collectors.toMap(Brand::getId, b -> b));

        List<ProductDto> dtos = result.getContent().stream()
            .map(p -> toDto(p, catMap.get(p.getCategoryId()), p.getBrandId() != null ? brandMap.get(p.getBrandId()) : null, false, sourcesByCode))
            .toList();

        return new PageResponse<>(dtos, result.getNumber(), result.getSize(), result.getTotalElements(), result.getTotalPages());
    }

    private String singularize(String token) {
        if (token.equals("jeans") || token.equals("chinos") || token.equals("palazzos") || token.equals("sunglasses")) {
            return token;
        }
        if (token.endsWith("ies") && token.length() > 4) return token.substring(0, token.length() - 3) + "y";
        if (token.endsWith("es") && token.length() > 4 && (token.endsWith("sses") || token.endsWith("ches") || token.endsWith("shes"))) {
            return token.substring(0, token.length() - 2);
        }
        if (token.endsWith("s") && token.length() > 4 && !token.endsWith("ss")) {
            return token.substring(0, token.length() - 1);
        }
        return token;
    }

    public ProductDto getByIdOrSlug(String idOrSlug) {
        Product p = null;
        if (idOrSlug.chars().allMatch(Character::isDigit)) {
            p = productRepo.findById(Long.parseLong(idOrSlug)).orElse(null);
        }
        if (p == null) {
            p = productRepo.findBySlug(idOrSlug)
                .orElseThrow(() -> new EntityNotFoundException("Product not found: " + idOrSlug));
        }
        Category cat = categoryRepo.findById(p.getCategoryId()).orElse(null);
        Brand brand = p.getBrandId() != null ? brandRepo.findById(p.getBrandId()).orElse(null) : null;
        return toDto(p, cat, brand, true);
    }

    public AlternativesDto getAlternatives(Long productId) {
        Product base = productRepo.findById(productId)
            .orElseThrow(() -> new EntityNotFoundException("Product not found: " + productId));
        Pageable limit = PageRequest.of(0, 24, Sort.by(Sort.Direction.ASC, "price"));
        Specification<Product> spec = (root, query, cb) -> {
            List<Predicate> pList = new ArrayList<>(List.of(
                cb.equal(root.get("categoryId"), base.getCategoryId()),
                cb.notEqual(root.get("id"), productId),
                cb.isTrue(root.get("published")),
                cb.isTrue(root.get("approved")),
                cb.equal(root.get("imageStatus"), "VERIFIED")
            ));
            if (base.getGender() != null && !base.getGender().isBlank()) {
                pList.add(cb.equal(root.get("gender"), base.getGender()));
            }
            return cb.and(pList.toArray(new Predicate[0]));
        };
        List<Product> sameCategory = productRepo.findAll(spec, limit).getContent();
        Map<Long, Category> catMap = categoryRepo.findAll().stream().collect(Collectors.toMap(Category::getId, c -> c));
        Set<Long> brandIds = sameCategory.stream().map(Product::getBrandId).filter(Objects::nonNull).collect(Collectors.toSet());
        Map<Long, Brand> brandMap = brandIds.isEmpty() ? Map.of() : brandRepo.findAllById(brandIds).stream().collect(Collectors.toMap(Brand::getId, b -> b));
        Map<String, RetailerSource> sourcesByCode = retailerRepo.findAll().stream()
            .collect(Collectors.toMap(s -> s.getCode().toUpperCase(), s -> s, (a, b) -> a));

        List<ProductDto> all = sameCategory.stream()
            .map(p -> toDto(p, catMap.get(p.getCategoryId()), p.getBrandId() != null ? brandMap.get(p.getBrandId()) : null, false, sourcesByCode))
            .toList();

        List<ProductDto> budget = all.stream()
            .filter(p -> p.price() != null && (base.getPrice() == null || p.price().compareTo(base.getPrice()) < 0 || "BUDGET".equalsIgnoreCase(p.priorityTier())))
            .limit(4).toList();
        List<ProductDto> balanced = all.stream()
            .filter(p -> "BALANCED".equalsIgnoreCase(p.priorityTier()))
            .limit(4).toList();
        List<ProductDto> premium = all.stream()
            .filter(p -> p.price() != null && ((base.getPrice() != null && p.price().compareTo(base.getPrice()) > 0) || "PREMIUM".equalsIgnoreCase(p.priorityTier())))
            .limit(4).toList();

        return new AlternativesDto(budget, balanced, premium);
    }

    public ProductDto toDto(Product p, Category cat, Brand brand, boolean includeImages) {
        Map<String, RetailerSource> sourcesByCode = retailerRepo.findAll().stream()
            .collect(Collectors.toMap(s -> s.getCode().toUpperCase(), s -> s, (a, b) -> a));
        return toDto(p, cat, brand, includeImages, sourcesByCode);
    }

    public ProductDto toDto(Product p, Category cat, Brand brand, boolean includeImages, Map<String, RetailerSource> sourcesByCode) {
        List<String> tags = p.getMissionTags() == null || p.getMissionTags().isBlank()
            ? List.of()
            : Arrays.stream(p.getMissionTags().split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
        List<ProductImageDto> extras = includeImages
            ? imageRepo.findByProductIdOrderByPrimaryImageDescSortOrderAsc(p.getId()).stream()
                .map(img -> new ProductImageDto(
                    img.getId(), img.getImageUrl(), img.getImageSource(), img.getImageAttribution(),
                    img.getImageLicense(), img.getImageStatus(), img.getImageType(), img.getImageWidth(), img.getImageHeight(),
                    img.getImageAltText(), img.isPrimaryImage()
                )).toList()
            : List.of();
        List<ProductVariantDto> variantDtos = (includeImages || p.getGender() != null || "MISSIONCART_DIRECT".equalsIgnoreCase(p.getProductType()))
            ? variantRepo.findByProductIdOrderByDefaultVariantDescIdAsc(p.getId()).stream()
                .map(v -> new ProductVariantDto(
                    v.getId(), v.getVariantSku(), v.getSize(), v.getColor(), v.getColorHex(),
                    v.getVariantName(), v.getPrice(), v.getOriginalPrice(), v.getStockQuantity(),
                    v.getAvailabilityStatus(), v.getImageUrl(), v.isDefaultVariant()
                )).toList()
            : List.of();

        RetailerSource src = p.getSourcePlatform() != null ? sourcesByCode.get(p.getSourcePlatform().toUpperCase()) : null;
        String sourceType = src != null ? src.getSourceType() : "RETAILER";

        return new ProductDto(
            p.getId(), p.getSku(), p.getName(), p.getSlug(),
            p.getBrandId(), brand != null ? brand.getName() : null,
            p.getCategoryId(), cat != null ? cat.getName() : null, cat != null ? cat.getSlug() : null,
            p.getSourcePlatform(), sourceType, p.getSourceProductId(), p.getSourceUrl(), p.getProductType(),
            p.getDescription(), p.getPrice(), p.getOriginalPrice(), p.getCurrency(),
            p.isPriceVerified(), p.getPriceStatus(), p.getTaxRate(), p.getShippingEstimate(),
            p.getPriceLastVerifiedAt(), p.getAvailabilityVerifiedAt(),
            p.getAvailabilityStatus(), p.getStockQuantity(),
            p.getRating(), p.getReviewCount(), p.isRatingVerified(), p.getDataVerificationStatus(),
            parseMap(p.getSpecificationsJson()), parseMap(p.getAttributesJson()),
            tags, p.getPriorityTier(), parseList(p.getLifecycleOptionsJson()),
            p.getImageUrl(), p.getImageSource(), p.getImageAttribution(), p.getImageLicense(), p.getImageStatus(),
            p.getImageType(), p.getImageResolution(), p.getImageVerifiedAt(),
            p.getGender(), p.getGarmentType(), p.getOccasion(), p.getMaterial(), p.getFit(),
            p.getSleeveLength(), p.getPattern(), p.getCareInstructions(), parseMap(p.getSizeChartJson()),
            p.getCountryCode(), parseList(p.getDeliveryCountriesJson()),
            variantDtos, extras, p.isPublished(), p.isApproved(), p.getCreatedAt()
        );
    }

    private Map<String, Object> parseMap(String json) {
        if (json == null || json.isBlank()) return Map.of();
        try { return objectMapper.readValue(json, new TypeReference<>() {}); } catch (Exception e) { return Map.of(); }
    }

    private List<String> parseList(String json) {
        if (json == null || json.isBlank()) return List.of();
        try { return objectMapper.readValue(json, new TypeReference<>() {}); } catch (Exception e) { return List.of(); }
    }
}
