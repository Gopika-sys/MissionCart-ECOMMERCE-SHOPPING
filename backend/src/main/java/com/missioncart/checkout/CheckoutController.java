package com.missioncart.checkout;

import com.missioncart.checkout.CheckoutAndOrderService.*;
import com.missioncart.common.ApiResponse;
import com.missioncart.payments.PaymentGatewayRouter;
import com.missioncart.payments.PaymentGatewayRouter.DynamicQrResult;
import com.missioncart.security.AuthenticatedUser;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class CheckoutController {

    private final CheckoutAndOrderService service;
    private final PaymentGatewayRouter paymentRouter;

    public CheckoutController(CheckoutAndOrderService service, PaymentGatewayRouter paymentRouter) {
        this.service = service;
        this.paymentRouter = paymentRouter;
    }

    public record CheckoutRequest(Map<String, Object> shippingAddress, String couponCode, Long missionId, String idempotencyKey, String provider) {}
    public record VerifyPaymentRequest(Long orderId, String razorpayOrderId, String razorpayPaymentId, String razorpaySignature, BigDecimal paidAmountInr, boolean simulateFailure) {}
    public record QrRequest(Long orderId, String provider) {}
    public record CancelRequest(String reason) {}
    public record RefundRequest(BigDecimal amount, String reason) {}

    @GetMapping("/payments/config")
    public ApiResponse<Map<String, Object>> paymentConfig() {
        return ApiResponse.ok(paymentRouter.getPublicPaymentConfig());
    }

    @PostMapping("/checkout")
    public ApiResponse<CheckoutInitResponse> checkout(@AuthenticationPrincipal AuthenticatedUser user, @RequestBody CheckoutRequest req) {
        return ApiResponse.ok("Checkout initialized", service.initiateCheckout(user.id(), req.shippingAddress(), req.couponCode(), req.missionId(), req.idempotencyKey(), req.provider()));
    }

    @PostMapping("/payments/create-order")
    public ApiResponse<CheckoutInitResponse> createOrder(@AuthenticationPrincipal AuthenticatedUser user, @RequestBody CheckoutRequest req) {
        return ApiResponse.ok("Payment order created", service.initiateCheckout(user.id(), req.shippingAddress(), req.couponCode(), req.missionId(), req.idempotencyKey(), req.provider()));
    }

    @PostMapping("/payments/qr")
    public ApiResponse<DynamicQrResult> generateQr(@AuthenticationPrincipal AuthenticatedUser user, @RequestBody QrRequest req) {
        return ApiResponse.ok("UPI QR payload generated", service.generateOrderQr(user.id(), req.orderId(), req.provider()));
    }

    @GetMapping("/payments/{orderId}/status")
    public ApiResponse<Map<String, Object>> paymentStatus(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable Long orderId) {
        return ApiResponse.ok(service.getPaymentStatus(user.id(), orderId));
    }

    @PostMapping("/payments/verify")
    public ApiResponse<OrderDetailDto> verify(@AuthenticationPrincipal AuthenticatedUser user, @RequestBody VerifyPaymentRequest req) {
        return ApiResponse.ok("Payment processed", service.verifyPayment(
            user.id(), req.orderId(), req.razorpayOrderId(), req.razorpayPaymentId(), req.razorpaySignature(), req.paidAmountInr(), req.simulateFailure()
        ));
    }

    @PostMapping("/webhooks/razorpay")
    public ApiResponse<Void> webhook(@RequestBody String rawBody, @RequestHeader(value = "X-Razorpay-Signature", required = false) String sig) {
        service.handleRazorpayWebhook(rawBody, sig);
        return ApiResponse.ok("Webhook verified", null);
    }

    @PostMapping("/webhooks/paytm")
    public ApiResponse<Void> paytmWebhook(@RequestBody String rawBody, @RequestHeader(value = "X-Paytm-Signature", required = false) String sig) {
        service.handlePaytmWebhook(rawBody, sig);
        return ApiResponse.ok("Paytm webhook processed", null);
    }

    @GetMapping("/orders")
    public ApiResponse<List<OrderDetailDto>> myOrders(@AuthenticationPrincipal AuthenticatedUser user) {
        return ApiResponse.ok(service.listOrders(user.id()));
    }

    @GetMapping("/orders/{id}")
    public ApiResponse<OrderDetailDto> orderDetail(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable Long id) {
        return ApiResponse.ok(service.getOrderDetail(id, user.id()));
    }

    @PostMapping("/orders/{id}/cancel")
    public ApiResponse<OrderDetailDto> cancelOrder(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable Long id, @RequestBody(required = false) CancelRequest req) {
        return ApiResponse.ok("Order cancelled", service.cancelOrder(user.id(), id, req != null ? req.reason() : null));
    }

    @PostMapping("/orders/{id}/refund")
    public ApiResponse<OrderDetailDto> requestRefund(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable Long id, @RequestBody(required = false) RefundRequest req) {
        return ApiResponse.ok("Refund processed", service.requestRefund(user.id(), id, req != null ? req.amount() : null, req != null ? req.reason() : null));
    }

    @GetMapping("/orders/{id}/invoice")
    public ApiResponse<InvoiceDto> invoice(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable Long id) {
        return ApiResponse.ok(service.generateInvoice(user.id(), id));
    }
}
