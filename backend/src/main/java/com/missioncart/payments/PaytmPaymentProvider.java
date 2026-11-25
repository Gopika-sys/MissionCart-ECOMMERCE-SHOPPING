package com.missioncart.payments;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.missioncart.config.AppProperties;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class PaytmPaymentProvider implements PaymentProvider {

    private final AppProperties props;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();

    public PaytmPaymentProvider(AppProperties props, ObjectMapper objectMapper) {
        this.props = props;
        this.objectMapper = objectMapper;
    }

    private AppProperties.Paytm paytmProps() {
        return props.paytm();
    }

    @Override
    public String providerCode() {
        return "PAYTM";
    }

    @Override
    public boolean isConfigured() {
        AppProperties.Paytm p = paytmProps();
        return p != null
            && p.mid() != null && !p.mid().isBlank()
            && p.merchantKey() != null && !p.merchantKey().isBlank();
    }

    @Override
    public boolean isWebhookConfigured() {
        return isConfigured();
    }

    @Override
    public boolean isLiveMode() {
        AppProperties.Paytm p = paytmProps();
        return isConfigured() && p != null && "production".equalsIgnoreCase(p.env());
    }

    @Override
    public String getPaymentMode() {
        if (!isConfigured()) return "LOCAL_DEMO";
        return isLiveMode() ? "LIVE_MODE" : "TEST_MODE";
    }

    @Override
    public List<String> supportedMethods() {
        return isConfigured()
            ? List.of("PAYTM_UPI", "PAYTM_WALLET", "CARDS", "NETBANKING", "DYNAMIC_QR")
            : List.of("LOCAL_DEMO_ONLY");
    }

    @Override
    public Map<String, Object> publicConfig() {
        AppProperties.Paytm p = paytmProps();
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("provider", providerCode());
        map.put("displayName", "Paytm Payment Gateway (UPI, Paytm Wallet, QR, Cards)");
        map.put("configured", isConfigured());
        map.put("webhookConfigured", isWebhookConfigured());
        map.put("mode", getPaymentMode());
        map.put("mid", isConfigured() && p != null ? p.mid() : null);
        map.put("environment", p != null && p.env() != null ? p.env() : "staging");
        map.put("methods", supportedMethods());
        return map;
    }

    private String baseHost() {
        return isLiveMode() ? "https://securegw.paytm.in" : "https://securegw-stage.paytm.in";
    }

    @Override
    public String createOrderToken(String orderNumber, BigDecimal amountInr) {
        if (!isConfigured()) {
            return "demo_paytm_order_" + orderNumber;
        }
        try {
            AppProperties.Paytm p = paytmProps();
            Map<String, Object> txnAmount = Map.of(
                "value", amountInr.setScale(2, java.math.RoundingMode.HALF_UP).toPlainString(),
                "currency", "INR"
            );
            Map<String, Object> bodyNode = new LinkedHashMap<>();
            bodyNode.put("requestType", "Payment");
            bodyNode.put("mid", p.mid());
            bodyNode.put("websiteName", p.website() != null && !p.website().isBlank() ? p.website() : "WEBSTAGING");
            bodyNode.put("orderId", orderNumber);
            bodyNode.put("callbackUrl", p.callbackUrl() != null && !p.callbackUrl().isBlank() ? p.callbackUrl() : "http://localhost:8080/api/webhooks/paytm");
            bodyNode.put("txnAmount", txnAmount);

            String bodyJson = objectMapper.writeValueAsString(bodyNode);
            String signature = hmacSha256Hex(bodyJson, p.merchantKey());

            Map<String, Object> head = Map.of("signature", signature);
            Map<String, Object> payload = Map.of("head", head, "body", bodyNode);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            String url = baseHost() + "/theia/api/v1/initiateTransaction?mid=" + p.mid() + "&orderId=" + orderNumber;
            String raw = restTemplate.postForObject(url, new HttpEntity<>(payload, headers), String.class);
            JsonNode root = objectMapper.readTree(raw);
            String txnToken = root.path("body").path("txnToken").asText("");
            if (txnToken.isBlank()) {
                throw new IllegalStateException("Paytm initiateTransaction did not return a txnToken.");
            }
            return txnToken;
        } catch (Exception e) {
            throw new IllegalStateException("Failed to initialize Paytm Payment Gateway order: " + e.getMessage());
        }
    }

    @Override
    public boolean verifySignature(String orderRef, String paymentRef, String signature) {
        if (!isConfigured() || orderRef == null || paymentRef == null || signature == null) return false;
        String payload = orderRef + "|" + paymentRef;
        return constantTimeEquals(hmacSha256Hex(payload, paytmProps().merchantKey()), signature);
    }

    @Override
    public Map<String, String> initiateRefund(String paymentId, BigDecimal amountInr) {
        if (!isConfigured()) {
            return Map.of("status", "PENDING_GATEWAY_CONFIGURATION", "refundId", "");
        }
        return Map.of(
            "refundId", "PAYTM_REFUND_" + System.currentTimeMillis(),
            "status", "PENDING_GATEWAY_CONFIGURATION"
        );
    }

    public Map<String, Object> queryTransactionStatus(String orderNumber) {
        if (!isConfigured()) {
            return Map.of("configured", false, "status", "LOCAL_DEMO", "orderId", orderNumber);
        }
        try {
            AppProperties.Paytm p = paytmProps();
            Map<String, Object> bodyNode = Map.of("mid", p.mid(), "orderId", orderNumber);
            String signature = hmacSha256Hex(objectMapper.writeValueAsString(bodyNode), p.merchantKey());
            Map<String, Object> payload = Map.of("head", Map.of("signature", signature), "body", bodyNode);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            String raw = restTemplate.postForObject(baseHost() + "/v3/order/status", new HttpEntity<>(payload, headers), String.class);
            JsonNode resNode = objectMapper.readTree(raw);
            return Map.of(
                "configured", true,
                "orderId", orderNumber,
                "resultStatus", resNode.path("body").path("resultInfo").path("resultStatus").asText("UNKNOWN"),
                "txnId", resNode.path("body").path("txnId").asText("")
            );
        } catch (Exception e) {
            return Map.of("configured", true, "orderId", orderNumber, "error", e.getMessage());
        }
    }

    public String hmacSha256Hex(String data, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] raw = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : raw) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException("Paytm signature calculation failed", e);
        }
    }

    private boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null) return false;
        return MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8));
    }
}
