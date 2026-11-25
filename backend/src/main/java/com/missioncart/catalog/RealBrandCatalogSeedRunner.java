package com.missioncart.catalog;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.missioncart.categories.Brand;
import com.missioncart.categories.BrandRepository;
import com.missioncart.categories.Category;
import com.missioncart.categories.CategoryRepository;
import com.missioncart.products.Product;
import com.missioncart.products.ProductRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import java.util.zip.GZIPInputStream;

@Component
@Order(15)
public class RealBrandCatalogSeedRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(RealBrandCatalogSeedRunner.class);

    private final ProductRepository productRepo;
    private final CategoryRepository categoryRepo;
    private final BrandRepository brandRepo;
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public RealBrandCatalogSeedRunner(
        ProductRepository productRepo,
        CategoryRepository categoryRepo,
        BrandRepository brandRepo,
        JdbcTemplate jdbcTemplate,
        ObjectMapper objectMapper
    ) {
        this.productRepo = productRepo;
        this.categoryRepo = categoryRepo;
        this.brandRepo = brandRepo;
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        ClassPathResource res = new ClassPathResource("db/real_brands_catalog_seed.jsonl.gz");
        if (!res.exists()) {
            log.info("real_brands_catalog_seed.jsonl.gz not found; skipping real brand seed.");
            return;
        }

        // Skip cleanly if real-brand + Amazon India products already seeded
        long alreadySeeded = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM products WHERE sku LIKE 'BRAND-%' OR sku LIKE 'AMZIN-%'", Long.class
        );
        if (alreadySeeded >= 2500) {
            return;
        }

        Map<String, Long> categoryMap = new HashMap<>();
        for (Category c : categoryRepo.findAll()) {
            categoryMap.put(c.getSlug().toLowerCase(), c.getId());
        }
        Long fashionCatId = categoryMap.getOrDefault("fashion", categoryMap.values().stream().findFirst().orElse(1L));

        Map<String, Long> brandMap = new HashMap<>();
        Set<String> brandSlugs = new HashSet<>();
        for (Brand b : brandRepo.findAll()) {
            brandMap.put(b.getName().toLowerCase(), b.getId());
            brandSlugs.add(b.getSlug().toLowerCase());
        }

        Set<String> existingSkus = new HashSet<>(jdbcTemplate.queryForList("SELECT UPPER(sku) FROM products", String.class));
        Set<String> existingVarSkus = new HashSet<>(jdbcTemplate.queryForList("SELECT UPPER(variant_sku) FROM product_variants", String.class));

        List<JsonNode> pendingRows = new ArrayList<>(750);
        try (BufferedReader br = new BufferedReader(new InputStreamReader(new GZIPInputStream(res.getInputStream()), StandardCharsets.UTF_8))) {
            String line;
            while ((line = br.readLine()) != null) {
                if (line.isBlank()) continue;
                JsonNode node = objectMapper.readTree(line);
                String sku = node.path("sku").asText("").trim().toUpperCase();
                if (sku.isEmpty() || existingSkus.contains(sku)) continue;
                existingSkus.add(sku);
                pendingRows.add(node);
            }
        }

        if (pendingRows.isEmpty()) return;

        List<Brand> newBrands = new ArrayList<>();
        for (JsonNode n : pendingRows) {
            String bName = n.path("brand").asText("").trim();
            if (bName.isEmpty()) continue;
            String bKey = bName.toLowerCase();
            if (!brandMap.containsKey(bKey)) {
                String slug = bKey.replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
                while (brandSlugs.contains(slug)) slug = slug + "-" + (newBrands.size() + 1);
                brandSlugs.add(slug);
                Brand nb = new Brand();
                nb.setName(bName.length() > 115 ? bName.substring(0, 115) : bName);
                nb.setSlug(slug.length() > 115 ? slug.substring(0, 115) : slug);
                nb.setCountry("India");
                nb.setVerified(true);
                newBrands.add(nb);
                brandMap.put(bKey, -1L);
            }
        }
        if (!newBrands.isEmpty()) {
            brandRepo.saveAll(newBrands);
            brandMap.clear();
            for (Brand b : brandRepo.findAll()) brandMap.put(b.getName().toLowerCase(), b.getId());
        }

        String insertProductSql = """
            INSERT INTO products (
                sku, name, slug, brand_id, category_id, source_platform, source_product_id, source_url,
                product_type, description, price, original_price, currency, price_verified, price_status,
                price_last_verified_at, availability_verified_at, availability_status, stock_quantity,
                rating_verified, data_verification_status, specifications_json, attributes_json, mission_tags,
                priority_tier, lifecycle_options_json, image_url, image_source, image_attribution,
                image_license, image_status, image_type, image_verified_at,
                gender, garment_type, occasion, material, fit, sleeve_length, pattern, care_instructions, size_chart_json,
                is_published, is_approved, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """;

        Timestamp now = Timestamp.from(Instant.now());
        int batchSize = 200;
        for (int i = 0; i < pendingRows.size(); i += batchSize) {
            List<JsonNode> chunk = pendingRows.subList(i, Math.min(i + batchSize, pendingRows.size()));
            jdbcTemplate.batchUpdate(insertProductSql, chunk, chunk.size(), (ps, n) -> {
                String sku = n.path("sku").asText().trim().toUpperCase();
                String name = n.path("name").asText().trim();
                if (name.length() > 250) name = name.substring(0, 250);
                String slugBase = name.toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
                String skuPart = sku.toLowerCase().replaceAll("[^a-z0-9]", "");
                String slug = (slugBase.length() > 160 ? slugBase.substring(0, 160) : slugBase) + "-" + skuPart;

                String bName = n.path("brand").asText("").trim().toLowerCase();
                Long brandId = brandMap.get(bName);
                Long catId = categoryMap.getOrDefault(n.path("categorySlug").asText("fashion").toLowerCase(), fashionCatId);

                BigDecimal price = n.path("price").isNumber() ? n.path("price").decimalValue() : null;
                BigDecimal orig = n.path("originalPrice").isNumber() ? n.path("originalPrice").decimalValue() : null;

                Map<String, Object> specsMap = new LinkedHashMap<>();
                if (!n.path("gender").asText("").isBlank()) specsMap.put("gender", n.path("gender").asText());
                if (!n.path("garmentType").asText("").isBlank()) specsMap.put("type", n.path("garmentType").asText());
                if (!n.path("material").asText("").isBlank()) specsMap.put("material", n.path("material").asText());
                if (!n.path("fit").asText("").isBlank()) specsMap.put("fit", n.path("fit").asText());
                if (!n.path("occasion").asText("").isBlank()) specsMap.put("occasion", n.path("occasion").asText());
                String specsJson;
                try { specsJson = objectMapper.writeValueAsString(specsMap); } catch (Exception e) { specsJson = "{}"; }
                String sizeChartJson = n.hasNonNull("sizeChart") && !n.path("sizeChart").isNull() ? n.path("sizeChart").toString() : null;

                ps.setString(1, sku);
                ps.setString(2, name);
                ps.setString(3, slug);
                if (brandId != null && brandId > 0) ps.setLong(4, brandId); else ps.setNull(4, java.sql.Types.BIGINT);
                ps.setLong(5, catId);
                ps.setString(6, n.path("sourcePlatform").asText("MYNTRA"));
                ps.setString(7, n.path("sourceProductId").asText(sku));
                ps.setString(8, n.path("sourceUrl").asText(null));
                ps.setString(9, "EXTERNAL_CATALOG");
                ps.setString(10, n.path("description").asText(name));
                if (price != null) ps.setBigDecimal(11, price); else ps.setNull(11, java.sql.Types.DECIMAL);
                if (orig != null) ps.setBigDecimal(12, orig); else ps.setNull(12, java.sql.Types.DECIMAL);
                ps.setString(13, "INR");
                ps.setBoolean(14, n.path("priceVerified").asBoolean(true));
                ps.setString(15, n.path("priceStatus").asText("VERIFIED"));
                ps.setTimestamp(16, now);
                ps.setTimestamp(17, now);
                ps.setString(18, n.path("availabilityStatus").asText("IN_STOCK"));
                ps.setInt(19, n.path("stockQuantity").asInt(12));
                ps.setBoolean(20, false);
                ps.setString(21, "OFFICIAL_BRAND_CATALOG_VERIFIED");
                ps.setString(22, specsJson);
                ps.setString(23, specsJson);
                ps.setString(24, n.path("missionTags").asText("fashion"));
                ps.setString(25, n.path("priorityTier").asText("BALANCED"));
                ps.setString(26, "[\"EXCHANGE\"]");
                ps.setString(27, n.path("imageUrl").asText());
                ps.setString(28, n.path("imageSource").asText("Official Brand Catalog"));
                ps.setString(29, n.path("imageAttribution").asText("Official Brand Product Media"));
                ps.setString(30, n.path("imageLicense").asText("Official Brand Product Listing"));
                ps.setString(31, "VERIFIED");
                ps.setString(32, n.path("imageType").asText("MAIN_PACKSHOT"));
                ps.setTimestamp(33, now);
                ps.setString(34, n.path("gender").isTextual() ? n.path("gender").asText() : null);
                ps.setString(35, n.path("garmentType").isTextual() ? n.path("garmentType").asText() : null);
                ps.setString(36, n.path("occasion").isTextual() ? n.path("occasion").asText() : null);
                ps.setString(37, n.path("material").isTextual() ? n.path("material").asText() : null);
                ps.setString(38, n.path("fit").isTextual() ? n.path("fit").asText() : null);
                ps.setString(39, n.path("sleeveLength").isTextual() ? n.path("sleeveLength").asText() : null);
                ps.setString(40, n.path("pattern").isTextual() ? n.path("pattern").asText() : null);
                ps.setString(41, n.path("careInstructions").isTextual() ? n.path("careInstructions").asText() : null);
                ps.setString(42, sizeChartJson);
                ps.setBoolean(43, true);
                ps.setBoolean(44, true);
                ps.setTimestamp(45, now);
                ps.setTimestamp(46, now);
            });
        }

        // Load IDs for newly seeded SKUs to insert multi-angle gallery images and variants
        Map<String, Long> skuToId = new HashMap<>();
        for (Product p : productRepo.findAll()) {
            skuToId.put(p.getSku().toUpperCase(), p.getId());
        }

        String insertImgSql = """
            INSERT INTO product_images (
                product_id, image_url, image_source, image_attribution, image_license,
                image_status, image_type, source_url, image_verified_at, image_alt_text, is_primary, sort_order, created_at
            ) VALUES (?, ?, ?, ?, ?, 'VERIFIED', ?, ?, ?, ?, ?, ?, ?)
            """;

        String insertVarSql = """
            INSERT INTO product_variants (
                product_id, variant_sku, size, color, color_hex, variant_name, price, original_price,
                stock_quantity, availability_status, image_url, is_default, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """;

        List<Object[]> imgArgs = new ArrayList<>();
        List<Object[]> varArgs = new ArrayList<>();

        for (JsonNode n : pendingRows) {
            String sku = n.path("sku").asText("").trim().toUpperCase();
            Long pid = skuToId.get(sku);
            if (pid == null) continue;

            String pName = n.path("name").asText("Product");
            String imgSrc = n.path("imageSource").asText("Official Brand Catalog");
            String imgAttr = n.path("imageAttribution").asText("Official Brand");
            String imgLic = n.path("imageLicense").asText("Official Brand Listing");
            String srcUrl = n.path("sourceUrl").asText(null);

            int idx = 0;
            for (JsonNode g : n.path("gallery")) {
                String gUrl = g.path("imageUrl").asText("");
                if (gUrl.isBlank()) continue;
                String gType = g.path("imageType").asText(idx == 0 ? "MAIN_PACKSHOT" : "DETAIL_VIEW");
                boolean primary = g.path("primaryImage").asBoolean(idx == 0);
                imgArgs.add(new Object[]{pid, gUrl, imgSrc, imgAttr, imgLic, gType, srcUrl, now, pName + " - " + gType, primary, idx++, now});
            }

            for (JsonNode v : n.path("variants")) {
                String vSku = v.path("variantSku").asText("").trim().toUpperCase();
                if (vSku.isBlank() || existingVarSkus.contains(vSku)) continue;
                existingVarSkus.add(vSku);
                varArgs.add(new Object[]{
                    pid,
                    vSku,
                    v.path("size").isTextual() ? v.path("size").asText() : null,
                    v.path("color").isTextual() ? v.path("color").asText() : null,
                    v.path("colorHex").isTextual() ? v.path("colorHex").asText() : null,
                    v.path("variantName").asText(pName),
                    v.path("price").isNumber() ? v.path("price").decimalValue() : null,
                    v.path("originalPrice").isNumber() ? v.path("originalPrice").decimalValue() : null,
                    v.path("stockQuantity").asInt(10),
                    v.path("availabilityStatus").asText("IN_STOCK"),
                    v.path("imageUrl").isTextual() ? v.path("imageUrl").asText() : n.path("imageUrl").asText(),
                    v.path("isDefault").asBoolean(false),
                    now
                });
            }
        }

        for (int i = 0; i < imgArgs.size(); i += 400) {
            jdbcTemplate.batchUpdate(insertImgSql, imgArgs.subList(i, Math.min(i + 400, imgArgs.size())));
        }
        for (int i = 0; i < varArgs.size(); i += 400) {
            jdbcTemplate.batchUpdate(insertVarSql, varArgs.subList(i, Math.min(i + 400, varArgs.size())));
        }

        log.info("Loaded {} genuine real-brand products with {} gallery images and {} variants.", pendingRows.size(), imgArgs.size(), varArgs.size());
    }
}
