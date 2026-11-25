package com.missioncart.countries;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;

/**
 * Seeds and enriches ALL ISO 3166-1 countries/territories using JDK Locale + Currency metadata
 * so every international market is visible and selectable (with honest availability status).
 */
@Component
@Order(5)
public class CountrySeedRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(CountrySeedRunner.class);

    private static final List<String> POPULAR_ORDER = List.of(
        "IN", "US", "GB", "FR", "IT", "DE", "JP", "KR", "AE", "SG", "AU", "CA"
    );

    private static final Set<String> ASIA_CODES = Set.of(
        "AF","AM","AZ","BH","BD","BT","BN","KH","CN","CY","GE","HK","IN","ID","IR","IQ","IL","JP","JO",
        "KZ","KW","KG","LA","LB","MO","MY","MV","MN","MM","NP","KP","OM","PK","PS","PH","QA","SA","SG",
        "KR","LK","SY","TW","TJ","TH","TL","TR","TM","AE","UZ","VN","YE"
    );
    private static final Set<String> EUROPE_CODES = Set.of(
        "AX","AL","AD","AT","BY","BE","BA","BG","HR","CZ","DK","EE","FO","FI","FR","DE","GI","GR","GG",
        "VA","HU","IS","IE","IM","IT","JE","XK","LV","LI","LT","LU","MT","MD","MC","ME","NL","MK","NO",
        "PL","PT","RO","RU","SM","RS","SK","SI","ES","SJ","SE","CH","UA","GB"
    );
    private static final Set<String> NORTH_AMERICA_CODES = Set.of(
        "AI","AG","AW","BS","BB","BZ","BM","BQ","VG","CA","KY","CR","CU","CW","DM","DO","SV","GL","GD",
        "GP","GT","HT","HN","JM","MQ","MX","MS","NI","PA","PM","PR","BL","KN","LC","MF","VC","SX","TT",
        "TC","US","VI"
    );
    private static final Set<String> SOUTH_AMERICA_CODES = Set.of(
        "AR","BO","BR","CL","CO","EC","FK","GF","GY","PY","PE","SR","UY","VE"
    );
    private static final Set<String> OCEANIA_CODES = Set.of(
        "AS","AU","CK","FJ","PF","GU","KI","MH","FM","NR","NC","NZ","NU","NF","MP","PW","PG","PN","WS",
        "SB","TK","TO","TV","UM","VU","WF"
    );

    private static final Map<String, String> CURRENCY_SYMBOL_OVERRIDES = Map.ofEntries(
        Map.entry("INR", "₹"), Map.entry("USD", "$"), Map.entry("EUR", "€"), Map.entry("GBP", "£"),
        Map.entry("JPY", "¥"), Map.entry("CNY", "¥"), Map.entry("KRW", "₩"), Map.entry("AED", "د.إ"),
        Map.entry("SGD", "$"), Map.entry("AUD", "$"), Map.entry("CAD", "$"), Map.entry("CHF", "CHF"),
        Map.entry("MYR", "RM"), Map.entry("THB", "฿"), Map.entry("SAR", "﷼"), Map.entry("TRY", "₺"),
        Map.entry("BRL", "R$"), Map.entry("ZAR", "R"), Map.entry("NZD", "$"), Map.entry("HKD", "$"),
        Map.entry("SEK", "kr"), Map.entry("NOK", "kr"), Map.entry("DKK", "kr"), Map.entry("PLN", "zł")
    );

    private static final Map<String, String> DIAL_CODES = Map.ofEntries(
        Map.entry("IN","+91"), Map.entry("US","+1"), Map.entry("CA","+1"), Map.entry("GB","+44"),
        Map.entry("FR","+33"), Map.entry("IT","+39"), Map.entry("DE","+49"), Map.entry("ES","+34"),
        Map.entry("PT","+351"), Map.entry("NL","+31"), Map.entry("BE","+32"), Map.entry("CH","+41"),
        Map.entry("SE","+46"), Map.entry("NO","+47"), Map.entry("DK","+45"), Map.entry("FI","+358"),
        Map.entry("IE","+353"), Map.entry("GR","+30"), Map.entry("AT","+43"), Map.entry("PL","+48"),
        Map.entry("JP","+81"), Map.entry("CN","+86"), Map.entry("KR","+82"), Map.entry("SG","+65"),
        Map.entry("MY","+60"), Map.entry("TH","+66"), Map.entry("ID","+62"), Map.entry("PH","+63"),
        Map.entry("VN","+84"), Map.entry("LK","+94"), Map.entry("BD","+880"), Map.entry("NP","+977"),
        Map.entry("PK","+92"), Map.entry("SA","+966"), Map.entry("AE","+971"), Map.entry("QA","+974"),
        Map.entry("KW","+965"), Map.entry("BR","+55"), Map.entry("AR","+54"), Map.entry("CL","+56"),
        Map.entry("CO","+57"), Map.entry("PE","+51"), Map.entry("MX","+52"), Map.entry("ZA","+27"),
        Map.entry("EG","+20"), Map.entry("NG","+234"), Map.entry("KE","+254"), Map.entry("MA","+212"),
        Map.entry("GH","+233"), Map.entry("AU","+61"), Map.entry("NZ","+64"), Map.entry("FJ","+679")
    );

    private final CountryRepository countryRepo;

    public CountrySeedRunner(CountryRepository countryRepo) {
        this.countryRepo = countryRepo;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (countryRepo.count() >= 240) {
            return;
        }
        Map<String, Country> existing = new HashMap<>();
        countryRepo.findAll().forEach(c -> existing.put(c.getCode().toUpperCase(), c));

        List<Country> toSave = new ArrayList<>();
        String[] isoCountries = Locale.getISOCountries();

        for (String iso2 : isoCountries) {
            Locale loc = Locale.of("", iso2);
            String displayName = loc.getDisplayCountry(Locale.ENGLISH);
            if (displayName == null || displayName.isBlank()) continue;

            Country c = existing.getOrDefault(iso2, new Country());
            c.setCode(iso2);
            try { c.setIso3(loc.getISO3Country()); } catch (Exception ignored) { c.setIso3(iso2); }
            c.setName(displayName);
            c.setFlagEmoji(toFlagEmoji(iso2));

            if (c.getCurrencyCode() == null || c.getCurrencyCode().isBlank()) {
                String cCode = "USD";
                String cSym = "$";
                try {
                    Currency curr = Currency.getInstance(loc);
                    if (curr != null) {
                        cCode = curr.getCurrencyCode();
                        cSym = CURRENCY_SYMBOL_OVERRIDES.getOrDefault(cCode, curr.getSymbol(Locale.ENGLISH));
                    }
                } catch (Exception ignored) {}
                c.setCurrencyCode(cCode);
                c.setCurrencySymbol(CURRENCY_SYMBOL_OVERRIDES.getOrDefault(cCode, cSym.length() <= 6 ? cSym : cCode));
            } else if (CURRENCY_SYMBOL_OVERRIDES.containsKey(c.getCurrencyCode())) {
                c.setCurrencySymbol(CURRENCY_SYMBOL_OVERRIDES.get(c.getCurrencyCode()));
            }

            c.setRegion(resolveRegion(iso2));
            c.setDefaultLocale(resolveDefaultLocale(iso2));
            if (DIAL_CODES.containsKey(iso2)) c.setDialCode(DIAL_CODES.get(iso2));
            if (c.getSizeSystem() == null || c.getSizeSystem().isBlank()) {
                c.setSizeSystem(resolveSizeSystem(iso2, c.getRegion()));
            }
            if (c.getExchangeRateToInr() == null) c.setExchangeRateToInr(BigDecimal.ONE);
            c.setActive(true);

            int popIdx = POPULAR_ORDER.indexOf(iso2);
            c.setPopular(popIdx >= 0);
            c.setDisplayOrder(popIdx >= 0 ? (popIdx + 1) : 100);
            toSave.add(c);
        }

        countryRepo.saveAll(toSave);
        log.info("Synchronized {} ISO 3166 countries into international directory.", toSave.size());
    }

    private String toFlagEmoji(String iso2) {
        if (iso2 == null || iso2.length() != 2) return "🌍";
        int first = Character.codePointAt(iso2.toUpperCase(), 0) - 'A' + 0x1F1E6;
        int second = Character.codePointAt(iso2.toUpperCase(), 1) - 'A' + 0x1F1E6;
        return new String(Character.toChars(first)) + new String(Character.toChars(second));
    }

    private String resolveRegion(String code) {
        if (ASIA_CODES.contains(code)) return "Asia";
        if (EUROPE_CODES.contains(code)) return "Europe";
        if (NORTH_AMERICA_CODES.contains(code)) return "North America";
        if (SOUTH_AMERICA_CODES.contains(code)) return "South America";
        if (OCEANIA_CODES.contains(code)) return "Oceania";
        if ("AQ".equals(code) || "BV".equals(code) || "GS".equals(code) || "TF".equals(code) || "HM".equals(code)) return "Antarctica";
        return "Africa";
    }

    private String resolveSizeSystem(String iso2, String region) {
        return switch (iso2) {
            case "IN" -> "IN/UK";
            case "US", "CA" -> "US";
            case "GB", "IE" -> "UK";
            case "AU", "NZ" -> "AU/UK";
            case "JP" -> "JP";
            case "KR" -> "KR";
            case "FR" -> "EU/FR";
            case "IT" -> "EU/IT";
            default -> "Europe".equals(region) ? "EU" : "International";
        };
    }

    private String resolveDefaultLocale(String iso2) {
        for (Locale loc : Locale.getAvailableLocales()) {
            if (iso2.equalsIgnoreCase(loc.getCountry()) && !loc.getLanguage().isBlank() && loc.getVariant().isBlank() && loc.getExtensionKeys().isEmpty()) {
                return loc.getLanguage() + "-" + iso2.toUpperCase();
            }
        }
        return "en-" + iso2.toUpperCase();
    }
}
