package com.missioncart.databoutique;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.missioncart.config.AppProperties;
import com.missioncart.retailers.RetailerSource;
import com.missioncart.retailers.RetailerSourceRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.*;

@Service
public class DataBoutiqueService {

    public static final Set<String> LUXURY_BRAND_CODES = Set.of(
        "GUCCI", "ARMANI", "LORO_PIANA", "BURBERRY", "BALENCIAGA", "ALEXANDER_MCQUEEN",
        "DOLCE_GABBANA", "CHANEL", "LOUIS_VUITTON", "HERMES", "BOTTEGA_VENETA", "DIOR",
        "TIFFANY_CO", "FENDI", "CELINE", "CHLOE", "VERSACE", "BRIONI", "BRUNELLO_CUCINELLI",
        "FERRAGAMO", "LOEWE", "CANADA_GOOSE", "ERMENEGILDO_ZEGNA", "VALENTINO", "TOM_FORD", "ETRO"
    );

    public record LuxuryBrandStatusDto(
        String code,
        String name,
        String officialWebsite,
        String connectionStatus,
        long productCount,
        List<String> availableCountries
    ) {}

    public record DataBoutiqueStatusDto(
        boolean tokenConfigured,
        String collectionUrl,
        String message,
        List<DataBoutiqueDataset> datasets,
        List<LuxuryBrandStatusDto> luxuryBrands
    ) {}

    private final AppProperties props;
    private final DataBoutiqueDatasetRepository datasetRepo;
    private final RetailerSourceRepository retailerRepo;
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public DataBoutiqueService(
        AppProperties props,
        DataBoutiqueDatasetRepository datasetRepo,
        RetailerSourceRepository retailerRepo,
        JdbcTemplate jdbcTemplate,
        ObjectMapper objectMapper
    ) {
        this.props = props;
        this.datasetRepo = datasetRepo;
        this.retailerRepo = retailerRepo;
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    public boolean isTokenConfigured() {
        return props.databoutique() != null
            && props.databoutique().apiToken() != null
            && !props.databoutique().apiToken().isBlank();
    }

    public DataBoutiqueStatusDto getStatus(String countryFilter) {
        String ccFilter = countryFilter != null && !countryFilter.isBlank() ? countryFilter.trim().toUpperCase() : null;
        Map<String, List<String>> countriesByBrand = new HashMap<>();
        Map<String, Long> countByBrand = new HashMap<>();

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
            "SELECT UPPER(source_platform) AS sp, UPPER(country_code) AS cc, COUNT(*) AS cnt " +
            "FROM products WHERE is_published = TRUE AND is_approved = TRUE GROUP BY UPPER(source_platform), UPPER(country_code)"
        );
        for (Map<String, Object> r : rows) {
            String sp = String.valueOf(r.get("sp"));
            String cc = String.valueOf(r.get("cc"));
            long cnt = ((Number) r.get("cnt")).longValue();
            countriesByBrand.computeIfAbsent(sp, k -> new ArrayList<>()).add(cc);
            if (ccFilter == null || ccFilter.equals(cc)) {
                countByBrand.merge(sp, cnt, Long::sum);
            }
        }

        List<LuxuryBrandStatusDto> brands = retailerRepo.findAllByOrderByIdAsc().stream()
            .filter(s -> LUXURY_BRAND_CODES.contains(s.getCode().toUpperCase()))
            .map(s -> {
                String code = s.getCode().toUpperCase();
                long cnt = countByBrand.getOrDefault(code, 0L);
                List<String> availCountries = countriesByBrand.getOrDefault(code, List.of());
                String st = cnt > 0 ? "ACTIVE" : s.getConnectionStatus();
                return new LuxuryBrandStatusDto(code, s.getName(), s.getOfficialWebsite(), st, cnt, availCountries);
            })
            .toList();

        boolean tok = isTokenConfigured();
        String msg = tok
            ? "DATABOUTIQUE_API_TOKEN configured server-side. Dataset catalog sync ready."
            : "DATABOUTIQUE_API_TOKEN is not set in backend environment. Configure DATABOUTIQUE_API_TOKEN or upload authorized Data Boutique CSV/JSONL/ZIP files to populate foreign luxury brand datasets.";

        return new DataBoutiqueStatusDto(
            tok,
            "https://www.databoutique.com/collections-details/fashion+luxury+brands/r/recduNgC35Z9tEIdZ",
            msg,
            datasetRepo.findAllByOrderBySyncedAtDescTitleAsc(),
            brands
        );
    }

    @Transactional
    public DataBoutiqueStatusDto syncCatalogFromApi() {
        if (!isTokenConfigured()) {
            return getStatus(null);
        }
        String token = props.databoutique().apiToken().trim();
        String baseUrl = props.databoutique().baseUrl() != null && !props.databoutique().baseUrl().isBlank()
            ? props.databoutique().baseUrl().replaceAll("/+$", "")
            : "https://api.databoutique.com";

        HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(12)).build();
        int page = 1;
        boolean hasMore = true;

