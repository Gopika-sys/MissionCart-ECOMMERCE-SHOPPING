package com.missioncart.ai;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class StructuredBudgetParser {

    public enum BudgetType {
        TOTAL_BUNDLE_BUDGET,
        PER_PRODUCT_MAX_PRICE
    }

    public record ParsedBudget(
        BigDecimal minPrice,
        BigDecimal maxPrice,
        String currency,
        BudgetType budgetType,
        boolean ambiguous,
        String clarificationQuestion
    ) {}

    private static final Pattern BETWEEN_PATTERN = Pattern.compile(
        "between\\s+(?:₹|rs\\.?|inr|\\$|€|£)?\\s*([0-9][0-9,]*(?:\\.\\d+)?)\\s*(k)?\\s+(?:and|to|-)\\s+(?:₹|rs\\.?|inr|\\$|€|£)?\\s*([0-9][0-9,]*(?:\\.\\d+)?)\\s*(k)?",
        Pattern.CASE_INSENSITIVE
    );

    private static final Pattern K_PATTERN = Pattern.compile(
        "(?:₹|rs\\.?|inr|\\$|€|£|under|below|within|max(?:imum)?\\s*budget|budget\\s*(?:is|of|:)?)\\s*[:\\-]?\\s*(\\d+(?:\\.\\d+)?)\\s*k\\b",
        Pattern.CASE_INSENSITIVE
    );

    private static final Pattern AMOUNT_PATTERN = Pattern.compile(
        "(?:₹|rs\\.?|inr|\\$|€|£|budget|under|below|within|upto|up\\s*to|less\\s*than|max(?:imum)?)\\s*[:\\-]?\\s*([0-9][0-9,]*(?:\\.\\d+)?)",
        Pattern.CASE_INSENSITIVE
    );

    public ParsedBudget parse(String prompt, BigDecimal explicitBudget, String defaultCurrency) {
        String curr = detectCurrency(prompt, defaultCurrency);
        String lower = prompt == null ? "" : prompt.toLowerCase(Locale.ROOT);

        if (explicitBudget != null && explicitBudget.compareTo(BigDecimal.ZERO) > 0) {
            BudgetType bt = detectBudgetType(lower);
            return new ParsedBudget(null, explicitBudget, curr, bt, false, null);
        }

        if (prompt == null || prompt.isBlank()) {
            return new ParsedBudget(null, null, curr, BudgetType.TOTAL_BUNDLE_BUDGET, false, null);
        }

        Matcher between = BETWEEN_PATTERN.matcher(prompt);
        if (between.find()) {
            BigDecimal lo = parseScaled(between.group(1), between.group(2) != null);
            BigDecimal hi = parseScaled(between.group(3), between.group(4) != null);
            if (lo != null && hi != null && hi.compareTo(lo) >= 0) {
                return new ParsedBudget(lo, hi, curr, BudgetType.PER_PRODUCT_MAX_PRICE, false, null);
            }
        }

        BigDecimal max = null;
        Matcher kM = K_PATTERN.matcher(prompt);
        if (kM.find()) {
            max = parseScaled(kM.group(1), true);
        }
        if (max == null) {
            Matcher m = AMOUNT_PATTERN.matcher(prompt);
            if (m.find()) {
                max = parseScaled(m.group(1), false);
            }
        }
        if (max == null) {
            // Bare number ending with k e.g. "10k"
            Matcher bareK = Pattern.compile("\\b(\\d+(?:\\.\\d+)?)\\s*k\\b", Pattern.CASE_INSENSITIVE).matcher(prompt);
            if (bareK.find()) max = parseScaled(bareK.group(1), true);
        }

        BudgetType bt = detectBudgetType(lower);
        boolean ambiguous = false;
        String question = null;
        if (max != null && bt == BudgetType.TOTAL_BUNDLE_BUDGET
            && !lower.contains("complete") && !lower.contains("routine") && !lower.contains("setup")
            && !lower.contains("bundle") && !lower.contains("within") && !lower.contains("everything")
            && (lower.contains("products") || lower.contains("items"))) {
            // "Beauty products under ₹1,000" -> per product max price by natural shopping phrasing
            bt = BudgetType.PER_PRODUCT_MAX_PRICE;
        } else if (max != null && !lower.contains("complete") && !lower.contains("setup")
            && !lower.contains("routine") && !lower.contains("each") && !lower.contains("every")
            && !lower.contains("single") && !lower.contains("laptop") && !lower.contains("phone")
            && !lower.contains("under") && !lower.contains("within")) {
            ambiguous = true;
            question = "Did you mean " + curr + " " + max.stripTrailingZeros().toPlainString()
                + " total for the whole bundle, or maximum per individual product?";
        }

        return new ParsedBudget(null, max, curr, bt, ambiguous, question);
    }

    private BudgetType detectBudgetType(String lower) {
        if (lower.contains("each") || lower.contains("per item") || lower.contains("per product")
            || lower.contains("between")
            || lower.matches(".*\\b(laptop|phone|desk lamp|kettle|chair|bag|dress|moisturizer|sunscreen|cleanser|shirt|shoes)\\s+(under|below)\\b.*")
            || lower.matches(".*\\b(products|items|dresses|shirts|clothes|clothing|moisturizers|essentials)\\s+(under|below)\\b.*")) {
            return BudgetType.PER_PRODUCT_MAX_PRICE;
        }
        return BudgetType.TOTAL_BUNDLE_BUDGET;
    }

    private String detectCurrency(String text, String fallback) {
        if (text != null) {
            if (text.contains("€") || text.toLowerCase().contains("eur")) return "EUR";
            if (text.contains("£") || text.toLowerCase().contains("gbp")) return "GBP";
            if (text.contains("$") || text.toLowerCase().contains("usd")) return "USD";
            if (text.contains("₹") || text.toLowerCase().contains("inr") || text.toLowerCase().contains("rs.")) return "INR";
        }
        return (fallback != null && !fallback.isBlank()) ? fallback : "INR";
    }

    private BigDecimal parseScaled(String numStr, boolean timesThousand) {
        try {
            double v = Double.parseDouble(numStr.replace(",", "").trim());
            if (timesThousand) v *= 1000.0;
            return v > 0 ? BigDecimal.valueOf(Math.round(v * 100.0) / 100.0) : null;
        } catch (Exception e) {
            return null;
        }
    }
}
