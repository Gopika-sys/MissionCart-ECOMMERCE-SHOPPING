package com.missioncart.ai;

import com.missioncart.ai.StructuredBudgetParser.BudgetType;
import com.missioncart.ai.StructuredBudgetParser.ParsedBudget;
import com.missioncart.categories.EditorialCategoryService;
import com.missioncart.categories.EditorialCategoryService.EditorialCategoryPageDto;
import com.missioncart.databoutique.DataBoutiqueService;
import com.missioncart.missions.MissionDtos.MissionDetailDto;
import com.missioncart.missions.MissionDtos.PlanMissionRequest;
import com.missioncart.missions.MissionService;
import com.missioncart.products.ProductDtos.ProductDto;
import com.missioncart.products.ProductService;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.*;

@Service
public class SmartSearchService {

    public enum SearchIntentType {
        CATEGORY_SEARCH,
        BUDGET_FILTERED_CATEGORY,
        DIRECT_PRODUCT_SEARCH,
        COMPARISON_SEARCH,
        BRAND_COUNTRY_SEARCH,
        PURPOSE_MISSION
    }

    public record SmartSearchResponse(
        SearchIntentType intentType,
        String rawQuery,
        String resolvedCountryCode,
        String targetCategorySlug,
        String targetFilterUrl,
        ParsedBudget parsedBudget,
        boolean datasetPending,
        String explanation,
        List<String> unmatchedNotes,
        EditorialCategoryPageDto categoryPreview,
        List<ProductDto> matchedProducts,
        MissionDetailDto missionPlan
    ) {}

    private static final Map<String, String> CATEGORY_EXACT_TRIGGERS = Map.ofEntries(
        Map.entry("fashion", "fashion"),
        Map.entry("clothing", "fashion"),
        Map.entry("apparel", "fashion"),
        Map.entry("beauty", "beauty"),
        Map.entry("skincare", "beauty"),
        Map.entry("makeup", "beauty"),
        Map.entry("home", "home-living"),
        Map.entry("home and living", "home-living"),
        Map.entry("home & living", "home-living"),
        Map.entry("home decor", "home-living"),
        Map.entry("bedroom decoration", "home-living"),
        Map.entry("electronics", "electronics"),
        Map.entry("gadgets", "electronics"),
        Map.entry("grocery", "grocery"),
        Map.entry("groceries", "grocery"),
        Map.entry("food", "grocery"),
        Map.entry("travel", "travel"),
        Map.entry("fitness", "fitness"),
        Map.entry("workout", "fitness"),
        Map.entry("study", "study-workspace"),
        Map.entry("workspace", "study-workspace")
    );

    private static final Map<String, String> COUNTRY_KEYWORDS = Map.ofEntries(
        Map.entry("france", "FR"),
        Map.entry("paris", "FR"),
        Map.entry("italy", "IT"),
        Map.entry("milan", "IT"),
        Map.entry("united kingdom", "GB"),
        Map.entry("london", "GB"),
        Map.entry("usa", "US"),
        Map.entry("united states", "US"),
        Map.entry("germany", "DE"),
        Map.entry("dubai", "AE"),
        Map.entry("uae", "AE"),
        Map.entry("japan", "JP"),
        Map.entry("singapore", "SG"),
        Map.entry("india", "IN")
    );

    private final StructuredBudgetParser budgetParser;
    private final ProductService productService;
    private final EditorialCategoryService editorialService;
    private final MissionService missionService;

    public SmartSearchService(
        StructuredBudgetParser budgetParser,
        ProductService productService,
        EditorialCategoryService editorialService,
        MissionService missionService
    ) {
        this.budgetParser = budgetParser;
        this.productService = productService;
        this.editorialService = editorialService;
        this.missionService = missionService;
    }

