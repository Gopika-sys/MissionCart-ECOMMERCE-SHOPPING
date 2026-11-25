package com.missioncart.catalog;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.missioncart.catalog.CatalogImportService.ImportRecordInput;
import com.missioncart.catalog.CatalogImportService.ImportResult;
import com.missioncart.categories.Brand;
import com.missioncart.categories.BrandRepository;
import com.missioncart.categories.Category;
import com.missioncart.categories.CategoryRepository;
import com.missioncart.countries.Country;
import com.missioncart.countries.CountryRepository;
import com.missioncart.databoutique.DataBoutiqueService;
import com.missioncart.products.Product;
import com.missioncart.products.ProductRepository;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilderFactory;
import java.io.*;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Service
public class ZipCatalogImportService {

    private static final long MAX_UNCOMPRESSED_BYTES = 200L * 1024L * 1024L;
    private static final int MAX_ZIP_ENTRIES = 10_000;
    private static final Set<String> IMAGE_EXTS = Set.of(".jpg", ".jpeg", ".png", ".webp");

    public record ZipImportPreviewResult(
        Long jobId,
        boolean previewOnly,
        String fileName,
        String detectedCountry,
        String detectedCurrency,
        List<String> detectedCategories,
        List<String> detectedBrands,
        int totalRecords,
        int insertedCount,
        int updatedCount,
        int skippedDuplicateCount,
        int errorCount,
        int matchedImageCount,
        int unmatchedImageCount,
        List<String> unmatchedImageNames,
        List<CatalogImportService.PreviewRow> rows
    ) {}

    private final CatalogImportService catalogImportService;
    private final UnmatchedImportImageRepository unmatchedRepo;
    private final ProductRepository productRepo;
    private final CountryRepository countryRepo;
    private final CategoryRepository categoryRepo;
    private final BrandRepository brandRepo;
    private final ObjectMapper objectMapper;

    public ZipCatalogImportService(
        CatalogImportService catalogImportService,
        UnmatchedImportImageRepository unmatchedRepo,
        ProductRepository productRepo,
        CountryRepository countryRepo,
        CategoryRepository categoryRepo,
        BrandRepository brandRepo,
        ObjectMapper objectMapper
    ) {
        this.catalogImportService = catalogImportService;
        this.unmatchedRepo = unmatchedRepo;
        this.productRepo = productRepo;
        this.countryRepo = countryRepo;
        this.categoryRepo = categoryRepo;
        this.brandRepo = brandRepo;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public ZipImportPreviewResult processUpload(
        MultipartFile file,
        String overrideSourcePlatform,
        String overrideCountryCode,
        boolean previewOnly,
        boolean updateExisting,
        boolean autoApproveImages,
        String initiatedBy
    ) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Upload file is empty.");
        }
        String fileName = Optional.ofNullable(file.getOriginalFilename()).orElse("upload.zip");
        String lowerName = fileName.toLowerCase();

        Map<String, byte[]> imageEntries = new LinkedHashMap<>();
        List<Map<String, Object>> rawRecords = new ArrayList<>();
        Map<String, String> manifestImageMap = new HashMap<>();
        String manifestCountry = null;

        if (lowerName.endsWith(".zip")) {
            byte[] zipBytes = file.getBytes();
            readZipArchive(zipBytes, rawRecords, imageEntries, manifestImageMap);
            for (String path : imageEntries.keySet()) {
                if (manifestCountry == null) manifestCountry = detectCountryFromPath(path);
            }
        } else if (lowerName.endsWith(".csv")) {
            rawRecords.addAll(parseCsvMaps(new String(file.getBytes(), StandardCharsets.UTF_8)));
        } else if (lowerName.endsWith(".jsonl")) {
            rawRecords.addAll(parseJsonlMaps(new String(file.getBytes(), StandardCharsets.UTF_8)));
        } else if (lowerName.endsWith(".json")) {
            rawRecords.addAll(parseJsonMaps(new String(file.getBytes(), StandardCharsets.UTF_8)));
        } else if (lowerName.endsWith(".xlsx")) {
            rawRecords.addAll(parseXlsxMaps(file.getBytes()));
        } else {
            throw new IllegalArgumentException("Unsupported format. Upload .zip, .csv, .json, .jsonl, or .xlsx.");
        }

