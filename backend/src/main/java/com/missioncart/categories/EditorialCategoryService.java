package com.missioncart.categories;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.missioncart.common.PageResponse;
import com.missioncart.products.Product;
import com.missioncart.products.ProductDtos.ProductDto;
import com.missioncart.products.ProductRepository;
import com.missioncart.products.ProductService;
import com.missioncart.retailers.RetailerSource;
import com.missioncart.retailers.RetailerSourceRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class EditorialCategoryService {

    public record CollageTileDto(
        Long productId,
        String slug,
        String name,
        String brandName,
        String imageUrl,
        BigDecimal price,
        String currency
    ) {}

    public record EditorialCollectionCardDto(
        Long id,
        String categorySlug,
        String slug,
        String title,
        String subtitle,
        String description,
        String countryCode,
        long matchingProductCount,
        Map<String, Object> filterParams,
        List<CollageTileDto> collageTiles
    ) {}

    public record EditorialCategoryPageDto(
        String requestedSlug,
        String name,
        String heroHeading,
        String heroItalicAccent,
        String editorialDescription,
        String countryCode,
        List<String> resolvedCategorySlugs,
        List<String> subcategories,
        List<String> featuredBrands,
        long totalProductsInCountry,
        List<EditorialCollectionCardDto> collections,
        boolean hasDatasetForCountry
    ) {}

    public record CategoryHighlightTileDto(
        String routeSlug,
        String title,
        String description,
        String imageUrl,
        long productCount
    ) {}

    public record BrandSpotlightDto(
        String name,
        String status,
        long productCount
    ) {}

    public record HomepageEditorialDto(
        String countryCode,
        long totalCountryProducts,
        List<EditorialCollectionCardDto> collections,
        List<EditorialCollectionCardDto> fashionCollections,
        List<EditorialCollectionCardDto> beautyCollections,
        List<CategoryHighlightTileDto> categories,
        List<BrandSpotlightDto> featuredBrands
    ) {}

    private static final Map<String, List<String>> CANONICAL_CATEGORY_ALIASES = Map.ofEntries(
        Map.entry("beauty", List.of("beauty", "skincare")),
        Map.entry("skincare", List.of("skincare", "beauty")),
        Map.entry("home-living", List.of("home-decor", "kitchen", "storage-organization")),
        Map.entry("grocery", List.of("groceries")),
        Map.entry("groceries", List.of("groceries")),
        Map.entry("fashion", List.of("fashion")),
        Map.entry("electronics", List.of("electronics")),
        Map.entry("travel", List.of("travel")),
        Map.entry("fitness", List.of("fitness")),
        Map.entry("study-workspace", List.of("study-workspace")),
        Map.entry("home-featured", List.of("fashion", "beauty", "skincare", "home-decor", "kitchen", "electronics", "groceries", "travel", "fitness", "study-workspace"))
    );

    private static final Map<String, List<String>> DEFAULT_HERO_COPY = Map.of(
        "fashion", List.of("Fashion", "Everyday style.", "Extraordinary expression.", "Discover real-brand apparel, footwear, traditional wear, and accessories across all genders."),
        "beauty", List.of("Beauty & Skincare", "Your beauty.", "Your everyday ritual.", "Clean dermatological skincare, lip care, grooming, and daily beauty with authentic packshots."),
        "home-living", List.of("Home & Living", "Make space.", "Feel at home.", "Calm linens, cookware, modular storage, and ceramic accents crafted for daily living."),
        "electronics", List.of("Electronics", "Technology.", "Made for everyday life.", "Audio, desk gear, power management, and smart home electronics from real brands."),
        "grocery", List.of("Grocery & Food", "Good food.", "Everyday essentials.", "Dairy staples, breakfast grains, specialty beverages, and wholesome pantry essentials."),
        "travel", List.of("Travel", "Pack light.", "Explore more.", "Luggage, organizers, weather layers, and compact travel electronics."),
        "fitness", List.of("Fitness", "Move better.", "Feel stronger.", "Yoga mats, home training kits, and activewear built for movement."),
        "study-workspace", List.of("Study & Workspace", "Create your space.", "Find your focus.", "Ergonomic desk stands, lighting, notebooks, and productivity tech."),
        "home-featured", List.of("Curated Collections", "Explore our collections.", "Find your kind of everything.", "Carefully curated products, beautiful collections and brands worth discovering.")
    );

    private final CategoryRepository categoryRepo;
    private final EditorialCollectionRepository collectionRepo;
    private final ProductRepository productRepo;
    private final BrandRepository brandRepo;
    private final RetailerSourceRepository retailerRepo;
    private final ProductService productService;
    private final ObjectMapper objectMapper;

    public EditorialCategoryService(
        CategoryRepository categoryRepo,
        EditorialCollectionRepository collectionRepo,
        ProductRepository productRepo,
        BrandRepository brandRepo,
        RetailerSourceRepository retailerRepo,
        ProductService productService,
        ObjectMapper objectMapper
    ) {
        this.categoryRepo = categoryRepo;
        this.collectionRepo = collectionRepo;
        this.productRepo = productRepo;
        this.brandRepo = brandRepo;
        this.retailerRepo = retailerRepo;
        this.productService = productService;
        this.objectMapper = objectMapper;
    }

    public List<String> resolveCategorySlugs(String slug) {
        if (slug == null || slug.isBlank()) return List.of();
        String key = slug.trim().toLowerCase();
        return CANONICAL_CATEGORY_ALIASES.getOrDefault(key, List.of(key));
    }

    public EditorialCategoryPageDto getEditorialCategory(String rawSlug, String countryCode) {
        String reqSlug = rawSlug.trim().toLowerCase();
        String effectiveCountry = (countryCode != null && !countryCode.isBlank()) ? countryCode.trim().toUpperCase() : "IN";
        List<String> resolvedSlugs = resolveCategorySlugs(reqSlug);

        Map<String, Category> catBySlug = categoryRepo.findAll().stream()
            .collect(Collectors.toMap(c -> c.getSlug().toLowerCase(), c -> c, (a, b) -> a));

        Category primaryCat = catBySlug.get(resolvedSlugs.get(0));
        List<String> heroCopy = DEFAULT_HERO_COPY.get(reqSlug);

        String displayName = primaryCat != null ? primaryCat.getName()
            : (heroCopy != null ? heroCopy.get(0) : capitalizeSlug(reqSlug));
        if (heroCopy != null) displayName = heroCopy.get(0);

        String heroHeading = (primaryCat != null && primaryCat.getHeroHeading() != null)
            ? primaryCat.getHeroHeading()
            : (heroCopy != null ? heroCopy.get(1) : displayName + ".");
        String heroAccent = (primaryCat != null && primaryCat.getHeroItalicAccent() != null)
            ? primaryCat.getHeroItalicAccent()
            : (heroCopy != null ? heroCopy.get(2) : "Curated for your purpose.");
        String editorialDesc = (primaryCat != null && primaryCat.getEditorialDescription() != null)
            ? primaryCat.getEditorialDescription()
            : (heroCopy != null ? heroCopy.get(3) : (primaryCat != null ? primaryCat.getDescription() : "Explore verified products curated around real utility."));

        List<String> subcategories = parseList(primaryCat != null ? primaryCat.getSubcategoriesJson() : null);

        List<Long> resolvedCatIds = resolvedSlugs.stream()
            .map(catBySlug::get).filter(Objects::nonNull).map(Category::getId).toList();

        // Count category items in selected country
        long totalInCountry = resolvedCatIds.isEmpty() ? 0L : productRepo.count((root, query, cb) -> cb.and(
            cb.isTrue(root.get("published")),
            cb.isTrue(root.get("approved")),
            cb.equal(root.get("imageStatus"), "VERIFIED"),
            root.get("categoryId").in(resolvedCatIds),
            cb.equal(cb.upper(root.get("countryCode")), effectiveCountry)
        ));

        // Top featured brands genuinely present in this category & country
        List<String> featuredBrands = computeFeaturedBrands(resolvedCatIds, effectiveCountry);

        // Fetch collections mapped to this category slug (plus fallback single auto-collection if admin created new category)
        List<EditorialCollection> cols = collectionRepo.findByCategorySlugIgnoreCaseAndActiveTrueOrderByDisplayOrderAscIdAsc(reqSlug);
        if (cols.isEmpty() && !resolvedSlugs.isEmpty() && !resolvedSlugs.get(0).equals(reqSlug)) {
            cols = collectionRepo.findByCategorySlugIgnoreCaseAndActiveTrueOrderByDisplayOrderAscIdAsc(resolvedSlugs.get(0));
        }

        List<EditorialCollectionCardDto> cards = new ArrayList<>();
        Map<Long, Brand> brandCache = brandRepo.findAll().stream().collect(Collectors.toMap(Brand::getId, b -> b));

        for (EditorialCollection col : cols) {
            if (col.getCountryCode() != null && !col.getCountryCode().isBlank()
                && !col.getCountryCode().equalsIgnoreCase(effectiveCountry)) {
                continue;
            }
            Map<String, Object> fp = parseMap(col.getFilterParamsJson());
            Specification<Product> spec = buildCollectionSpec(fp, catBySlug, effectiveCountry);
            long matchCount = productRepo.count(spec);
            List<Product> sample = productRepo.findAll(
                spec,
                PageRequest.of(0, 30, Sort.by(Sort.Order.desc("priceVerified"), Sort.Order.asc("id")))
            ).getContent();

            // Build unique distinct-image tiles (never duplicate one URL in the same collage)
            List<CollageTileDto> tiles = new ArrayList<>();
            Set<String> seenUrls = new HashSet<>();
            for (Product p : sample) {
                if (p.getImageUrl() == null || p.getImageUrl().isBlank()) continue;
                if (!seenUrls.add(p.getImageUrl())) continue;
                Brand b = p.getBrandId() != null ? brandCache.get(p.getBrandId()) : null;
                tiles.add(new CollageTileDto(
                    p.getId(), p.getSlug(), p.getName(), b != null ? b.getName() : null,
                    p.getImageUrl(), p.getPrice(), p.getCurrency()
                ));
                if (tiles.size() >= 9) break;
            }

            cards.add(new EditorialCollectionCardDto(
                col.getId(), col.getCategorySlug(), col.getSlug(), col.getTitle(), col.getSubtitle(),
                col.getDescription(), col.getCountryCode(), matchCount, fp, tiles
            ));
        }

        // If admin created a brand-new category without explicit collections yet, auto-generate an All Collection panel cleanly from its products
        if (cards.isEmpty() && !resolvedCatIds.isEmpty()) {
            Map<String, Object> fp = Map.of("categories", resolvedSlugs);
            Specification<Product> spec = buildCollectionSpec(fp, catBySlug, effectiveCountry);
            List<Product> sample = productRepo.findAll(spec, PageRequest.of(0, 24)).getContent();
            List<CollageTileDto> tiles = new ArrayList<>();
            Set<String> seenUrls = new HashSet<>();
            for (Product p : sample) {
                if (p.getImageUrl() != null && seenUrls.add(p.getImageUrl())) {
                    Brand b = p.getBrandId() != null ? brandCache.get(p.getBrandId()) : null;
                    tiles.add(new CollageTileDto(p.getId(), p.getSlug(), p.getName(), b != null ? b.getName() : null, p.getImageUrl(), p.getPrice(), p.getCurrency()));
                    if (tiles.size() >= 9) break;
                }
            }
            cards.add(new EditorialCollectionCardDto(
                0L, reqSlug, reqSlug + "-all", displayName + " Highlights",
                "Real verified listings", editorialDesc, null, totalInCountry, fp, tiles
            ));
        }

        return new EditorialCategoryPageDto(
            reqSlug, displayName, heroHeading, heroAccent, editorialDesc, effectiveCountry,
            resolvedSlugs, subcategories, featuredBrands, totalInCountry, cards, totalInCountry > 0
        );
    }

    public HomepageEditorialDto getEditorialHomepage(String countryCode) {
        String effectiveCountry = (countryCode != null && !countryCode.isBlank()) ? countryCode.trim().toUpperCase() : "IN";
        Map<String, Category> catBySlug = categoryRepo.findAll().stream()
            .collect(Collectors.toMap(c -> c.getSlug().toLowerCase(), c -> c, (a, b) -> a));
        Map<Long, Brand> brandCache = brandRepo.findAll().stream().collect(Collectors.toMap(Brand::getId, b -> b));

        long totalInCountry = productRepo.count((root, query, cb) -> cb.and(
            cb.isTrue(root.get("published")),
            cb.isTrue(root.get("approved")),
            cb.equal(cb.upper(root.get("countryCode")), effectiveCountry)
        ));

        List<EditorialCollectionCardDto> mainCollections = buildCardsForCategorySlug("home-featured", catBySlug, brandCache, effectiveCountry);
        List<EditorialCollectionCardDto> fashionCols = buildCardsForCategorySlug("fashion", catBySlug, brandCache, effectiveCountry)
            .stream().limit(6).toList();
        List<EditorialCollectionCardDto> beautyCols = buildCardsForCategorySlug("beauty", catBySlug, brandCache, effectiveCountry)
            .stream().limit(6).toList();

        List<List<String>> catDefs = List.of(
            List.of("fashion", "Fashion", "Dresses, tailoring, footwear & everyday staples."),
            List.of("beauty", "Beauty", "Dermatologist skincare, lip care & clean beauty."),
            List.of("home-living", "Home & Living", "Ceramics, kitchenware & soft living accents."),
            List.of("electronics", "Electronics", "Audio gear, desk lamps, keyboards & smart tech."),
            List.of("grocery", "Grocery", "Dairy milk, breakfast grains & artisan beverages."),
            List.of("travel", "Travel", "Carry-on luggage, backpacks & transit adapters."),
            List.of("fitness", "Fitness", "Yoga mats, resistance training & activewear."),
            List.of("study-workspace", "Study & Workspace", "Desk setups, notebooks & USB-C productivity."),
            List.of("accessories", "Accessories", "Bags, watches, eyewear & silver accents."),
            List.of("personal-care", "Personal Care", "Daily hygiene towels, trimmers & body care.")
        );

        List<CategoryHighlightTileDto> categoryTiles = new ArrayList<>();
        for (List<String> def : catDefs) {
            String rSlug = def.get(0);
            String title = def.get(1);
            String desc = def.get(2);
            List<String> dbSlugs = switch (rSlug) {
                case "accessories" -> List.of("fashion");
                case "personal-care" -> List.of("personal-care", "skincare");
                default -> resolveCategorySlugs(rSlug);
            };
            List<Long> catIds = dbSlugs.stream().map(catBySlug::get).filter(Objects::nonNull).map(Category::getId).toList();
            long cnt = 0L;
            String img = fallbackCategoryPhoto(rSlug);
            if (!catIds.isEmpty()) {
                Specification<Product> spec = (root, q, cb) -> {
                    List<Predicate> ps = new ArrayList<>();
                    ps.add(cb.isTrue(root.get("published")));
                    ps.add(cb.isTrue(root.get("approved")));
                    ps.add(cb.equal(root.get("imageStatus"), "VERIFIED"));
                    ps.add(cb.isNotNull(root.get("imageUrl")));
                    ps.add(root.get("categoryId").in(catIds));
                    ps.add(cb.equal(cb.upper(root.get("countryCode")), effectiveCountry));
                    if ("accessories".equals(rSlug)) {
                        ps.add(cb.or(
                            cb.like(cb.lower(root.get("name")), "%bag%"),
                            cb.like(cb.lower(root.get("name")), "%watch%"),
                            cb.like(cb.lower(root.get("name")), "%jewel%")
                        ));
                    }
                    return cb.and(ps.toArray(new Predicate[0]));
                };
                cnt = productRepo.count(spec);
                List<Product> sample = productRepo.findAll(spec, PageRequest.of(0, 1, Sort.by(Sort.Order.desc("priceVerified"), Sort.Order.asc("id")))).getContent();
                if (!sample.isEmpty() && sample.get(0).getImageUrl() != null) {
                    img = sample.get(0).getImageUrl();
                }
            }
            categoryTiles.add(new CategoryHighlightTileDto(
                "accessories".equals(rSlug) ? "fashion?q=bag" : ("personal-care".equals(rSlug) ? "beauty" : rSlug),
                title, desc, img, cnt
            ));
        }

        // Real brands active in current country + Data Boutique coming soon luxury houses
        List<Long> allCatIds = catBySlug.values().stream().map(Category::getId).toList();
        List<String> activeBrandsInCountry = computeFeaturedBrands(allCatIds, effectiveCountry);
        List<BrandSpotlightDto> brands = new ArrayList<>();
        for (String b : activeBrandsInCountry) {
            brands.add(new BrandSpotlightDto(b, "ACTIVE", 1L));
        }
        for (String lux : List.of("Chanel", "Gucci", "Dior", "Louis Vuitton", "Hermes", "Prada", "Burberry", "Balenciaga")) {
            if (brands.stream().noneMatch(x -> x.name().equalsIgnoreCase(lux))) {
                brands.add(new BrandSpotlightDto(lux, "DATASET_PENDING", 0L));
            }
        }

        return new HomepageEditorialDto(
            effectiveCountry, totalInCountry, mainCollections, fashionCols, beautyCols, categoryTiles, brands
        );
    }

    private List<EditorialCollectionCardDto> buildCardsForCategorySlug(
        String categorySlug,
        Map<String, Category> catBySlug,
        Map<Long, Brand> brandCache,
        String effectiveCountry
    ) {
        List<EditorialCollection> cols = collectionRepo.findByCategorySlugIgnoreCaseAndActiveTrueOrderByDisplayOrderAscIdAsc(categorySlug);
        List<EditorialCollectionCardDto> cards = new ArrayList<>();
        for (EditorialCollection col : cols) {
            if (col.getCountryCode() != null && !col.getCountryCode().isBlank() && !col.getCountryCode().equalsIgnoreCase(effectiveCountry)) {
                continue;
            }
            Map<String, Object> fp = parseMap(col.getFilterParamsJson());
            Specification<Product> spec = buildCollectionSpec(fp, catBySlug, effectiveCountry);
            long matchCount = productRepo.count(spec);
            List<Product> sample = productRepo.findAll(
                spec,
                PageRequest.of(0, 30, Sort.by(Sort.Order.desc("priceVerified"), Sort.Order.asc("id")))
            ).getContent();
            List<CollageTileDto> tiles = new ArrayList<>();
            Set<String> seenUrls = new HashSet<>();
            for (Product p : sample) {
                if (p.getImageUrl() == null || p.getImageUrl().isBlank()) continue;
                if (!seenUrls.add(p.getImageUrl())) continue;
                Brand b = p.getBrandId() != null ? brandCache.get(p.getBrandId()) : null;
                tiles.add(new CollageTileDto(
                    p.getId(), p.getSlug(), p.getName(), b != null ? b.getName() : null,
                    p.getImageUrl(), p.getPrice(), p.getCurrency()
                ));
                if (tiles.size() >= 9) break;
            }
            cards.add(new EditorialCollectionCardDto(
                col.getId(), col.getCategorySlug(), col.getSlug(), col.getTitle(), col.getSubtitle(),
                col.getDescription(), col.getCountryCode(), matchCount, fp, tiles
            ));
        }
        return cards;
    }

    private String fallbackCategoryPhoto(String slug) {
        return switch (slug) {
            case "beauty", "personal-care" -> "/verified-media/hero_skincare.jpg";
            case "home-living" -> "/verified-media/hero_kitchen.jpg";
            case "study-workspace" -> "/verified-media/hero_workspace.jpg";
            case "electronics" -> "/verified-media/elec_headphones.jpg";
            case "fitness" -> "/verified-media/fit_mat.jpg";
            default -> "/verified-media/fash_sneakers.png";
        };
    }

    public PageResponse<ProductDto> getCollectionProducts(String collectionSlug, String countryCode, int page, int size, String sortBy) {
        EditorialCollection col = collectionRepo.findBySlugIgnoreCase(collectionSlug).orElse(null);
        String effectiveCountry = (countryCode != null && !countryCode.isBlank()) ? countryCode.trim().toUpperCase() : "IN";
        if (col == null) {
            return new PageResponse<>(List.of(), 0, size, 0, 0);
        }
        Map<String, Category> catBySlug = categoryRepo.findAll().stream()
            .collect(Collectors.toMap(c -> c.getSlug().toLowerCase(), c -> c, (a, b) -> a));
        Map<String, Object> fp = parseMap(col.getFilterParamsJson());
        Specification<Product> spec = buildCollectionSpec(fp, catBySlug, effectiveCountry);

        Sort sort = switch (sortBy == null ? "relevance" : sortBy) {
            case "price_asc" -> Sort.by(Sort.Order.asc("price").nullsLast(), Sort.Order.asc("id"));
            case "price_desc" -> Sort.by(Sort.Order.desc("price").nullsLast(), Sort.Order.asc("id"));
            case "newest" -> Sort.by(Sort.Order.desc("createdAt"), Sort.Order.asc("id"));
            default -> Sort.by(Sort.Order.desc("priceVerified"), Sort.Order.asc("id"));
        };
        var pageRes = productRepo.findAll(spec, PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 60), sort));
        Map<Long, Category> catById = catBySlug.values().stream().collect(Collectors.toMap(Category::getId, c -> c, (a, b) -> a));
        Set<Long> brandIds = pageRes.getContent().stream().map(Product::getBrandId).filter(Objects::nonNull).collect(Collectors.toSet());
        Map<Long, Brand> brandMap = brandIds.isEmpty() ? Map.of() : brandRepo.findAllById(brandIds).stream().collect(Collectors.toMap(Brand::getId, b -> b));
        Map<String, RetailerSource> srcMap = retailerRepo.findAll().stream()
            .collect(Collectors.toMap(s -> s.getCode().toUpperCase(), s -> s, (a, b) -> a));

        List<ProductDto> dtos = pageRes.getContent().stream()
            .map(p -> productService.toDto(p, catById.get(p.getCategoryId()), p.getBrandId() != null ? brandMap.get(p.getBrandId()) : null, false, srcMap))
            .toList();
        return new PageResponse<>(dtos, pageRes.getNumber(), pageRes.getSize(), pageRes.getTotalElements(), pageRes.getTotalPages());
    }

    private Specification<Product> buildCollectionSpec(Map<String, Object> fp, Map<String, Category> catBySlug, String countryCode) {
        Map<String, RetailerSource> srcMap = retailerRepo.findAll().stream()
            .collect(Collectors.toMap(s -> s.getCode().toUpperCase(), s -> s, (a, b) -> a));
        return (root, query, cb) -> {
            List<Predicate> list = new ArrayList<>();
            list.add(cb.isTrue(root.get("published")));
            list.add(cb.isTrue(root.get("approved")));
            list.add(cb.equal(root.get("imageStatus"), "VERIFIED"));
            list.add(cb.isNotNull(root.get("imageUrl")));
            list.add(cb.equal(cb.upper(root.get("countryCode")), countryCode));

            Object catsObj = fp.get("categories");
            if (catsObj instanceof List<?> catList && !catList.isEmpty()) {
                List<Long> catIds = catList.stream()
                    .map(c -> catBySlug.get(String.valueOf(c).trim().toLowerCase()))
                    .filter(Objects::nonNull)
                    .map(Category::getId)
                    .toList();
                if (!catIds.isEmpty()) {
                    list.add(root.get("categoryId").in(catIds));
                }
            }
            Object genderObj = fp.get("gender");
            if (genderObj != null && !String.valueOf(genderObj).isBlank()) {
                String g = String.valueOf(genderObj).trim().toUpperCase();
                if ("UNISEX".equals(g)) {
                    list.add(cb.upper(root.get("gender")).in("UNISEX", "GENDER_NEUTRAL"));
                } else {
                    list.add(cb.equal(cb.upper(root.get("gender")), g));
                }
            }
            Object kwsObj = fp.get("keywords");
            if (kwsObj instanceof List<?> kwList && !kwList.isEmpty()) {
                List<Predicate> kwOr = new ArrayList<>();
                for (Object k : kwList) {
                    String kw = String.valueOf(k).trim().toLowerCase();
                    if (kw.isEmpty()) continue;
                    String pat = "%" + kw + "%";
                    kwOr.add(cb.like(cb.lower(root.get("name")), pat));
                    kwOr.add(cb.like(cb.lower(root.get("description")), pat));
                    kwOr.add(cb.like(cb.lower(root.get("missionTags")), pat));
                    kwOr.add(cb.like(cb.lower(root.get("garmentType")), pat));
                }
                if (!kwOr.isEmpty()) list.add(cb.or(kwOr.toArray(new Predicate[0])));
            }
            Object stObj = fp.get("sourceTypes");
            if (stObj instanceof List<?> stList && !stList.isEmpty()) {
                Set<String> stSet = stList.stream().map(s -> String.valueOf(s).toUpperCase()).collect(Collectors.toSet());
                List<String> codes = srcMap.values().stream()
                    .filter(s -> s.getSourceType() != null && stSet.contains(s.getSourceType().toUpperCase()))
                    .map(s -> s.getCode().toUpperCase()).toList();
                if (!codes.isEmpty()) list.add(cb.upper(root.get("sourcePlatform")).in(codes));
            }
            Object minP = fp.get("minPrice");
            if (minP instanceof Number n) {
                list.add(cb.greaterThanOrEqualTo(root.get("price"), BigDecimal.valueOf(n.doubleValue())));
            }
            return cb.and(list.toArray(new Predicate[0]));
        };
    }

    private List<String> computeFeaturedBrands(List<Long> catIds, String countryCode) {
        if (catIds.isEmpty()) return List.of();
        List<Product> sample = productRepo.findAll((root, query, cb) -> cb.and(
            cb.isTrue(root.get("published")),
            cb.isTrue(root.get("approved")),
            root.get("categoryId").in(catIds),
            cb.equal(cb.upper(root.get("countryCode")), countryCode),
            cb.isNotNull(root.get("brandId"))
        ), PageRequest.of(0, 120)).getContent();

        Map<Long, Long> counts = sample.stream()
            .collect(Collectors.groupingBy(Product::getBrandId, Collectors.counting()));
        Map<Long, Brand> brandMap = counts.isEmpty() ? Map.of()
            : brandRepo.findAllById(counts.keySet()).stream().collect(Collectors.toMap(Brand::getId, b -> b));
        return counts.entrySet().stream()
            .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
            .map(e -> brandMap.get(e.getKey()))
            .filter(b -> b != null && b.getName() != null)
            .map(Brand::getName)
            .limit(12)
            .toList();
    }

    private String capitalizeSlug(String s) {
        return Arrays.stream(s.split("[-_]+"))
            .filter(p -> !p.isBlank())
            .map(p -> Character.toUpperCase(p.charAt(0)) + p.substring(1))
            .collect(Collectors.joining(" "));
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