    public SmartSearchResponse handleSearch(Long userId, String rawQuery, String activeCountryCode, BigDecimal explicitBudget) {
        String clean = rawQuery == null ? "" : rawQuery.trim();
        String lower = clean.toLowerCase(Locale.ROOT);
        String resolvedCountry = detectCountry(lower, activeCountryCode);
        ParsedBudget parsedBudget = budgetParser.parse(clean, explicitBudget, defaultCurrencyFor(resolvedCountry));

        // 1. Luxury / Brand + Country intent (e.g., "Show me original Chanel bags available in France", "Original luxury bags in France")
        String luxurySourceCode = DataBoutiqueService.mapSourceCodeFromWebsite(clean);
        boolean mentionsLuxury = lower.contains("luxury bag") || lower.contains("luxury fashion") || lower.contains("designer bag") || luxurySourceCode != null;
        if (mentionsLuxury || (detectExplicitCountry(lower) != null && !resolvedCountry.equals("IN"))) {
            String luxBrandName = luxurySourceCode != null ? luxurySourceCode.replace("_", " ") : "luxury";
            String qTerms = lower.contains("bag") ? "bag" : null;
            var res = productService.searchProducts(
                qTerms, null, luxurySourceCode, null, null, null,
                parsedBudget.minPrice(), parsedBudget.maxPrice(), null, false, false,
                null, null, null, null, null, null, null, null, null,
                resolvedCountry, "relevance", 0, 12
            );
            boolean pending = res.items().isEmpty();
            String msg = pending
                ? "Dataset Pending for " + resolvedCountry + ": No authorized " + luxBrandName + " records have been imported for country " + resolvedCountry + " yet. Import a Data Boutique dataset or ZIP catalogue for " + resolvedCountry + " in Admin -> Catalog Importer."
                : "Found " + res.totalElements() + " verified listing(s) in " + resolvedCountry + ".";
            return new SmartSearchResponse(
                SearchIntentType.BRAND_COUNTRY_SEARCH,
                clean, resolvedCountry, "fashion",
                "/categories/fashion?country=" + resolvedCountry + (luxurySourceCode != null ? "&source=" + luxurySourceCode : ""),
                parsedBudget, pending, msg,
                pending ? List.of("Authorized " + resolvedCountry + " dataset not yet imported") : List.of(),
                null, res.items(), null
            );
        }

        // 2. Exact Single Category Search (e.g., "Beauty", "Fashion", "Electronics", "Bedroom decoration")
        String bare = lower.replaceAll("[^a-z& ]", " ").replaceAll("\\s+", " ").trim();
        if (parsedBudget.maxPrice() == null && CATEGORY_EXACT_TRIGGERS.containsKey(bare)) {
            String targetSlug = CATEGORY_EXACT_TRIGGERS.get(bare);
            EditorialCategoryPageDto editorial = editorialService.getEditorialCategory(targetSlug, resolvedCountry);
            var previewItems = productService.searchProducts(
                null, String.join(",", editorial.resolvedCategorySlugs()), null, null, null, null,
                null, null, null, true, false,
                null, null, null, null, null, null, null, null, null,
                resolvedCountry, "relevance", 0, 12
            );
            return new SmartSearchResponse(
                SearchIntentType.CATEGORY_SEARCH,
                clean, resolvedCountry, targetSlug, "/categories/" + targetSlug,
                parsedBudget, editorial.totalProductsInCountry() == 0,
                "Recognized category \"" + editorial.name() + "\" with " + editorial.collections().size() + " curated editorial collections.",
                List.of(), editorial, previewItems.items(), null
            );
        }

        // 3. Comparison Search (e.g., "Compare the best three moisturizers")
        if (lower.startsWith("compare") || lower.contains("best three") || lower.contains("top 3") || lower.contains("compare ")) {
            String searchTerms = clean.replaceAll("(?i)\\b(compare|the|best|three|top|3|between|options)\\b", " ").trim();
            var res = productService.searchProducts(
                searchTerms, null, null, null, null, null,
                parsedBudget.minPrice(), parsedBudget.maxPrice(), null, true, false,
                null, null, null, null, null, null, null, null, null,
                resolvedCountry, "rating_desc", 0, 6
            );
            return new SmartSearchResponse(
                SearchIntentType.COMPARISON_SEARCH,
                clean, resolvedCountry, null, "/products?q=" + searchTerms,
                parsedBudget, res.items().isEmpty(),
                res.items().isEmpty() ? "No verified listings matched comparison query \"" + searchTerms + "\"." : "Comparing " + res.items().size() + " verified catalogue matches.",
                res.items().isEmpty() ? List.of(searchTerms) : List.of(),
                null, res.items(), null
            );
        }

        // 4. Budget-Filtered Category Search (e.g. "Beauty products under ₹1,000", "Milk products under ₹1,000", "Women's dresses under ₹3,000", "Men's formal clothing under ₹5,000", "Unisex fashion under ₹2,000", "Laptop under ₹60,000")
        boolean isMissionPhrase = lower.contains("routine") || lower.contains("setup") || lower.contains("moving")
            || lower.contains("trip") || lower.contains("manali") || lower.contains("party")
            || lower.contains("wedding") || lower.contains("three people") || lower.contains("first office")
            || lower.contains("complete ");

        if (!isMissionPhrase && (parsedBudget.maxPrice() != null || isFilteredCatalogPhrase(lower))) {
            String targetSlug = inferCategorySlug(lower);
            String categoryCsv = targetSlug != null ? String.join(",", editorialService.resolveCategorySlugs(targetSlug)) : null;
            String gender = inferGender(lower);
            String itemQuery = extractItemSearchToken(lower);

            var res = productService.searchProducts(
                itemQuery, categoryCsv, null, null, null, null,
                parsedBudget.minPrice(), parsedBudget.maxPrice(), null, true, false,
                gender, null, lower.contains("formal") ? "Formal" : null, null, null, null, null, null, null,
                resolvedCountry, "relevance", 0, 24
            );
            // Strictly reject dairy lotion/shampoo pollution in dairy queries
            List<ProductDto> filtered = filterDisambiguated(lower, res.items());
            boolean noData = filtered.isEmpty();

            return new SmartSearchResponse(
                SearchIntentType.BUDGET_FILTERED_CATEGORY,
                clean, resolvedCountry, targetSlug,
                buildProductsUrl(targetSlug, gender, itemQuery, parsedBudget, resolvedCountry),
                parsedBudget, noData,
                noData
                    ? "No verified items matched \"" + clean + "\" in " + resolvedCountry + (parsedBudget.maxPrice() != null ? " within " + parsedBudget.currency() + " " + parsedBudget.maxPrice().toPlainString() : "") + "."
                    : "Found " + filtered.size() + " verified matching products strictly within your filter & budget.",
                noData ? List.of(clean) : List.of(),
                targetSlug != null ? editorialService.getEditorialCategory(targetSlug, resolvedCountry) : null,
                filtered, null
            );
        }

        // 5. Short direct product / brand lookup without mission intent (e.g., "Himalaya Lip Balm", "Cetaphil Cleanser")
        if (clean.split("\\s+").length <= 4 && !isMissionPhrase && parsedBudget.maxPrice() == null) {
            var direct = productService.searchProducts(
                clean, null, null, null, null, null,
                null, null, null, true, false,
                null, null, null, null, null, null, null, null, null,
                resolvedCountry, "relevance", 0, 12
            );
            if (!direct.items().isEmpty()) {
                return new SmartSearchResponse(
                    SearchIntentType.DIRECT_PRODUCT_SEARCH,
                    clean, resolvedCountry, direct.items().get(0).categorySlug(),
                    "/products?q=" + clean + "&country=" + resolvedCountry,
                    parsedBudget, false,
                    "Direct catalogue match for \"" + clean + "\".",
                    List.of(), null, direct.items(), null
                );
            }
        }

        // 6. Purpose-Based Shopping Mission (fallback & multi-item bundles e.g. "I need a complete skincare routine with ₹2,000", "Kitchen essentials for three people")
        MissionDetailDto mission = missionService.planMission(
            userId,
            new PlanMissionRequest(clean, parsedBudget.maxPrice(), null, resolvedCountry, null, List.of(), null)
        );
        return new SmartSearchResponse(
            SearchIntentType.PURPOSE_MISSION,
            clean, resolvedCountry, inferCategorySlug(lower),
            "/mission-result/" + mission.id(),
            parsedBudget, false,
            mission.aiExplanation(),
            mission.unmatchedRequirements(),
            null,
            mission.items().stream().map(mi -> mi.product()).filter(Objects::nonNull).toList(),
            mission
        );
    }