        String detectedCountry = normalizeCountryCode(
            firstNonBlank(overrideCountryCode, manifestCountry, detectCountryFromRecords(rawRecords), detectCountryFromPath(fileName), "IN")
        );
        Country countryObj = countryRepo.findById(detectedCountry).orElse(null);
        String detectedCurrency = countryObj != null ? countryObj.getCurrencyCode() : currencyForCountry(detectedCountry);

        // Build lookup index of images in ZIP by exact filename, relative path, and normalized SKU/GTIN/EAN stem
        Map<String, String> imageKeyToEntryPath = new HashMap<>();
        for (String entryPath : imageEntries.keySet()) {
            String baseName = Path.of(entryPath).getFileName().toString();
            String stem = stripExtension(baseName).toLowerCase().replaceAll("[^a-z0-9_-]", "");
            imageKeyToEntryPath.putIfAbsent(entryPath.toLowerCase(), entryPath);
            imageKeyToEntryPath.putIfAbsent(baseName.toLowerCase(), entryPath);
            imageKeyToEntryPath.putIfAbsent(stem, entryPath);
        }

        String batchId = UUID.randomUUID().toString().substring(0, 8);
        Set<String> usedImageEntries = new HashSet<>();
        Set<String> detectedCats = new LinkedHashSet<>();
        Set<String> detectedBrands = new LinkedHashSet<>();
        List<ImportRecordInput> normalizedInputs = new ArrayList<>();

        for (Map<String, Object> m : rawRecords) {
            String sku = str(firstObj(m, "sku", "product_sku", "asin", "gtin", "ean", "upc", "id"));
            String gtin = str(firstObj(m, "gtin", "ean", "upc", "barcode", "sourceProductId", "external_id"));
            String srcSite = str(firstObj(m, "source_website", "website", "sourceUrl", "product_url", "url"));
            String mappedLuxurySource = DataBoutiqueService.mapSourceCodeFromWebsite(
                srcSite != null ? srcSite : str(firstObj(m, "brand", "sourcePlatform", "source"))
            );
            String source = firstNonBlank(
                str(firstObj(m, "sourcePlatform", "source")),
                mappedLuxurySource,
                overrideSourcePlatform,
                "EXTERNAL_FEED"
            );
            String rowCountry = normalizeCountryCode(firstNonBlank(str(firstObj(m, "country", "countryCode", "geography_code")), detectedCountry));
            Country rowC = countryRepo.findById(rowCountry).orElse(countryObj);
            String rowCurrency = firstNonBlank(str(firstObj(m, "currency", "currency_code")), rowC != null ? rowC.getCurrencyCode() : detectedCurrency);

            String catRaw = firstNonBlank(str(firstObj(m, "categorySlug", "category", "product_category")), "fashion");
            String normalizedCat = normalizeCategorySlug(catRaw);
            detectedCats.add(normalizedCat);

            String brandName = str(firstObj(m, "brand", "manufacturer", "designer"));
            if (brandName == null && mappedLuxurySource != null) {
                brandName = humanizeSource(mappedLuxurySource);
            }
            if (brandName != null) detectedBrands.add(brandName);

            // Match image inside ZIP by manifest, explicit column, SKU, GTIN/EAN/UPC, or sourceProductId
            String explicitImg = str(firstObj(m, "imageUrl", "image_url", "image_file", "image", "photo"));
            String matchedEntryPath = findMatchingImageEntry(explicitImg, sku, gtin, manifestImageMap, imageKeyToEntryPath);
            String resolvedImageUrl = explicitImg != null && explicitImg.startsWith("http") ? explicitImg : null;

            if (matchedEntryPath != null && imageEntries.containsKey(matchedEntryPath)) {
                usedImageEntries.add(matchedEntryPath);
                if (!previewOnly) {
                    String ext = getExt(matchedEntryPath);
                    String safeName = sanitizeFileToken(sku != null ? sku : stripExtension(Path.of(matchedEntryPath).getFileName().toString())) + ext;
                    Path destDir = Path.of("uploads", "catalog-imports", batchId);
                    Files.createDirectories(destDir);
                    Files.write(destDir.resolve(safeName), imageEntries.get(matchedEntryPath));
                    resolvedImageUrl = "/uploads/catalog-imports/" + batchId + "/" + safeName;
                } else {
                    resolvedImageUrl = "zip://" + matchedEntryPath;
                }
            }

            normalizedInputs.add(new ImportRecordInput(
                sku,
                str(firstObj(m, "name", "title", "product_name")),
                brandName,
                normalizedCat,
                source.toUpperCase(),
                gtin != null ? gtin : sku,
                firstNonBlank(srcSite, str(firstObj(m, "sourceUrl", "product_url"))),
                firstNonBlank(str(firstObj(m, "productType")), "MISSIONCART_DIRECT".equalsIgnoreCase(source) ? "MISSIONCART_DIRECT" : "EXTERNAL_CATALOG"),
                str(firstObj(m, "description", "details", "name", "title")),
                dec(firstObj(m, "price", "selling_price", "final_price", "offer_price")),
                dec(firstObj(m, "originalPrice", "mrp", "full_price", "list_price")),
                num(firstObj(m, "stockQuantity", "stock", "qty")),
                str(firstObj(m, "missionTags", "tags")),
                firstNonBlank(str(firstObj(m, "priorityTier")), "BALANCED"),
                resolvedImageUrl,
                mappedLuxurySource != null ? "Authorized Brand / ZIP Archive" : "ZIP Catalog Upload",
                "Authorized Catalog Dataset",
                brandName != null ? brandName : source,
                rowCountry,
                rowCurrency,
                str(firstObj(m, "gender")),
                str(firstObj(m, "garmentType", "garment_type", "subcategory"))
            ));
        }

