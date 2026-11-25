package com.missioncart.payments;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public interface PaymentProvider {
    String providerCode();
    boolean isConfigured();
    boolean isWebhookConfigured();
    boolean isLiveMode();
    String getPaymentMode();
    List<String> supportedMethods();
    Map<String, Object> publicConfig();
    String createOrderToken(String orderNumber, BigDecimal amountInr);
    boolean verifySignature(String orderRef, String paymentRef, String signature);
    Map<String, String> initiateRefund(String paymentId, BigDecimal amountInr);
}