    private List<ProductDto> filterDisambiguated(String lower, List<ProductDto> items) {
        if (lower.contains("milk product") || lower.contains("dairy") || lower.matches(".*\\bmilk\\b.*")) {
            List<String> neg = List.of("lotion", "shampoo", "cleanser", "soap", "face wash", "hair", "body butter", "coconut milk", "almond milk body", "cream");
            return items.stream().filter(p -> {
                String txt = (p.name() + " " + p.description()).toLowerCase();
                return neg.stream().noneMatch(txt::contains);
            }).toList();
        }
        return items;
    }

    private boolean isFilteredCatalogPhrase(String lower) {
        return lower.contains("women's") || lower.contains("womens") || lower.contains("men's") || lower.contains("mens")
            || lower.contains("unisex") || lower.contains("milk product") || lower.contains("dairy")
            || lower.contains("dress") || lower.contains("clothing") || lower.contains("formal");
    }

    private String inferCategorySlug(String lower) {
        if (lower.contains("milk product") || lower.contains("dairy") || lower.contains("paneer") || lower.contains("ghee") || lower.contains("grocery") || lower.contains("groceries")) return "grocery";
        if (lower.contains("beauty") || lower.contains("skincare") || lower.contains("moisturizer") || lower.contains("cleanser") || lower.contains("lip balm")) return "beauty";
        if (lower.contains("dress") || lower.contains("fashion") || lower.contains("shirt") || lower.contains("t-shirt") || lower.contains("clothing") || lower.contains("kurta") || lower.contains("saree")) return "fashion";
        if (lower.contains("laptop") || lower.contains("headphone") || lower.contains("speaker") || lower.contains("electronics")) return "electronics";
        if (lower.contains("bedroom") || lower.contains("decor") || lower.contains("kitchen") || lower.contains("home")) return "home-living";
        if (lower.contains("travel") || lower.contains("luggage")) return "travel";
        if (lower.contains("fitness") || lower.contains("gym") || lower.contains("yoga")) return "fitness";
        if (lower.contains("study") || lower.contains("workspace") || lower.contains("desk")) return "study-workspace";
        return null;
    }

