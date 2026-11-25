package com.missioncart.countries;

import com.missioncart.common.ApiResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;

@RestController
@RequestMapping("/api/countries")
public class CountryController {

    public record CountryViewDto(
        String code,
        String iso3,
        String name,
        String flagEmoji,
        String currencyCode,
        String currencySymbol,
        String sizeSystem,
        String region,
        String defaultLocale,
        String dialCode,
        boolean popular,
        BigDecimal exchangeRateToInr,
        long productCount,
        boolean datasetAvailable,
        String availabilityStatus
    ) {}

    private final CountryRepository countryRepo;
    private final JdbcTemplate jdbcTemplate;

    public CountryController(CountryRepository countryRepo, JdbcTemplate jdbcTemplate) {
        this.countryRepo = countryRepo;
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping
    public ApiResponse<List<CountryViewDto>> list(
        @RequestParam(required = false) String q,
        @RequestParam(required = false) String region
    ) {
        Map<String, Long> counts = new HashMap<>();
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
            "SELECT UPPER(country_code) AS cc, COUNT(*) AS cnt FROM products WHERE is_published = TRUE AND is_approved = TRUE GROUP BY UPPER(country_code)"
        );
        for (Map<String, Object> row : rows) {
            counts.put(String.valueOf(row.get("cc")), ((Number) row.get("cnt")).longValue());
        }

        String filter = q != null ? q.trim().toLowerCase() : "";
        String regionFilter = region != null ? region.trim().toLowerCase() : "";

        List<CountryViewDto> list = countryRepo.findByActiveTrueOrderByDisplayOrderAscNameAsc().stream()
            .filter(c -> regionFilter.isEmpty() || "all".equals(regionFilter)
                || (c.getRegion() != null && c.getRegion().toLowerCase().equals(regionFilter)))
            .filter(c -> filter.isEmpty()
                || c.getName().toLowerCase().contains(filter)
                || c.getCode().toLowerCase().contains(filter)
                || (c.getIso3() != null && c.getIso3().toLowerCase().contains(filter))
                || c.getCurrencyCode().toLowerCase().contains(filter)
                || (c.getRegion() != null && c.getRegion().toLowerCase().contains(filter)))
            .map(c -> {
                long cnt = counts.getOrDefault(c.getCode().toUpperCase(), 0L);
                String status = cnt >= 50
                    ? "CATALOGUE_AVAILABLE"
                    : cnt > 0
                        ? "PARTIALLY_AVAILABLE"
                        : c.isPopular() ? "DATASET_PENDING" : "COMING_SOON";
                return new CountryViewDto(
                    c.getCode(), c.getIso3(), c.getName(), c.getFlagEmoji(), c.getCurrencyCode(),
                    c.getCurrencySymbol(), c.getSizeSystem(), c.getRegion(), c.getDefaultLocale(),
                    c.getDialCode(), c.isPopular(), c.getExchangeRateToInr(),
                    cnt, cnt > 0, status
                );
            })
            .toList();

        return ApiResponse.ok(list);
    }
}
