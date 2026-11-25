package com.missioncart.ai;

import com.missioncart.ai.AIModels.ParsedIntent;
import com.missioncart.ai.AIModels.RequirementSpec;
import com.missioncart.possessions.PossessionService;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class DeterministicFallbackEngine implements AIProvider {

    private final PossessionService possessionService;
    private final StructuredBudgetParser budgetParser;

    private record ConceptRule(
        List<String> triggers,
        String label,
        String categorySlug,
        List<String> keywords,
        String priority,
        String reason,
        List<String> excludeCategories,
        List<String> negativeKeywords
    ) {
        ConceptRule(List<String> triggers, String label, String categorySlug, List<String> keywords, String priority, String reason) {
            this(triggers, label, categorySlug, keywords, priority, reason, List.of(), List.of());
        }
    }

    private static final List<String> DAIRY_EXCLUDED_CATS = List.of("skincare", "beauty", "personal-care", "fashion", "home-decor");
    private static final List<String> DAIRY_NEGATIVE_KWS = List.of(
        "lotion", "body lotion", "shampoo", "cleanser", "hair", "soap", "serum",
        "lipstick", "lip balm", "mascara", "kajal", "conditioner", "face wash",
        "face cream", "night cream", "day cream", "hand cream", "cold cream", "body butter", "shea butter", "cocoa butter"
    );

    private static final List<ConceptRule> CONCEPT_RULES = List.of(
        // Dairy & Milk Products (strictly disambiguated from beauty/lotion/haircare items)
        new ConceptRule(
            List.of("milk product", "dairy", "toned milk", "full cream milk", "cow milk", "buffalo milk", "milk powder", "amul", "mother dairy", "milk"),
            "Milk & Dairy Beverages",
            "groceries",
            List.of("milk", "toned milk", "full cream milk", "milk powder", "dairy", "amul", "mother dairy"),
            "ESSENTIAL",
            "Dairy milk and milk-powder staples strictly from grocery/dairy listings",
            DAIRY_EXCLUDED_CATS,
            DAIRY_NEGATIVE_KWS
        ),
        new ConceptRule(
            List.of("milk product", "dairy", "curd", "yogurt", "yoghurt", "paneer", "dahi", "amul", "mother dairy"),
            "Curd, Yogurt & Paneer",
            "groceries",
            List.of("curd", "yogurt", "yoghurt", "paneer", "dahi", "lassi"),
            "ESSENTIAL",
            "Fresh cultured dairy, yogurt, and paneer essentials",
            DAIRY_EXCLUDED_CATS,
            DAIRY_NEGATIVE_KWS
        ),
        new ConceptRule(
            List.of("milk product", "dairy", "cheese", "ghee", "buttermilk", "butter", "amul", "mother dairy"),
            "Butter, Cheese & Ghee",
            "groceries",
            List.of("cheese", "butter", "ghee", "buttermilk", "paneer"),
            "ESSENTIAL",
            "Dairy spreads, cooking ghee, buttermilk, and cheese blocks",
            DAIRY_EXCLUDED_CATS,
            DAIRY_NEGATIVE_KWS
        ),

        // Beauty & Makeup & Grooming Precision Rules
        new ConceptRule(List.of("beauty", "makeup", "lipstick", "kajal", "mascara", "eyeliner", "foundation", "serum", "skincare"), "Curated Beauty & Skincare Essentials", "beauty", List.of("cream", "cleanser", "serum", "lip balm", "lipstick", "moisturizer", "sunscreen", "plum", "minimalist", "himalaya"), "ESSENTIAL", "Genuine beauty and skincare essentials filtered from clean beauty packshots"),

        // Luxury / Heritage Country Brands
        new ConceptRule(List.of("luxury bag", "luxury fashion", "designer bag", "chanel", "gucci", "dior", "louis vuitton", "hermes", "prada", "fendi"), "Luxury Designer Bags & Fashion", "fashion", List.of("chanel", "gucci", "dior", "louis vuitton", "hermes", "luxury", "handbag"), "ESSENTIAL", "Country-specific luxury fashion and leather goods sourced strictly from authorized datasets"),

        // Daily Skincare & Beauty
        new ConceptRule(List.of("lip balm", "lip care", "chapped lips"), "Lip Balm & Lip Care", "skincare", List.of("lip balm", "himalaya", "balm"), "ESSENTIAL", "Original-brand lip balm care for daily hydration"),
        new ConceptRule(List.of("himalaya"), "Himalaya Wellness Essentials", "skincare", List.of("himalaya", "lip balm", "neem", "face wash"), "ESSENTIAL", "Genuine Himalaya brand wellness and personal care listings"),
        new ConceptRule(List.of("cetaphil"), "Cetaphil Dermatologist Skincare", "skincare", List.of("cetaphil", "gentle skin cleanser", "cleanser"), "ESSENTIAL", "Genuine Cetaphil cleanser with official packshot"),
        new ConceptRule(List.of("vaseline"), "Vaseline Skin Protectant", "skincare", List.of("vaseline", "pure skin jelly", "jelly"), "ESSENTIAL", "Genuine Vaseline jelly tub in original packaging"),

        // All-Gender Fashion Precision Rules
        new ConceptRule(List.of("maxi dress", "floral dress", "midi dress", "women dress", "women's dress", "summer dress", "party dress"), "Women's Dress Collection", "fashion", List.of("dress", "maxi", "midi", "floral", "vero moda", "only"), "ESSENTIAL", "Tailored women's dress matching your style & silhouette request"),
        new ConceptRule(List.of("ethnic wear", "kurti", "kurta set", "anarkali", "lehenga", "saree", "salwar suit"), "Ethnic & Festive Apparel", "fashion", List.of("kurta", "kurti", "saree", "suit", "libas", "anarkali"), "ESSENTIAL", "Authentic Indian ethnic wear & wedding attire"),
        new ConceptRule(List.of("casual shirt", "men's shirt", "mens shirt", "formal shirt", "polo"), "Shirts & Polos", "fashion", List.of("shirt", "polo", "snitch", "us polo", "jack"), "ESSENTIAL", "Versatile men's and unisex shirts matched from official brand catalogs"),
        new ConceptRule(List.of("formal trouser", "chinos", "cargo pants", "joggers", "jeans"), "Trousers, Chinos & Denim", "fashion", List.of("trouser", "chino", "cargo", "jeans", "jogger"), "ESSENTIAL", "Tailored trousers, chinos, and denim bottoms"),
        new ConceptRule(List.of("oversized t-shirt", "oversized tee", "unisex", "hoodie", "sweatshirt", "streetwear"), "Streetwear, Oversized Tees & Hoodies", "fashion", List.of("oversized", "hoodie", "sweatshirt", "t-shirt", "snitch", "jack"), "ESSENTIAL", "All-gender relaxed streetwear & oversized essentials"),

        // Bedroom / House / Apartment / Hostel / Storage
        new ConceptRule(List.of("bedroom", "bedside", "small bedroom", "furniture", "decor", "house", "new house"), "Ambient Lighting & Lamp", "electronics", List.of("lamp", "desk lamp", "string lights", "candle"), "ESSENTIAL", "Recommended because your room setup benefits from warm focused lighting"),
        new ConceptRule(List.of("bedroom", "bedding", "bed", "hostel", "dorm", "house", "new house", "apartment"), "Cotton Bedding & Cushions", "home-decor", List.of("bedsheet", "cushion", "blanket", "throw"), "ESSENTIAL", "Core sleep and soft-furnishing essentials for a comfortable room"),
        new ConceptRule(List.of("bedroom", "small bedroom", "storage", "closet", "hostel", "apartment", "house", "organize"), "Space-Saving Storage & Organizers", "storage-organization", List.of("basket", "organizer", "hanger", "utility cart"), "ESSENTIAL", "Recommended because compact spaces require vertical and modular storage"),
        new ConceptRule(List.of("bedroom", "decor", "vase", "house", "apartment"), "Ceramic Vase & Accent Decor", "home-decor", List.of("vase", "candle", "cushion"), "OPTIONAL", "Adds warm editorial character without crowding floor space"),

        // Hostel & Living Essentials
        new ConceptRule(List.of("hostel", "dorm", "pg", "first month", "house", "new house", "apartment"), "Electric Kettle / Quick Brew", "kitchen", List.of("kettle", "electric kettle"), "ESSENTIAL", "Quick boiling for tea, coffee, and warm water in a new home or hostel"),
        new ConceptRule(List.of("hostel", "bath", "first month", "house", "travel", "manali", "trip"), "Bath Towels & Toiletry Organizer", "personal-care", List.of("towel", "toiletry", "pouch"), "ESSENTIAL", "Daily hygiene and bathroom essentials"),
        new ConceptRule(List.of("hostel", "desk", "study", "wfh", "remote", "electronics", "apartment", "house", "bedroom"), "Surge-Protected Power Strip", "electronics", List.of("power strip", "surge", "extension"), "ESSENTIAL", "Safe multi-outlet power distribution for chargers, lamps, and appliances"),

        // Study, Programming & Work From Home
        new ConceptRule(List.of("programming", "coding", "software", "developer", "laptop for"), "Laptop Computer (Core Device)", "electronics", List.of("programming laptop", "notebook computer", "macbook", "thinkpad"), "ESSENTIAL", "Primary computing hardware requested for programming"),
        new ConceptRule(List.of("study", "college", "desk", "wfh", "remote", "workspace", "productive", "programming"), "LED Study & Desk Lamp", "electronics", List.of("lamp", "desk lamp"), "ESSENTIAL", "Focused glare-free illumination for long desk sessions"),
        new ConceptRule(List.of("study", "laptop", "wfh", "remote", "workspace", "ergonomic", "programming"), "Laptop Stand, Desk Mat & USB-C Hub", "study-workspace", List.of("laptop stand", "usb", "hub", "desk mat"), "ESSENTIAL", "Ergonomic screen elevation and clean desk connectivity"),
        new ConceptRule(List.of("study", "notebook", "journal", "college", "planner", "workspace"), "Notebooks & Desk Organizer", "study-workspace", List.of("notebook", "organizer", "pen"), "ESSENTIAL", "Structured note-taking and clutter-free stationery organization"),
        new ConceptRule(List.of("study", "wfh", "remote", "focus", "office", "entertainment", "music", "headphones"), "Wireless Focus Headphones", "electronics", List.of("headphones", "wireless"), "OPTIONAL", "Blocks background distractions during calls, coding, or media"),
        new ConceptRule(List.of("study", "wfh", "desk", "mouse", "programming", "workspace"), "Wireless Ergonomic Mouse", "electronics", List.of("mouse", "wireless mouse"), "OPTIONAL", "Accurate wrist-friendly pointing device for desk setups"),

        // Home Entertainment
        new ConceptRule(List.of("entertainment", "home entertainment", "party", "speaker", "music", "movie"), "Portable Bluetooth Speaker", "electronics", List.of("speaker", "bluetooth speaker"), "ESSENTIAL", "Room-filling wireless audio for music, movies, and gatherings"),

        // Office / Wedding / Fashion / Gifting
        new ConceptRule(List.of("office", "job", "interview", "formal", "professional"), "Tailored Cotton Shirt & Blazer", "fashion", List.of("shirt", "blazer", "cotton shirt"), "ESSENTIAL", "Sharp workplace attire ready for your first office job"),
        new ConceptRule(List.of("office", "job", "footwear", "shoes", "wedding", "formal"), "Formal Loafers / Versatile Sneakers", "fashion", List.of("loafer", "sneakers"), "ESSENTIAL", "Comfortable all-day footwear matched to your setting"),
        new ConceptRule(List.of("office", "job", "laptop bag", "commute", "college"), "Commuter Laptop Backpack / Tote", "fashion", List.of("backpack", "tote"), "ESSENTIAL", "Padded protection for daily office commutes"),
        new ConceptRule(List.of("office", "wedding", "accessory", "watch", "gift", "best friend"), "Classic Watch / Eyewear / Jewellery", "fashion", List.of("watch", "sunglasses", "jewellery"), "OPTIONAL", "Refined everyday accessory or thoughtful birthday gift"),
        new ConceptRule(List.of("wedding", "festive", "ethnic", "shaadi", "sangeet", "ceremony"), "Festive Ethnic Outfit", "fashion", List.of("kurta", "ethnic", "silk"), "ESSENTIAL", "Occasion-appropriate festive attire"),
        new ConceptRule(List.of("wedding", "grooming", "office"), "Precision Grooming Trimmer", "electronics", List.of("trimmer", "clipper"), "OPTIONAL", "Clean grooming finish before workdays and events"),

        // Gift Shopping
        new ConceptRule(List.of("gift", "best friend", "present", "birthday gift"), "Curated Keepsake Gift (Candle / Mug / Watch)", "everyday-essentials", List.of("candle", "mug", "watch", "notebook", "vase"), "ESSENTIAL", "Thoughtful, lasting gift option tailored to daily enjoyment"),

        // Travel & Camping
        new ConceptRule(List.of("travel", "trip", "manali", "mountain", "vacation", "flight", "five-day", "5 day"), "Cabin Suitcase & Packing Cubes", "travel", List.of("suitcase", "packing cube", "backpack"), "ESSENTIAL", "Organized carry luggage suited for multi-day trips"),
        new ConceptRule(List.of("camping", "camp", "tent", "trek", "outdoor"), "Camping Tent & Sleeping Gear", "travel", List.of("camping tent", "sleeping bag", "lantern"), "ESSENTIAL", "Dedicated shelter and sleeping gear for outdoor camping"),
        new ConceptRule(List.of("manali", "cold", "winter", "hill", "camping", "trek"), "Packable Thermal Puffer Jacket", "fashion", List.of("puffer", "jacket", "winter"), "ESSENTIAL", "Insulated lightweight warmth for chilly evenings outdoors"),
        new ConceptRule(List.of("travel", "trip", "manali", "camping", "flight", "train", "charger"), "Power Bank & Universal Travel Adapter", "electronics", List.of("power bank", "adapter", "neck pillow"), "ESSENTIAL", "Reliable backup power and plug compatibility away from home"),
        new ConceptRule(List.of("travel", "trip", "manali", "camping", "outdoor", "fitness"), "Insulated Stainless Water Bottle", "kitchen", List.of("water bottle", "insulated"), "ESSENTIAL", "Keeps hydration cold or warm through transit and outdoor days"),

        // Skincare & Beauty
        new ConceptRule(List.of("skincare", "oily", "acne", "skin", "morning", "night", "routine", "face"), "Gentle Facial Cleanser", "skincare", List.of("cleanser", "salicylic"), "ESSENTIAL", "Step 1 gentle cleansing without stripping natural moisture"),
        new ConceptRule(List.of("skincare", "oily", "serum", "niacinamide", "routine", "vitamin c"), "Targeted Balancing Serum", "skincare", List.of("serum", "niacinamide", "vitamin c"), "ESSENTIAL", "Active treatment serum matched to your skin routine"),
        new ConceptRule(List.of("skincare", "moisturizer", "oily", "dry", "routine"), "Lightweight Gel Moisturizer", "skincare", List.of("moisturizer", "gel"), "ESSENTIAL", "Balanced hydration layer"),
        new ConceptRule(List.of("skincare", "sunscreen", "spf", "morning", "manali", "travel", "camping"), "Broad-Spectrum SPF 50 Sunscreen", "skincare", List.of("sunscreen", "spf"), "ESSENTIAL", "Daily broad-spectrum UV protection"),

        // Kitchen & Groceries
        new ConceptRule(List.of("kitchen", "cook", "apartment", "home", "house", "new house", "three people"), "Induction Cooktop & Frying Pan", "kitchen", List.of("induction", "frying pan", "cookware"), "ESSENTIAL", "Core cooking setup for daily meals"),
        new ConceptRule(List.of("kitchen", "storage", "apartment", "three people", "meal"), "Glass Food Containers & Dinner Plates", "kitchen", List.of("containers", "plates", "mug"), "ESSENTIAL", "Everyday dining tableware and airtight meal storage"),
        new ConceptRule(List.of("grocery", "groceries", "coffee", "tea", "breakfast", "pantry", "snacks", "house", "healthy grocery", "healthy shopping"), "Pantry Staples (Coffee, Tea & Oats)", "groceries", List.of("coffee", "tea", "oats", "trail mix"), "ESSENTIAL", "Wholesome breakfast and daily beverage pantry staples"),
        new ConceptRule(List.of("grocery", "groceries", "healthy grocery", "everyday use", "branded product", "original brand"), "Everyday Grocery Essentials", "groceries", List.of("oats", "coffee", "tea", "trail mix", "snack"), "ESSENTIAL", "Trusted branded grocery staples for daily use"),

        // Fitness
        new ConceptRule(List.of("fitness", "workout", "gym", "exercise", "yoga", "home workout"), "Non-Slip 6mm Yoga & Exercise Mat", "fitness", List.of("yoga mat", "mat"), "ESSENTIAL", "Cushioned floor grip for home workouts"),
        new ConceptRule(List.of("fitness", "workout", "gym", "strength", "dumbbell"), "Dumbbells, Resistance Bands & Jump Rope", "fitness", List.of("dumbbell", "resistance band", "jump rope"), "ESSENTIAL", "Versatile home strength and cardio training kit"),

        // Pet Essentials
        new ConceptRule(List.of("pet", "dog", "cat", "puppy", "kitten"), "Pet Food, Bowls & Care Accessories", "everyday-essentials", List.of("pet food", "dog bowl", "cat litter", "pet toy"), "ESSENTIAL", "Dedicated pet feeding and care supplies"),

        // Party / Events
        new ConceptRule(List.of("party", "birthday", "celebration", "decor", "guests", "30 people", "15 friends", "event"), "Warm String Lights & Scented Candles", "home-decor", List.of("string lights", "candle", "vase"), "ESSENTIAL", "Festive warm lighting and table centerpiece ambiance"),
        new ConceptRule(List.of("party", "birthday", "tableware", "snacks", "30 people", "15 friends"), "Serving Plates, Mugs & Party Snacks", "kitchen", List.of("plates", "mug", "trail mix", "coffee"), "ESSENTIAL", "Reusable tableware and crowd-friendly refreshments")
    );

    public DeterministicFallbackEngine(PossessionService possessionService, StructuredBudgetParser budgetParser) {
        this.possessionService = possessionService;
        this.budgetParser = budgetParser;
    }

    @Override
    public String providerName() {
        return "DETERMINISTIC_FALLBACK";
    }

    @Override
    public boolean isConfigured() {
        return true;
    }

    @Override
    public ParsedIntent parseMission(
        String prompt,
        BigDecimal explicitBudget,
        String timeframe,
        String alreadyOwn,
        List<String> preferences,
        String constraints
    ) {
        String lower = prompt == null ? "" : prompt.toLowerCase();
        String parsedCountry = detectCountry(lower);
        StructuredBudgetParser.ParsedBudget parsedBudget = budgetParser.parse(prompt, explicitBudget, defaultCurrencyFor(parsedCountry));
        BigDecimal extractedBudget = parsedBudget.maxPrice();

        String extractedTimeframe = (timeframe != null && !timeframe.isBlank()) ? timeframe : extractTimeframe(lower);
        int peopleCount = extractPeopleCount(lower);

        List<String> owned = new ArrayList<>();
        if (alreadyOwn != null && !alreadyOwn.isBlank()) {
            owned.addAll(possessionService.extractPossessionNames(alreadyOwn));
        }
        if (lower.contains("already") || lower.contains("do not recommend") || lower.contains("don't recommend") || lower.contains("exclude")) {
            owned.addAll(possessionService.extractPossessionNames(prompt));
        }
        owned = owned.stream().distinct().toList();

        List<RequirementSpec> matched = new ArrayList<>();
        Set<String> seenLabels = new HashSet<>();

        boolean isExplicitBeautyPrompt = lower.contains("body lotion") || lower.contains("shampoo")
            || lower.contains("hair cleanser") || lower.contains("face wash") || lower.contains("lip balm")
            || lower.contains("body butter") || lower.contains("shea butter") || lower.contains("peanut butter")
            || lower.contains("coconut milk");
        boolean hasExplicitDairyWord = lower.contains("milk product") || lower.contains("dairy")
            || lower.contains("paneer") || lower.contains("curd") || lower.contains("ghee")
            || lower.contains("cheese") || lower.contains("buttermilk") || lower.contains("yogurt")
            || lower.contains("amul") || lower.contains("mother dairy")
            || (lower.matches(".*\\bmilk\\b.*") && !isExplicitBeautyPrompt);

        for (ConceptRule rule : CONCEPT_RULES) {
            boolean isDairyRule = "groceries".equals(rule.categorySlug()) && !rule.negativeKeywords().isEmpty();
            if (isDairyRule && !hasExplicitDairyWord) {
                continue;
            }
            boolean hit = rule.triggers().stream().anyMatch(tr ->
                tr.length() <= 5 ? lower.matches(".*\\b" + Pattern.quote(tr) + "\\b.*") : lower.contains(tr)
            );
            if (hit && seenLabels.add(rule.label())) {
                int qty = determineQuantity(rule, peopleCount, lower);
                matched.add(new RequirementSpec(
                    rule.label(), rule.categorySlug(), rule.keywords(), rule.priority(), qty, rule.reason(),
                    rule.excludeCategories(), rule.negativeKeywords()
                ));
            }
        }

        // Universal catch-all for any arbitrary prompt not covered by specific concept triggers
        if (matched.isEmpty()) {
            List<String> tokens = extractContentKeywords(lower);
            matched.add(new RequirementSpec("Primary Purpose Match", null, tokens, "ESSENTIAL", 1, "Matched directly from your natural-language description"));
            if (tokens.size() > 1) {
                matched.add(new RequirementSpec("Supporting Essentials", null, tokens.subList(1, tokens.size()), "OPTIONAL", 1, "Complementary items matching your secondary keywords"));
            }
        }

        List<String> assumptions = new ArrayList<>();
        assumptions.add("All subtotals, shipping, taxes, and remaining budget are computed from database-stored INR product prices.");
        if (extractedBudget == null) {
            assumptions.add("No explicit budget ceiling was provided; showing best-value options across budget and balanced tiers.");
        }
        if (peopleCount > 1) {
            assumptions.add("Quantities for shared dining/living items scaled for " + peopleCount + " people.");
        }
        assumptions.add("Parsed via local deterministic rule engine (no paid external AI API key required).");

        String title = buildMissionTitle(prompt);
        String followUp = extractedBudget == null ? "Would you like to specify an INR budget ceiling so we can optimize this plan?" : null;

        Map<String, Object> ctx = new LinkedHashMap<>();
        ctx.put("engineMode", "Rule-Based Fallback Engine");
        ctx.put("peopleCount", peopleCount);
        ctx.put("countryCode", parsedCountry);
        ctx.put("budgetType", parsedBudget.budgetType().name());
        if (parsedBudget.minPrice() != null) ctx.put("minPrice", parsedBudget.minPrice());
        if (constraints != null && !constraints.isBlank()) ctx.put("constraints", constraints);

        if (parsedBudget.ambiguous() && followUp == null) {
            followUp = parsedBudget.clarificationQuestion();
        }

        return new ParsedIntent(
            title,
            prompt.trim(),
            "Structured plan tailored for: " + title + (peopleCount > 1 ? " (" + peopleCount + " people)" : ""),
            inferPurpose(lower),
            extractedBudget,
            parsedBudget.currency(),
            extractedTimeframe,
            peopleCount,
            owned,
            preferences != null ? preferences : List.of(),
            constraints != null && !constraints.isBlank() ? List.of(constraints) : List.of(),
            assumptions,
            matched,
            followUp,
            providerName(),
            ctx
        );
    }

    private String detectCountry(String lower) {
        if (lower.matches(".*\\b(france|paris)\\b.*")) return "FR";
        if (lower.matches(".*\\b(italy|milan)\\b.*")) return "IT";
        if (lower.matches(".*\\b(united kingdom|london)\\b.*")) return "GB";
        if (lower.matches(".*\\b(usa|united states)\\b.*")) return "US";
        if (lower.matches(".*\\b(germany)\\b.*")) return "DE";
        if (lower.matches(".*\\b(uae|dubai)\\b.*")) return "AE";
        if (lower.matches(".*\\b(japan)\\b.*")) return "JP";
        if (lower.matches(".*\\b(singapore)\\b.*")) return "SG";
        return "IN";
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

    private BigDecimal extractBudget(String text) {
        if (text == null) return null;
        Matcher kMatcher = Pattern.compile("(?:₹|rs\\.?|inr)?\\s*(\\d+(?:\\.\\d+)?)\\s*k\\b", Pattern.CASE_INSENSITIVE).matcher(text);
        if (kMatcher.find()) {
            return BigDecimal.valueOf(Double.parseDouble(kMatcher.group(1)) * 1000.0);
        }
        Matcher m = Pattern.compile("(?:₹|rs\\.?|inr|budget|under|within)\\s*[:\\-]?\\s*([0-9][0-9,]{2,7})", Pattern.CASE_INSENSITIVE).matcher(text);
        if (m.find()) {
            try { return new BigDecimal(m.group(1).replace(",", "")); } catch (Exception ignored) {}
        }
        return null;
    }

    private String extractTimeframe(String lower) {
        Matcher m = Pattern.compile("(\\d+|one|two|three|four|five|six|seven|ten|first)[-\\s]+(day|days|week|weeks|month|months)", Pattern.CASE_INSENSITIVE).matcher(lower);
        if (m.find()) return m.group(0);
        return "Flexible";
    }

    private int extractPeopleCount(String lower) {
        if (lower.contains("two friends")) return 2;
        if (lower.contains("three people") || lower.contains("three roommates")) return 3;
        Matcher m = Pattern.compile("(\\d+)\\s+(?:friends|people|guests|roommates|members|persons)").matcher(lower);
        if (m.find()) return Math.min(50, Math.max(1, Integer.parseInt(m.group(1))));
        return 1;
    }

    private int determineQuantity(ConceptRule rule, int peopleCount, String lower) {
        if (peopleCount > 1 && ("kitchen".equals(rule.categorySlug()) || "home-decor".equals(rule.categorySlug()))
            && (lower.contains("party") || lower.contains("guests") || lower.contains("three people"))) {
            return Math.min(8, Math.max(1, (int) Math.ceil(peopleCount / 4.0)));
        }
        return 1;
    }

    private List<String> extractContentKeywords(String lower) {
        Set<String> stop = Set.of("i", "am", "im", "i'm", "need", "want", "for", "with", "within", "and", "the", "a", "an", "to", "my", "of", "in", "on", "budget", "setup", "looking", "help", "me", "some", "get", "buy", "suitable", "good", "best", "value", "options", "compare", "different", "recommend", "already", "own", "not");
        return Arrays.stream(lower.replaceAll("[^a-z0-9\\s]", " ").split("\\s+"))
            .filter(w -> w.length() >= 3 && !stop.contains(w))
            .distinct()
            .limit(10)
            .toList();
    }

    private String inferPurpose(String lower) {
        if (lower.contains("milk product") || lower.contains("dairy") || lower.contains("paneer") || lower.contains("curd") || lower.contains("ghee") || lower.contains("butter")) return "Dairy & Grocery";
        if (lower.contains("bedroom") || lower.contains("house") || lower.contains("hostel") || lower.contains("apartment")) return "Home & Living Setup";
        if (lower.contains("study") || lower.contains("programming") || lower.contains("wfh") || lower.contains("workspace")) return "Work, Study & Tech";
        if (lower.contains("office") || lower.contains("job") || lower.contains("wedding") || lower.contains("fashion")) return "Style & Occasion";
        if (lower.contains("skincare") || lower.contains("skin")) return "Self-Care & Skincare";
        if (lower.contains("travel") || lower.contains("manali") || lower.contains("camping") || lower.contains("trip")) return "Travel & Outdoors";
        if (lower.contains("fitness") || lower.contains("gym") || lower.contains("workout")) return "Fitness & Wellness";
        if (lower.contains("party") || lower.contains("birthday") || lower.contains("gift")) return "Events & Gifting";
        if (lower.contains("kitchen") || lower.contains("grocery") || lower.contains("groceries")) return "Kitchen & Pantry";
        if (lower.contains("pet")) return "Pet Care";
        if (lower.contains("storage")) return "Storage & Organization";
        return "Custom Purpose Plan";
    }

    private String buildMissionTitle(String prompt) {
        String clean = prompt == null ? "Custom Shopping Mission" : prompt.trim();
        if (clean.length() <= 54) return clean;
        return clean.substring(0, 51).trim() + "...";
    }
}