    private String inferGender(String lower) {
        if (lower.contains("women's") || lower.contains("womens") || lower.contains("women") || lower.contains("dress") || lower.contains("saree") || lower.contains("kurti")) return "WOMEN";
        if (lower.contains("men's") || lower.contains("mens") || lower.matches(".*\\bmen\\b.*")) return "MEN";
        if (lower.contains("unisex") || lower.contains("gender neutral") || lower.contains("oversized")) return "UNISEX";
        return null;
    }

    private String extractItemSearchToken(String lower) {
        if (lower.contains("milk product") || lower.contains("dairy")) return "milk";
        if (lower.contains("dress")) return "dress";
        if (lower.contains("laptop")) return "laptop";
        if (lower.contains("formal")) return "shirt";
        if (lower.contains("t-shirt")) return "t-shirt";
        return null;
    }

    private String detectExplicitCountry(String lower) {
        for (Map.Entry<String, String> e : COUNTRY_KEYWORDS.entrySet()) {
            if (lower.matches(".*\\b" + e.getKey() + "\\b.*")) return e.getValue();
        }
        return null;
    }

    private String detectCountry(String lower, String fallback) {
        String exp = detectExplicitCountry(lower);
        if (exp != null) return exp;
        return (fallback != null && !fallback.isBlank()) ? fallback.trim().toUpperCase() : "IN";
    }

    private String defaultCurrencyFor(String cc) {
        return switch (cc) {
            case "FR", "IT", "DE" -> "EUR";
            case "GB" -> "GBP";
            case "US" -> "USD";
            case "AE" -> "AED";
            case "SG" -> "SGD";
            case "JP" -> "JPY";
            default -> "INR";
        };
    }

    private String buildProductsUrl(String slug, String gender, String q, ParsedBudget b, String cc) {
        StringBuilder sb = new StringBuilder(slug != null ? "/categories/" + slug : "/products");
        List<String> ps = new ArrayList<>();
        if (gender != null) ps.add("gender=" + gender);
        if (q != null) ps.add("q=" + q);
        if (b.maxPrice() != null) ps.add("maxPrice=" + b.maxPrice().toPlainString());
        if (b.minPrice() != null) ps.add("minPrice=" + b.minPrice().toPlainString());
        if (cc != null) ps.add("country=" + cc);
        return ps.isEmpty() ? sb.toString() : sb + "?" + String.join("&", ps);
    }
}
