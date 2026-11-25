package com.missioncart.payments;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class RazorpayPaymentProvider implements PaymentProvider {

    private final RazorpayService razorpayService;

    public RazorpayPaymentProvider(RazorpayService razorpayService) {
        this.razorpayService = razorpayService;
    }

    @Override
    public String providerCode() {
        return "RAZORPAY";
    }

    @Override
    public boolean isConfigured() {
        return razorpayService.isConfigured();
    }

    @Override
    public boolean isWebhookConfigured() {
        return razorpayService.isWebhookConfigured();
    }

    @Override
    public boolean isLiveMode() {
        return "LIVE_MODE".equals(getPaymentMode());
    }

    @Override
    public String getPaymentMode() {
        return razorpayService.getPaymentMode();
    }

    @Override
    public List<String> supportedMethods() {
        return isConfigured()
            ? List.of("UPI", "QR", "CARDS", "NETBANKING", "WALLETS")
            : List.of("LOCAL_DEMO_ONLY");
    }

    @Override
    public Map<String, Object> publicConfig() {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("provider", providerCode());
        map.put("displayName", "Razorpay (UPI, Cards, NetBanking, Wallets)");
        map.put("configured", isConfigured());
        map.put("webhookConfigured", isWebhookConfigured());
        map.put("mode", getPaymentMode());
        map.put("keyId", isConfigured() ? razorpayService.getKeyId() : null);
        map.put("methods", supportedMethods());
        return map;
    }

    @Override
    public String createOrderToken(String orderNumber, BigDecimal amountInr) {
        return razorpayService.createProviderOrder(orderNumber, amountInr);
    }

    @Override
    public boolean verifySignature(String orderRef, String paymentRef, String signature) {
        return razorpayService.verifyPaymentSignature(orderRef, paymentRef, signature);
    }

    @Override
    public Map<String, String> initiateRefund(String paymentId, BigDecimal amountInr) {
        return razorpayService.initiateGatewayRefund(paymentId, amountInr);
    }
}