        ImportResult baseResult = catalogImportService.executeImport(
            normalizedInputs,
            firstNonBlank(overrideSourcePlatform, "ZIP_MULTI_COUNTRY"),
            lowerName.endsWith(".zip") ? "ZIP" : lowerName.substring(lowerName.lastIndexOf('.') + 1).toUpperCase(),
            fileName,
            previewOnly,
            updateExisting,
            autoApproveImages,
            initiatedBy
        );

        // Queue unmatched images safely (never assign random image to products!)
        List<String> unmatchedNames = new ArrayList<>();
        for (Map.Entry<String, byte[]> entry : imageEntries.entrySet()) {
            if (usedImageEntries.contains(entry.getKey())) continue;
            String baseName = Path.of(entry.getKey()).getFileName().toString();
            unmatchedNames.add(baseName);
            if (!previewOnly) {
                Path unmatchedDir = Path.of("uploads", "catalog-imports", batchId, "unmatched");
                Files.createDirectories(unmatchedDir);
                String safeName = sanitizeFileToken(stripExtension(baseName)) + getExt(baseName);
                Files.write(unmatchedDir.resolve(safeName), entry.getValue());

                UnmatchedImportImage uii = new UnmatchedImportImage();
                uii.setImportJobId(baseResult.jobId());
                uii.setCountryCode(detectedCountry);
                uii.setFileName(baseName);
                uii.setExtractedSkuHint(stripExtension(baseName).toUpperCase());
                uii.setImageDataUrl("/uploads/catalog-imports/" + batchId + "/unmatched/" + safeName);
                uii.setStatus("PENDING_REVIEW");
                unmatchedRepo.save(uii);
            }
        }

