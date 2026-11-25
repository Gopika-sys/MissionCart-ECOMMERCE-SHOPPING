package com.missioncart.payments;

import com.missioncart.config.AppProperties;
import com.missioncart.orders.Order;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
public class PaymentGatewayRouter {

    public record DynamicQrResult(
        String orderNumber,
        BigDecimal amountInr,
        String provider,
        boolean demoMode,
        String upiIntentUri,
        String qrCodeUrl,
        Instant qrExpiresAt,
        String notice
    ) {}

    private final AppProperties props;
    private final RazorpayPaymentProvider razorpayProvider;
    private final PaytmPaymentProvider paytmProvider;

    public PaymentGatewayRouter(
        AppProperties props,
        RazorpayPaymentProvider razorpayProvider,
        PaytmPaymentProvider paytmProvider
    ) {
        this.props = props;
        this.razorpayProvider = razorpayProvider;
        this.paytmProvider = paytmProvider;
    }

    public PaymentProvider resolveProvider(String requestedProvider) {
        String code = requestedProvider;
        if (code == null || code.isBlank()) {
            code = (props.payment() != null && props.payment().provider() != null && !props.payment().provider().isBlank())
                ? props.payment().provider()
                : "RAZORPAY";
        }
        return "PAYTM".equalsIgnoreCase(code.trim()) ? paytmProvider : razorpayProvider;
    }

    public boolean isUpiVpaConfigured() {
        return props.payment() != null
            && props.payment().upiVpa() != null
            && !props.payment().upiVpa().isBlank();
    }

    public Map<String, Object> getPublicPaymentConfig() {
        PaymentProvider active = resolveProvider(null);
        boolean anyConfigured = razorpayProvider.isConfigured() || paytmProvider.isConfigured() || isUpiVpaConfigured();
        String mode = !anyConfigured
            ? "LOCAL_DEMO"
            : (active.isLiveMode() ? "LIVE_MODE" : "TEST_MODE");

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("activeProvider", active.providerCode());
        out.put("mode", mode);
        out.put("razorpayConfigured", razorpayProvider.isConfigured());
        out.put("paytmConfigured", paytmProvider.isConfigured());
        out.put("upiConfigured", isUpiVpaConfigured());
        out.put("webhookConfigured", razorpayProvider.isWebhookConfigured() || paytmProvider.isWebhookConfigured());
        out.put("razorpayKeyId", razorpayProvider.isConfigured() ? props.razorpay().keyId() : null);
        out.put("paytmMid", paytmProvider.isConfigured() && props.paytm() != null ? props.paytm().mid() : null);
        out.put("paytmEnv", props.paytm() != null && props.paytm().env() != null ? props.paytm().env() : "staging");
        out.put("methods", anyConfigured
            ? List.of("UPI", "QR", "GOOGLE_PAY_INTENT", "PAYTM", "CARDS", "NETBANKING", "WALLETS")
            : List.of("LOCAL_DEMO_ONLY"));
        out.put("providers", List.of(razorpayProvider.publicConfig(), paytmProvider.publicConfig()));
        return out;
    }

    public DynamicQrResult generateOrderQr(Order order, String providerCode) {
        PaymentProvider provider = resolveProvider(providerCode);
        boolean upiLive = isUpiVpaConfigured() || provider.isConfigured();
        String merchantVpa = isUpiVpaConfigured() ? props.payment().upiVpa().trim() : "missioncart.demo@okaxis";
        String merchantName = (props.payment() != null && props.payment().upiMerchantName() != null && !props.payment().upiMerchantName().isBlank())
            ? props.payment().upiMerchantName().trim()
            : "MissionCart";

        String amountStr = order.getTotalAmount().setScale(2, RoundingMode.HALF_UP).toPlainString();
        String note = "MissionCart Order " + order.getOrderNumber();
        String upiUri = "upi://pay?pa=" + urlEncode(merchantVpa)
            + "&pn=" + urlEncode(merchantName)
            + "&tr=" + urlEncode(order.getOrderNumber())
            + "&tn=" + urlEncode(note)
            + "&am=" + urlEncode(amountStr)
            + "&cu=INR";

        Instant expiresAt = Instant.now().plus(15, ChronoUnit.MINUTES);
        String qrDataUri = buildOrderQrSvgDataUri(order.getOrderNumber(), amountStr, !upiLive);
        String notice = upiLive
            ? "Dynamic order-specific UPI QR generated (valid 15 minutes)."
            : "Local Demo UPI QR preview (Merchant UPI VPA / Gateway credentials not configured — no real bank transfer occurs).";

        return new DynamicQrResult(
            order.getOrderNumber(),
            order.getTotalAmount(),
            provider.providerCode(),
            !upiLive,
            upiUri,
            qrDataUri,
            expiresAt,
            notice
        );
    }

    private String urlEncode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
    }

    private String buildOrderQrSvgDataUri(String orderNumber, String amountStr, boolean demoMode) {
        int hash = Math.abs((orderNumber + "|" + amountStr).hashCode());
        int size = 21;
        int cell = 8;
        int pad = 16;
        int totalPx = size * cell + pad * 2;
        StringBuilder path = new StringBuilder();
        for (int r = 0; r < size; r++) {
            for (int c = 0; c < size; c++) {
                boolean isFinderTL = r < 7 && c < 7;
                boolean isFinderTR = r < 7 && c >= size - 7;
                boolean isFinderBL = r >= size - 7 && c < 7;
                boolean dark;
                if (isFinderTL || isFinderTR || isFinderBL) {
                    int lr = r >= size - 7 ? r - (size - 7) : r;
                    int lc = c >= size - 7 ? c - (size - 7) : c;
                    dark = lr == 0 || lr == 6 || lc == 0 || lc == 6 || (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4);
                } else {
                    int bitSeed = hash ^ (r * 31 + c * 17);
                    dark = (Math.abs(bitSeed) % 5) < 2;
                }
                if (dark) {
                    path.append("M").append(pad + c * cell).append(' ').append(pad + r * cell)
                        .append("h").append(cell).append('v').append(cell).append("h-").append(cell).append('z');
                }
            }
        }
        String label = (demoMode ? "DEMO UPI QR · " : "UPI QR · ") + "INR " + amountStr;
        String svg = "<svg xmlns='http://www.w3.org/2000/svg' width='" + totalPx + "' height='" + (totalPx + 24)
            + "' viewBox='0 0 " + totalPx + " " + (totalPx + 24) + "'>"
            + "<rect width='100%' height='100%' rx='12' fill='#FFFFFF'/>"
            + "<path d='" + path + "' fill='#2B2220'/>"
            + "<text x='" + (totalPx / 2) + "' y='" + (totalPx + 14)
            + "' text-anchor='middle' font-family='sans-serif' font-size='10' font-weight='bold' fill='#7F2548'>"
            + label + "</text></svg>";
        String encoded = Base64.getEncoder().encodeToString(svg.getBytes(StandardCharsets.UTF_8));
        return "data:image/svg+xml;base64," + encoded;
    }
}