        while (hasMore && page <= 10) {
            try {
                HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/v1/datasets?page=" + page))
                    .header("Authorization", "Bearer " + token)
                    .header("Accept", "application/json")
                    .timeout(Duration.ofSeconds(20))
                    .GET()
                    .build();
                HttpResponse<String> resp = client.send(req, HttpResponse.BodyHandlers.ofString());
                if (resp.statusCode() < 200 || resp.statusCode() >= 300) {
                    throw new IllegalStateException("Data Boutique catalog API returned HTTP " + resp.statusCode());
                }
                JsonNode root = objectMapper.readTree(resp.body());
                JsonNode records = root.has("data") ? root.path("data") : (root.has("results") ? root.path("results") : root);
                if (!records.isArray() || records.isEmpty()) {
                    hasMore = false;
                    break;
                }
                for (JsonNode n : records) {
                    String contractId = textOf(n, "contract", "contract_id", "id");
                    if (contractId == null || contractId.isBlank()) continue;
                    DataBoutiqueDataset ds = datasetRepo.findByContractId(contractId).orElseGet(DataBoutiqueDataset::new);
                    ds.setContractId(contractId);
                    ds.setTitle(Optional.ofNullable(textOf(n, "title", "name")).orElse("Data Boutique Dataset " + contractId));
                    ds.setGeography(textOf(n, "geography", "country"));
                    ds.setGeographyCode(textOf(n, "geography_code", "country_code"));
                    ds.setSchemaName(textOf(n, "schema", "schema_name"));
                    ds.setSourceWebsite(textOf(n, "source_website", "website"));
                    ds.setBrandName(inferBrandFromWebsiteOrTitle(ds.getSourceWebsite(), ds.getTitle()));
                    ds.setRefreshPolicy(textOf(n, "refresh_policy"));
                    ds.setDatasetPrice(textOf(n, "dataset_price", "price"));
                    ds.setSampleFileUrl(textOf(n, "sample_file", "sample_file_url"));
                    ds.setLastDeliveredDate(textOf(n, "last_delivered_date"));
                    ds.setDatasetUrl(textOf(n, "dataset_url", "url"));
                    ds.setSyncedAt(Instant.now());
                    datasetRepo.save(ds);
                }
                hasMore = root.path("next").isTextual() && !root.path("next").asText().isBlank();
                page++;
            } catch (Exception ex) {
                throw new IllegalStateException("Failed syncing Data Boutique dataset catalog: " + ex.getMessage(), ex);
            }
        }
        return getStatus(null);
    }

    public static String mapSourceCodeFromWebsite(String websiteOrBrand) {
        if (websiteOrBrand == null) return null;
        String lower = websiteOrBrand.toLowerCase();
        if (lower.contains("gucci")) return "GUCCI";
        if (lower.contains("armani")) return "ARMANI";
        if (lower.contains("loropiana") || lower.contains("loro piana")) return "LORO_PIANA";
        if (lower.contains("burberry")) return "BURBERRY";
        if (lower.contains("balenciaga")) return "BALENCIAGA";
        if (lower.contains("mcqueen")) return "ALEXANDER_MCQUEEN";
        if (lower.contains("dolce")) return "DOLCE_GABBANA";
        if (lower.contains("chanel")) return "CHANEL";
        if (lower.contains("louisvuitton") || lower.contains("louis vuitton")) return "LOUIS_VUITTON";
        if (lower.contains("hermes")) return "HERMES";
        if (lower.contains("bottega")) return "BOTTEGA_VENETA";
        if (lower.contains("dior")) return "DIOR";
        if (lower.contains("tiffany")) return "TIFFANY_CO";
        if (lower.contains("fendi")) return "FENDI";
        if (lower.contains("celine")) return "CELINE";
        if (lower.contains("chloe")) return "CHLOE";
        if (lower.contains("versace")) return "VERSACE";
        if (lower.contains("brioni")) return "BRIONI";
        if (lower.contains("cucinelli")) return "BRUNELLO_CUCINELLI";
        if (lower.contains("ferragamo")) return "FERRAGAMO";
        if (lower.contains("loewe")) return "LOEWE";
        if (lower.contains("canadagoose") || lower.contains("canada goose")) return "CANADA_GOOSE";
        if (lower.contains("zegna")) return "ERMENEGILDO_ZEGNA";
        if (lower.contains("valentino")) return "VALENTINO";
        if (lower.contains("tomford") || lower.contains("tom ford")) return "TOM_FORD";
        if (lower.contains("etro")) return "ETRO";
        return null;
    }

    private String inferBrandFromWebsiteOrTitle(String site, String title) {
        String code = mapSourceCodeFromWebsite(site != null ? site : title);
        if (code == null) return null;
        return Arrays.stream(code.split("_"))
            .map(w -> w.charAt(0) + w.substring(1).toLowerCase())
            .reduce((a, b) -> a + " " + b).orElse(code);
    }

    private String textOf(JsonNode n, String... keys) {
        for (String k : keys) {
            if (n.hasNonNull(k)) {
                String v = n.path(k).asText("");
                if (!v.isBlank()) return v;
            }
        }
        return null;
    }
}