        return new ZipImportPreviewResult(
            baseResult.jobId(),
            previewOnly,
            fileName,
            detectedCountry,
            detectedCurrency,
            new ArrayList<>(detectedCats),
            new ArrayList<>(detectedBrands),
            baseResult.totalRecords(),
            baseResult.insertedCount(),
            baseResult.updatedCount(),
            baseResult.skippedDuplicateCount(),
            baseResult.errorCount(),
            usedImageEntries.size(),
            unmatchedNames.size(),
            unmatchedNames.stream().limit(50).toList(),
            baseResult.rows()
        );
    }

    private void readZipArchive(
        byte[] zipBytes,
        List<Map<String, Object>> rawRecords,
        Map<String, byte[]> imageEntries,
        Map<String, String> manifestImageMap
    ) throws IOException {
        long totalUncompressed = 0L;
        int entryCount = 0;

        try (ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(zipBytes))) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                entryCount++;
                if (entryCount > MAX_ZIP_ENTRIES) {
                    throw new IllegalArgumentException("ZIP archive exceeds maximum entry limit (" + MAX_ZIP_ENTRIES + ").");
                }
                String name = entry.getName().replace('\\', '/');
                if (name.contains("..") || name.startsWith("/") || name.contains(":")) {
                    throw new IllegalArgumentException("Unsafe ZIP path rejected: " + name);
                }
                if (entry.isDirectory() || name.startsWith("__MACOSX/")) continue;

                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                byte[] buf = new byte[8192];
                int n;
                while ((n = zis.read(buf)) > 0) {
                    totalUncompressed += n;
                    if (totalUncompressed > MAX_UNCOMPRESSED_BYTES) {
                        throw new IllegalArgumentException("ZIP uncompressed size exceeds safe 200MB limit.");
                    }
                    baos.write(buf, 0, n);
                }
                byte[] bytes = baos.toByteArray();
                String lower = name.toLowerCase();

                if (IMAGE_EXTS.stream().anyMatch(lower::endsWith)) {
                    imageEntries.put(name, bytes);
                } else if (lower.endsWith("manifest.json")) {
                    parseManifestJson(new String(bytes, StandardCharsets.UTF_8), manifestImageMap);
                } else if (lower.endsWith(".csv")) {
                    rawRecords.addAll(parseCsvMaps(new String(bytes, StandardCharsets.UTF_8)));
                } else if (lower.endsWith(".jsonl")) {
                    rawRecords.addAll(parseJsonlMaps(new String(bytes, StandardCharsets.UTF_8)));
                } else if (lower.endsWith(".json")) {
                    rawRecords.addAll(parseJsonMaps(new String(bytes, StandardCharsets.UTF_8)));
                } else if (lower.endsWith(".xlsx")) {
                    rawRecords.addAll(parseXlsxMaps(bytes));
                }
            }
        }
    }

    private void parseManifestJson(String json, Map<String, String> manifestImageMap) {
        try {
            Map<String, Object> m = objectMapper.readValue(json, new TypeReference<>() {});
            Object imgs = m.get("images");
            if (imgs instanceof Map<?, ?> map) {
                map.forEach((k, v) -> manifestImageMap.put(String.valueOf(k).trim().toLowerCase(), String.valueOf(v).trim()));
            }
        } catch (Exception ignored) {}
    }

    private List<Map<String, Object>> parseCsvMaps(String csv) throws IOException {
        List<Map<String, Object>> list = new ArrayList<>();
        try (CSVParser parser = CSVFormat.DEFAULT.builder().setHeader().setSkipHeaderRecord(true).setTrim(true).build()
            .parse(new StringReader(csv))) {
            for (CSVRecord rec : parser) {
                Map<String, Object> m = new LinkedHashMap<>();
                for (String h : parser.getHeaderNames()) {
                    m.put(h.trim(), rec.get(h));
                }
                list.add(m);
            }
        }
        return list;
    }

    private List<Map<String, Object>> parseJsonMaps(String json) throws IOException {
        String t = json.trim();
        if (t.startsWith("[")) {
            return objectMapper.readValue(t, new TypeReference<>() {});
        }
        Map<String, Object> obj = objectMapper.readValue(t, new TypeReference<>() {});
        if (obj.get("products") instanceof List<?> arr) {
            return objectMapper.convertValue(arr, new TypeReference<>() {});
        }
        if (obj.get("items") instanceof List<?> arr) {
            return objectMapper.convertValue(arr, new TypeReference<>() {});
        }
        return List.of(obj);
    }

    private List<Map<String, Object>> parseJsonlMaps(String jsonl) throws IOException {
        List<Map<String, Object>> list = new ArrayList<>();
        for (String line : jsonl.split("\\r?\\n")) {
            if (line.isBlank()) continue;
            list.add(objectMapper.readValue(line, new TypeReference<>() {}));
        }
        return list;
    }

    // Minimal pure-JDK OOXML .xlsx reader (sharedStrings + sheet1.xml) without heavy Apache POI footprint
    private List<Map<String, Object>> parseXlsxMaps(byte[] xlsxBytes) {
        try {
            byte[] sharedBytes = null;
            byte[] sheetBytes = null;
            try (ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(xlsxBytes))) {
                ZipEntry e;
                while ((e = zis.getNextEntry()) != null) {
                    if ("xl/sharedStrings.xml".equalsIgnoreCase(e.getName())) sharedBytes = zis.readAllBytes();
                    else if ("xl/worksheets/sheet1.xml".equalsIgnoreCase(e.getName())) sheetBytes = zis.readAllBytes();
                }
            }
            if (sheetBytes == null) return List.of();
            var dbf = DocumentBuilderFactory.newInstance();
            dbf.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            List<String> sharedStrings = new ArrayList<>();
            if (sharedBytes != null) {
                Document sdoc = dbf.newDocumentBuilder().parse(new ByteArrayInputStream(sharedBytes));
                NodeList sis = sdoc.getElementsByTagName("si");
                for (int i = 0; i < sis.getLength(); i++) {
                    sharedStrings.add(sis.item(i).getTextContent());
                }
            }
            Document doc = dbf.newDocumentBuilder().parse(new ByteArrayInputStream(sheetBytes));
            NodeList rows = doc.getElementsByTagName("row");
            List<String> headers = new ArrayList<>();
            List<Map<String, Object>> out = new ArrayList<>();
            for (int r = 0; r < rows.getLength(); r++) {
                Element rowEl = (Element) rows.item(r);
                NodeList cells = rowEl.getElementsByTagName("c");
                Map<Integer, String> vals = new TreeMap<>();
                for (int c = 0; c < cells.getLength(); c++) {
                    Element cell = (Element) cells.item(c);
                    String ref = cell.getAttribute("r");
                    int colIdx = colIndexFromRef(ref);
                    String t = cell.getAttribute("t");
                    NodeList vs = cell.getElementsByTagName("v");
                    String raw = vs.getLength() > 0 ? vs.item(0).getTextContent() : "";
                    if ("s".equals(t) && !raw.isBlank()) {
                        raw = sharedStrings.get(Integer.parseInt(raw.trim()));
                    }
                    vals.put(colIdx, raw);
                }
                if (r == 0) {
                    int maxCol = vals.isEmpty() ? 0 : Collections.max(vals.keySet()) + 1;
                    for (int idx = 0; idx < maxCol; idx++) headers.add(vals.getOrDefault(idx, "col_" + idx).trim());
                } else {
                    Map<String, Object> rowMap = new LinkedHashMap<>();
                    for (int idx = 0; idx < headers.size(); idx++) {
                        rowMap.put(headers.get(idx), vals.getOrDefault(idx, ""));
                    }
                    out.add(rowMap);
                }
            }
            return out;
        } catch (Exception ex) {
            throw new IllegalArgumentException("Unable to parse XLSX worksheet: " + ex.getMessage());
        }
    }

    private int colIndexFromRef(String ref) {
        int col = 0;
        for (char ch : ref.toCharArray()) {
            if (Character.isLetter(ch)) col = col * 26 + (Character.toUpperCase(ch) - 'A' + 1);
            else break;
        }
        return Math.max(0, col - 1);
    }

    private String findMatchingImageEntry(
        String explicitImg,
        String sku,
        String gtin,
        Map<String, String> manifestMap,
        Map<String, String> imageIndex
    ) {
        List<String> keys = new ArrayList<>();
        if (explicitImg != null && !explicitImg.isBlank()) {
            keys.add(explicitImg.toLowerCase());
            keys.add(Path.of(explicitImg.replace('\\', '/')).getFileName().toString().toLowerCase());
            keys.add(stripExtension(explicitImg).toLowerCase().replaceAll("[^a-z0-9_-]", ""));
        }
        if (sku != null && !sku.isBlank()) {
            String sk = sku.trim().toLowerCase();
            if (manifestMap.containsKey(sk)) keys.add(manifestMap.get(sk).toLowerCase());
            keys.add(sk.replaceAll("[^a-z0-9_-]", ""));
        }
        if (gtin != null && !gtin.isBlank()) {
            String gk = gtin.trim().toLowerCase();
            if (manifestMap.containsKey(gk)) keys.add(manifestMap.get(gk).toLowerCase());
            keys.add(gk.replaceAll("[^a-z0-9_-]", ""));
        }
        for (String k : keys) {
            if (imageIndex.containsKey(k)) return imageIndex.get(k);
        }
        return null;
    }

    private String detectCountryFromRecords(List<Map<String, Object>> recs) {
        for (Map<String, Object> r : recs) {
            String c = str(firstObj(r, "country", "countryCode", "geography_code", "geography", "market"));
            if (c != null && !c.isBlank()) return normalizeCountryCode(c);
        }
        return null;
    }

    private String detectCountryFromPath(String path) {
        String lower = path.toLowerCase();
        if (lower.contains("france") || lower.matches(".*\\bfr\\b.*") || lower.contains("/fr/")) return "FR";
        if (lower.contains("italy") || lower.matches(".*\\bit\\b.*") || lower.contains("/it/")) return "IT";
        if (lower.contains("uk") || lower.contains("united kingdom") || lower.matches(".*\\bgb\\b.*")) return "GB";
        if (lower.contains("usa") || lower.contains("united states") || lower.matches(".*\\bus\\b.*")) return "US";
        if (lower.contains("germany") || lower.matches(".*\\bde\\b.*")) return "DE";
        if (lower.contains("uae") || lower.contains("dubai") || lower.matches(".*\\bae\\b.*")) return "AE";
        if (lower.contains("japan") || lower.matches(".*\\bjp\\b.*")) return "JP";
        if (lower.contains("singapore") || lower.matches(".*\\bsg\\b.*")) return "SG";
        if (lower.contains("india") || lower.matches(".*\\bin\\b.*")) return "IN";
        return null;
    }

    private String normalizeCountryCode(String code) {
        if (code == null || code.isBlank()) return "IN";
        String up = code.trim().toUpperCase();
        return switch (up) {
            case "FRANCE" -> "FR";
            case "ITALY" -> "IT";
            case "UNITED KINGDOM", "UK" -> "GB";
            case "UNITED STATES", "USA" -> "US";
            case "GERMANY" -> "DE";
            case "UAE", "UNITED ARAB EMIRATES" -> "AE";
            case "SINGAPORE" -> "SG";
            case "JAPAN" -> "JP";
            case "INDIA" -> "IN";
            default -> up.length() > 8 ? up.substring(0, 8) : up;
        };
    }

    private String currencyForCountry(String cc) {
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

    private String normalizeCategorySlug(String raw) {
        String s = raw.toLowerCase().trim();
        if (s.contains("beauty") || s.contains("cosmetic") || s.contains("makeup")) return "beauty";
        if (s.contains("skin")) return "skincare";
        if (s.contains("home") || s.contains("decor")) return "home-decor";
        if (s.contains("kitchen") || s.contains("dining")) return "kitchen";
        if (s.contains("grocery") || s.contains("food") || s.contains("dairy") || s.contains("milk")) return "groceries";
        if (s.contains("electr") || s.contains("audio") || s.contains("tech")) return "electronics";
        if (s.contains("travel") || s.contains("luggage")) return "travel";
        if (s.contains("fit") || s.contains("gym") || s.contains("yoga")) return "fitness";
        if (s.contains("study") || s.contains("desk") || s.contains("office")) return "study-workspace";
        if (s.contains("bag") || s.contains("dress") || s.contains("shoe") || s.contains("fashion") || s.contains("wear") || s.contains("apparel") || s.contains("shirt")) return "fashion";
        return s.replaceAll("[^a-z0-9]+", "-");
    }

    private String humanizeSource(String code) {
        return Arrays.stream(code.split("_"))
            .map(w -> w.charAt(0) + w.substring(1).toLowerCase())
            .reduce((a, b) -> a + " " + b).orElse(code);
    }

    private Object firstObj(Map<String, Object> m, String... keys) {
        for (String k : keys) {
            if (m.containsKey(k) && m.get(k) != null && !String.valueOf(m.get(k)).isBlank()) return m.get(k);
            for (String existing : m.keySet()) {
                if (existing.equalsIgnoreCase(k) && m.get(existing) != null && !String.valueOf(m.get(existing)).isBlank()) {
                    return m.get(existing);
                }
            }
        }
        return null;
    }

    private String firstNonBlank(String... vals) {
        for (String v : vals) {
            if (v != null && !v.isBlank()) return v;
        }
        return null;
    }

    private String str(Object o) { return o == null ? null : String.valueOf(o).trim(); }
    private BigDecimal dec(Object o) {
        if (o == null || String.valueOf(o).isBlank()) return null;
        try { return new BigDecimal(String.valueOf(o).replaceAll("[^0-9.]", "")); } catch (Exception e) { return null; }
    }
    private Integer num(Object o) {
        if (o == null || String.valueOf(o).isBlank()) return null;
        try { return Integer.parseInt(String.valueOf(o).replaceAll("[^0-9]", "")); } catch (Exception e) { return null; }
    }
    private String stripExtension(String filename) {
        int idx = filename.lastIndexOf('.');
        return idx > 0 ? filename.substring(0, idx) : filename;
    }
    private String getExt(String filename) {
        int idx = filename.lastIndexOf('.');
        return idx >= 0 ? filename.substring(idx).toLowerCase() : ".jpg";
    }
    private String sanitizeFileToken(String s) {
        return s.replaceAll("[^a-zA-Z0-9._-]", "_");
    }
}
