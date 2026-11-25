package com.missioncart;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.missioncart.budget.BudgetPlannerService;
import com.missioncart.budget.BudgetPlannerService.BudgetSummary;
import com.missioncart.config.AppProperties;
import com.missioncart.missions.MissionItem;
import com.missioncart.payments.RazorpayService;
import com.missioncart.products.Product;
import com.missioncart.products.ProductRepository;
import com.missioncart.users.User;
import com.missioncart.users.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = {
    "missioncart.razorpay.key-id=rzp_test_missioncart123",
    "missioncart.razorpay.key-secret=rzp_test_secret_abc123456",
    "missioncart.razorpay.webhook-secret=rzp_webhook_secret_xyz789"
})
class UniversalMissionBudgetAndPaymentTests {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired ProductRepository productRepo;
    @Autowired UserRepository userRepo;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired BudgetPlannerService budgetService;
    @MockitoSpyBean RazorpayService razorpayService;

    private String registerCustomer(String prefix) throws Exception {
        String email = prefix + System.nanoTime() + "@missioncart.local";
        MvcResult res = mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "email", email,
                    "password", "StrongPass@123",
                    "fullName", "Test Buyer"
                ))))
            .andExpect(status().isOk())
            .andReturn();
        return objectMapper.readTree(res.getResponse().getContentAsString()).path("data").path("accessToken").asText();
    }

    @Test
    void universalPlannerHandles20DiverseSituationsWithoutHallucinatingProducts() throws Exception {
        List<String> twentySituations = List.of(
            "I need affordable furniture and lighting for my small bedroom within ₹9,000.",
            "I'm a college student building a productive study setup within ₹8,000.",
            "Suggest outfits and accessories for a five-day trip to Manali within ₹7,000.",
            "I need a complete oily skincare routine under ₹2,000.",
            "I need smart fashion outfits and formal shoes under ₹6,000.",
            "I need a complete kitchen setup for three people under ₹6,000.",
            "I need products for a beginner home workout under ₹3,000.",
            "I need everyday electronics like power strip, headphones and power bank under ₹5,000.",
            "I need a budget-friendly wedding outfit with accessories within ₹6,000.",
            "I need to organize a birthday party for 30 people under ₹5,000.",
            "I am moving into a new house. Help me buy essentials within ₹15,000.",
            "I need monthly grocery staples like coffee, tea, and oats within ₹1,500.",
            "I want to create a productive work-from-home desk setup within ₹6,000.",
            "I need pet essentials for my puppy under ₹2,000.",
            "Suggest a suitable gift for my best friend's birthday under ₹1,500.",
            "Help me prepare for my first office job within ₹10,000.",
            "I need compact storage solutions for my closet within ₹2,500.",
            "I want a home entertainment speaker and cozy lighting setup within ₹4,000.",
            "I am preparing for an outdoor weekend camping trip within ₹5,000.",
            "I am hosting an evening pottery and chai gathering on my balcony within ₹3,000."
        );

        assertThat(twentySituations).hasSize(20);

        for (String prompt : twentySituations) {
            MvcResult res = mockMvc.perform(post("/api/missions/plan")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(Map.of("prompt", prompt))))
                .andExpect(status().isOk())
                .andReturn();
            JsonNode mission = objectMapper.readTree(res.getResponse().getContentAsString()).path("data");
            assertThat(mission.path("id").asLong()).isPositive();
            // Every recommended product ID must exist in DB
            for (JsonNode item : mission.path("items")) {
                assertThat(productRepo.existsById(item.path("productId").asLong())).isTrue();
            }
            // Note: pet essentials / camping tent may honestly return unmatchedRequirements rather than fake matches
            int totalSignals = mission.path("items").size() + mission.path("unmatchedRequirements").size();
            assertThat(totalSignals).isGreaterThan(0);
        }
    }

    @Test
    void budgetEngineHandlesMissingExpiredPricesShippingTaxesCouponsAndDuplicates() {
        Product pricedKettle = productRepo.findBySkuIgnoreCase("MC-ELEC-001").orElseThrow();
        Product unavailableOpenProd = new Product();
        unavailableOpenProd.setSku("UNAVAIL-1");
        unavailableOpenProd.setName("Unpriced Open Product");
        unavailableOpenProd.setPrice(null);
        unavailableOpenProd.setPriceStatus("UNAVAILABLE");

        Product expiredProd = new Product();
        expiredProd.setSku("EXP-1");
        expiredProd.setName("Expired Price Product");
        expiredProd.setPrice(BigDecimal.valueOf(500));
        expiredProd.setPriceStatus("EXPIRED");

        MissionItem i1 = new MissionItem();
        i1.setProductId(pricedKettle.getId());
        i1.setPriority("ESSENTIAL");
        i1.setQuantity(1);
        i1.setSelected(true);

        // Duplicate product item should never double-count
        MissionItem i1Dup = new MissionItem();
        i1Dup.setProductId(pricedKettle.getId());
        i1Dup.setPriority("ESSENTIAL");
        i1Dup.setQuantity(1);
        i1Dup.setSelected(true);

        MissionItem iUnavail = new MissionItem();
        iUnavail.setProductId(999991L);
        iUnavail.setPriority("OPTIONAL");
        iUnavail.setQuantity(1);
        iUnavail.setSelected(true);

        MissionItem iExp = new MissionItem();
        iExp.setProductId(999992L);
        iExp.setPriority("OPTIONAL");
        iExp.setQuantity(1);
        iExp.setSelected(true);

        Map<Long, Product> map = Map.of(
            pricedKettle.getId(), pricedKettle,
            999991L, unavailableOpenProd,
            999992L, expiredProd
        );

        // ₹5,000 budget check
        BudgetSummary summary = budgetService.calculateWithCoupon(
            BigDecimal.valueOf(5000),
            List.of(i1, i1Dup, iUnavail, iExp),
            map,
            BigDecimal.valueOf(100)
        );
        // Kettle ₹1299 (counted once!), shipping ₹0 (>=999), tax 18% of 1299 = ₹233.82, coupon ₹100
        assertThat(summary.productSubtotal()).isEqualByComparingTo("1299.00");
        assertThat(summary.shippingCost()).isEqualByComparingTo("0.00");
        assertThat(summary.applicableTaxes()).isEqualByComparingTo("233.82");
        assertThat(summary.finalPayable()).isEqualByComparingTo("1432.82");
        assertThat(summary.remainingBudget()).isEqualByComparingTo("3567.18");
        assertThat(summary.unpricedItemCount()).isEqualTo(2);
        assertThat(summary.affordableConfirmed()).isFalse();

        // ₹1,000 budget overflow check
        BudgetSummary tight = budgetService.calculate(BigDecimal.valueOf(1000), List.of(i1), Map.of(pricedKettle.getId(), pricedKettle));
        assertThat(tight.overBudget()).isTrue();
        assertThat(tight.remainingBudget()).isNegative();
    }

    @Test
    void razorpayTestModeSignatureWebhookIdempotencyRefundAndSecurityChecks() throws Exception {
        doReturn("order_rzp_test_999").when(razorpayService).createProviderOrder(any(), any());
        doReturn(Map.of("refundId", "rfnd_test_001", "status", "PROCESSED"))
            .when(razorpayService).initiateGatewayRefund(any(), any());
        // Payment config never exposes secret keys
        mockMvc.perform(get("/api/payments/config"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.mode").value("TEST_MODE"))
            .andExpect(jsonPath("$.data.razorpayConfigured").value(true))
            .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("rzp_test_secret"))));

        String buyerAToken = registerCustomer("buyera");
        String buyerBToken = registerCustomer("buyerb");

        Product strip = productRepo.findBySkuIgnoreCase("MC-ELEC-002").orElseThrow();
        int initialStock = strip.getStockQuantity();

        mockMvc.perform(post("/api/cart/items")
                .header("Authorization", "Bearer " + buyerAToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("productId", strip.getId(), "quantity", 1))))
            .andExpect(status().isOk());

        // Invalid PIN rejected
        mockMvc.perform(post("/api/checkout")
                .header("Authorization", "Bearer " + buyerAToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "shippingAddress", Map.of("recipientName", "A", "postalCode", "00012"),
                    "idempotencyKey", "bad-pin-test"
                ))))
            .andExpect(status().isBadRequest());

        String idemKey = "rzp-idem-" + System.nanoTime();
        MvcResult initRes = mockMvc.perform(post("/api/checkout")
                .header("Authorization", "Bearer " + buyerAToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "shippingAddress", Map.of("recipientName", "Buyer A", "city", "Bengaluru", "postalCode", "560038"),
                    "idempotencyKey", idemKey
                ))))
            .andExpect(status().isOk())
            .andReturn();

        JsonNode initJson = objectMapper.readTree(initRes.getResponse().getContentAsString()).path("data");
        long orderId = initJson.path("order").path("id").asLong();
        String rzpOrderId = initJson.path("payment").path("providerOrderId").asText();
        BigDecimal serverTotal = initJson.path("order").path("totalAmount").decimalValue();

        // Duplicate order with same idempotency key returns same order ID
        MvcResult dupRes = mockMvc.perform(post("/api/checkout")
                .header("Authorization", "Bearer " + buyerAToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "shippingAddress", Map.of("recipientName", "Buyer A", "city", "Bengaluru", "postalCode", "560038"),
                    "idempotencyKey", idemKey
                ))))
            .andExpect(status().isOk())
            .andReturn();
        assertThat(objectMapper.readTree(dupRes.getResponse().getContentAsString()).path("data").path("order").path("id").asLong()).isEqualTo(orderId);

        // Invalid Razorpay signature rejected
        mockMvc.perform(post("/api/payments/verify")
                .header("Authorization", "Bearer " + buyerAToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "orderId", orderId,
                    "razorpayOrderId", rzpOrderId,
                    "razorpayPaymentId", "pay_test_111",
                    "razorpaySignature", "tampered_invalid_sig"
                ))))
            .andExpect(status().isBadRequest());

        // Payment amount mismatch rejected
        mockMvc.perform(post("/api/payments/verify")
                .header("Authorization", "Bearer " + buyerAToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "orderId", orderId,
                    "razorpayOrderId", rzpOrderId,
                    "razorpayPaymentId", "pay_test_111",
                    "razorpaySignature", razorpayService.hmacSha256Hex(rzpOrderId + "|pay_test_111", "rzp_test_secret_abc123456"),
                    "paidAmountInr", 1.00
                ))))
            .andExpect(status().isBadRequest());

        // Valid Razorpay Test Mode HMAC signature confirms order & deducts stock once
        String validSig = razorpayService.hmacSha256Hex(rzpOrderId + "|pay_test_111", "rzp_test_secret_abc123456");
        mockMvc.perform(post("/api/payments/verify")
                .header("Authorization", "Bearer " + buyerAToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "orderId", orderId,
                    "razorpayOrderId", rzpOrderId,
                    "razorpayPaymentId", "pay_test_111",
                    "razorpaySignature", validSig,
                    "paidAmountInr", serverTotal
                ))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.order.status").value("CONFIRMED"))
            .andExpect(jsonPath("$.data.payment.status").value("CAPTURED"));

        assertThat(productRepo.findById(strip.getId()).orElseThrow().getStockQuantity()).isEqualTo(initialStock - 1);

        // Duplicate webhook notification does NOT deduct stock twice
        String webhookBody = objectMapper.writeValueAsString(Map.of(
            "event", "payment.captured",
            "payload", Map.of("payment", Map.of("entity", Map.of(
                "id", "pay_test_111",
                "order_id", rzpOrderId,
                "amount", serverTotal.multiply(BigDecimal.valueOf(100)).longValueExact()
            )))
        ));
        String whSig = razorpayService.hmacSha256Hex(webhookBody, "rzp_webhook_secret_xyz789");
        mockMvc.perform(post("/api/webhooks/razorpay")
                .header("X-Razorpay-Signature", whSig)
                .contentType(MediaType.APPLICATION_JSON)
                .content(webhookBody))
            .andExpect(status().isOk());

        assertThat(productRepo.findById(strip.getId()).orElseThrow().getStockQuantity()).isEqualTo(initialStock - 1);

        // Security: Buyer B cannot view Buyer A's order or invoice
        mockMvc.perform(get("/api/orders/" + orderId).header("Authorization", "Bearer " + buyerBToken))
            .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/orders/" + orderId + "/invoice").header("Authorization", "Bearer " + buyerBToken))
            .andExpect(status().isBadRequest());

        // Buyer A can retrieve GST invoice
        mockMvc.perform(get("/api/orders/" + orderId + "/invoice").header("Authorization", "Bearer " + buyerAToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.orderNumber").isNotEmpty())
            .andExpect(jsonPath("$.data.totalAmount").value(serverTotal.doubleValue()));

        // Buyer A can request refund through gateway adapter
        mockMvc.perform(post("/api/orders/" + orderId + "/refund")
                .header("Authorization", "Bearer " + buyerAToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("reason", "Changed mind"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.order.status").value("REFUNDED"))
            .andExpect(jsonPath("$.data.payment.refundId").value("rfnd_test_001"));

        // Dynamic Order-Specific UPI QR & Payment Status endpoints
        mockMvc.perform(post("/api/payments/qr")
                .header("Authorization", "Bearer " + buyerAToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("orderId", orderId, "provider", "PAYTM"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.upiIntentUri").isNotEmpty())
            .andExpect(jsonPath("$.data.qrCodeUrl").isNotEmpty())
            .andExpect(jsonPath("$.data.qrExpiresAt").isNotEmpty());

        mockMvc.perform(get("/api/payments/" + orderId + "/status")
                .header("Authorization", "Bearer " + buyerAToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.orderId").value(orderId));

        mockMvc.perform(get("/api/payments/config"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.paytmConfigured").value(false))
            .andExpect(jsonPath("$.data.providers").isArray());
    }

    @Test
    void dairySearchExcludesBeautyItemsAndRespectsBudget() throws Exception {
        MvcResult res = mockMvc.perform(post("/api/missions/plan")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("prompt", "milk products under 1000"))))
            .andExpect(status().isOk())
            .andReturn();

        JsonNode mission = objectMapper.readTree(res.getResponse().getContentAsString()).path("data");
        assertThat(mission.path("budget").asDouble()).isEqualTo(1000.0);
        assertThat(mission.path("items").size()).isGreaterThan(0);

        for (JsonNode item : mission.path("items")) {
            String prodName = item.path("product").path("name").asText("").toLowerCase();
            String catSlug = item.path("product").path("categorySlug").asText("").toLowerCase();
            assertThat(prodName).doesNotContain("lotion");
            assertThat(prodName).doesNotContain("shampoo");
            assertThat(prodName).doesNotContain("hair cleanser");
            assertThat(catSlug).isNotIn("skincare", "beauty", "personal-care");
            if (!item.path("unitPrice").isNull()) {
                assertThat(item.path("unitPrice").asDouble()).isLessThanOrEqualTo(1000.0);
            }
        }
    }

    @Test
    void brandFilterAndRealHimalayaProductSearchWork() throws Exception {
        MvcResult res = mockMvc.perform(get("/api/products?q=Himalaya&size=12"))
            .andExpect(status().isOk())
            .andReturn();
        JsonNode items = objectMapper.readTree(res.getResponse().getContentAsString()).path("data").path("items");
        assertThat(items.size()).isGreaterThan(0);
        assertThat(items.toString().toLowerCase()).contains("himalaya");

        MvcResult brandRes = mockMvc.perform(get("/api/products?brand=Amul&size=12"))
            .andExpect(status().isOk())
            .andReturn();
        JsonNode brandItems = objectMapper.readTree(brandRes.getResponse().getContentAsString()).path("data").path("items");
        assertThat(brandItems.size()).isGreaterThan(0);
    }

    @Test
    void strictRegistrationValidationWishlistSyncAndSharedMemberRemoval() throws Exception {
        // Weak password rejected
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "email", "bad@missioncart.local",
                    "password", "weak",
                    "fullName", "Bad User",
                    "termsAccepted", true
                ))))
            .andExpect(status().isBadRequest());

        // Mismatched confirmPassword rejected
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "email", "mismatch@missioncart.local",
                    "password", "StrongPass@123",
                    "confirmPassword", "Different@123",
                    "fullName", "Mismatch User",
                    "termsAccepted", true
                ))))
            .andExpect(status().isBadRequest());

        // Invalid mobile number rejected
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "email", "badphone@missioncart.local",
                    "password", "StrongPass@123",
                    "confirmPassword", "StrongPass@123",
                    "phone", "12345",
                    "fullName", "Bad Phone",
                    "termsAccepted", true
                ))))
            .andExpect(status().isBadRequest());

        // Unchecked terms rejected
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "email", "noterms@missioncart.local",
                    "password", "StrongPass@123",
                    "confirmPassword", "StrongPass@123",
                    "fullName", "No Terms",
                    "termsAccepted", false
                ))))
            .andExpect(status().isBadRequest());

        // Valid strict registration + wishlist sync
        MvcResult regRes = mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "email", "strict" + System.nanoTime() + "@missioncart.local",
                    "password", "StrongPass@123",
                    "confirmPassword", "StrongPass@123",
                    "phone", "+91 9876543210",
                    "fullName", "Priya Nair",
                    "termsAccepted", true
                ))))
            .andExpect(status().isOk())
            .andReturn();
        String priyaToken = objectMapper.readTree(regRes.getResponse().getContentAsString()).path("data").path("accessToken").asText();

        Product kettle = productRepo.findBySkuIgnoreCase("MC-ELEC-001").orElseThrow();
        MvcResult syncRes = mockMvc.perform(post("/api/wishlist/sync")
                .header("Authorization", "Bearer " + priyaToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("productIds", List.of(kettle.getId())))))
            .andExpect(status().isOk())
            .andReturn();
        JsonNode synced = objectMapper.readTree(syncRes.getResponse().getContentAsString()).path("data");
        assertThat(synced.size()).isGreaterThanOrEqualTo(1);
        assertThat(synced.get(0).path("id").asLong()).isEqualTo(kettle.getId());
    }

    @Test
    void allGenderFashionSearchFacetsVariantCartAndCustomerPhotos() throws Exception {
        doReturn("order_rzp_fashion_999").when(razorpayService).createProviderOrder(any(), any());

        // 1. Verify fashion facets populate from genuine brand + Amazon India seed
        MvcResult facetsRes = mockMvc.perform(get("/api/products/facets"))
            .andExpect(status().isOk())
            .andReturn();
        JsonNode facets = objectMapper.readTree(facetsRes.getResponse().getContentAsString()).path("data");
        assertThat(facets.path("genders").size()).isGreaterThanOrEqualTo(2);
        assertThat(facets.path("garmentTypes").size()).isGreaterThanOrEqualTo(3);

        // 2. Verify authentic brand skincare packshots & non-duplicated queries
        for (String query : List.of("Himalaya Lip Balm", "Cetaphil", "Vaseline", "floral maxi dress", "men casual shirt", "oversized t-shirt")) {
            MvcResult searchRes = mockMvc.perform(get("/api/products").param("q", query).param("size", "5"))
                .andExpect(status().isOk())
                .andReturn();
            JsonNode items = objectMapper.readTree(searchRes.getResponse().getContentAsString()).path("data").path("items");
            assertThat(items.size()).as("Expected matches for query: " + query).isGreaterThan(0);
            assertThat(items.get(0).path("price").asDouble()).isPositive();
            assertThat(items.get(0).path("imageStatus").asText()).isEqualTo("VERIFIED");
        }

        // 3. Open Beauty Facts / Info Database items must NEVER enter cart
        MvcResult infoSearch = mockMvc.perform(get("/api/products").param("sourceType", "PRODUCT_INFORMATION_DATABASE").param("size", "2"))
            .andExpect(status().isOk())
            .andReturn();
        JsonNode infoItems = objectMapper.readTree(infoSearch.getResponse().getContentAsString()).path("data").path("items");
        String buyerToken = registerCustomer("fashionbuyer");
        if (infoItems.size() > 0) {
            long infoId = infoItems.get(0).path("id").asLong();
            mockMvc.perform(post("/api/cart/items")
                    .header("Authorization", "Bearer " + buyerToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(Map.of("productId", infoId, "quantity", 1))))
                .andExpect(status().isBadRequest());
        }

        // 3b. External brand/marketplace item goes to Flow B externalRetailerGroups cleanly and cannot checkout natively
        MvcResult extSearch = mockMvc.perform(get("/api/products").param("sourceType", "MANUFACTURER").param("size", "2"))
            .andExpect(status().isOk())
            .andReturn();
        JsonNode extItems = objectMapper.readTree(extSearch.getResponse().getContentAsString()).path("data").path("items");
        if (extItems.size() > 0) {
            String extToken = registerCustomer("extbuyer");
            long extId = extItems.get(0).path("id").asLong();
            MvcResult extCartRes = mockMvc.perform(post("/api/cart/items")
                    .header("Authorization", "Bearer " + extToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(Map.of("productId", extId, "quantity", 1))))
                .andExpect(status().isOk())
                .andReturn();
            JsonNode extCart = objectMapper.readTree(extCartRes.getResponse().getContentAsString()).path("data");
            assertThat(extCart.path("externalRetailerGroups").size()).isEqualTo(1);
            assertThat(extCart.path("externalRetailerGroups").get(0).path("subtotal").asDouble()).isPositive();
            mockMvc.perform(post("/api/checkout")
                    .header("Authorization", "Bearer " + extToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(Map.of(
                        "provider", "RAZORPAY",
                        "shippingAddress", Map.of("recipientName", "Ext Buyer", "postalCode", "560001")
                    ))))
                .andExpect(status().isBadRequest());
        }

        // 4. External fashion variant persists size/color, and native MissionCart Direct item completes checkout + buyer photo review
        Product nativeKettle = productRepo.findBySkuIgnoreCase("MC-ELEC-001").orElseThrow();
        Product extFashion = productRepo.findBySkuIgnoreCase("MC-FASH-001").orElse(null);
        if (extFashion != null) {
            MvcResult fashCartRes = mockMvc.perform(post("/api/cart/items")
                    .header("Authorization", "Bearer " + buyerToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(Map.of(
                        "productId", extFashion.getId(),
                        "quantity", 1,
                        "selectedSize", "M",
                        "selectedColor", "Burgundy"
                    ))))
                .andExpect(status().isOk())
                .andReturn();
            JsonNode fashCart = objectMapper.readTree(fashCartRes.getResponse().getContentAsString()).path("data");
            assertThat(fashCart.path("activeItems").get(0).path("selectedSize").asText()).isEqualTo("M");
        }
        long targetProdId = nativeKettle.getId();

        MvcResult addRes = mockMvc.perform(post("/api/cart/items")
                .header("Authorization", "Bearer " + buyerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "productId", targetProdId,
                    "quantity", 1,
                    "selectedSize", "1.5L",
                    "selectedColor", "Brushed Steel"
                ))))
            .andExpect(status().isOk())
            .andReturn();
        JsonNode cartData = objectMapper.readTree(addRes.getResponse().getContentAsString()).path("data");
        assertThat(cartData.path("infoDatabaseItems").size()).isEqualTo(0);

        MvcResult checkoutRes = mockMvc.perform(post("/api/checkout")
                .header("Authorization", "Bearer " + buyerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "provider", "RAZORPAY",
                    "idempotencyKey", "var-check-" + System.nanoTime(),
                    "shippingAddress", Map.of(
                        "recipientName", "Kavya Menon",
                        "phone", "+91 9876543210",
                        "line1", "MG Road",
                        "city", "Bengaluru",
                        "state", "Karnataka",
                        "postalCode", "560001",
                        "country", "India"
                    )
                ))))
            .andExpect(status().isOk())
            .andReturn();
        JsonNode orderData = objectMapper.readTree(checkoutRes.getResponse().getContentAsString()).path("data");
        long orderId = orderData.path("order").path("id").asLong();
        String rzpOrderId = orderData.path("payment").path("providerOrderId").asText();
        String validSig = razorpayService.hmacSha256Hex(rzpOrderId + "|pay_real_variant_1", "rzp_test_secret_abc123456");

        mockMvc.perform(post("/api/payments/verify")
                .header("Authorization", "Bearer " + buyerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "orderId", orderId,
                    "razorpayOrderId", rzpOrderId,
                    "razorpayPaymentId", "pay_real_variant_1",
                    "razorpaySignature", validSig,
                    "simulateFailure", false
                ))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.order.status").value("CONFIRMED"));

        MvcResult orderDetailRes = mockMvc.perform(get("/api/orders/" + orderId)
                .header("Authorization", "Bearer " + buyerToken))
            .andExpect(status().isOk())
            .andReturn();
        long orderItemId = objectMapper.readTree(orderDetailRes.getResponse().getContentAsString())
            .path("data").path("items").get(0).path("id").asLong();

        // Buyer uploads received-product photo (stored separately in review_photos, never overwriting primary packshot)
        mockMvc.perform(post("/api/orders/" + orderId + "/items/" + orderItemId + "/review-photo")
                .header("Authorization", "Bearer " + buyerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "rating", 5,
                    "title", "Looks great in person",
                    "comment", "Neat stitching and color",
                    "caption", "Arrived safely in eco parcel",
                    "imageDataUrl", "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
                    "consentGranted", true
                ))))
            .andExpect(status().isOk());

        MvcResult photosRes = mockMvc.perform(get("/api/products/" + targetProdId + "/customer-photos"))
            .andExpect(status().isOk())
            .andReturn();
        JsonNode photos = objectMapper.readTree(photosRes.getResponse().getContentAsString()).path("data");
        assertThat(photos.size()).isGreaterThanOrEqualTo(1);
        assertThat(photos.get(0).path("imageType").asText()).isEqualTo("CUSTOMER_REVIEW_IMAGE");
    }

    @Test
    void editorialCategoriesSmartAiSearchCountriesDataBoutiqueAndZipImportWorkflow() throws Exception {
        // 1. All 8 category editorial pages return unique collage compositions + non-empty metadata
        for (String catSlug : List.of("fashion", "beauty", "home-living", "electronics", "grocery", "travel", "fitness", "study-workspace")) {
            MvcResult edRes = mockMvc.perform(get("/api/categories/" + catSlug + "/editorial").param("country", "IN"))
                .andExpect(status().isOk())
                .andReturn();
            JsonNode ed = objectMapper.readTree(edRes.getResponse().getContentAsString()).path("data");
            assertThat(ed.path("heroHeading").asText()).isNotBlank();
            assertThat(ed.path("heroItalicAccent").asText()).isNotBlank();
            assertThat(ed.path("collections").size()).isGreaterThan(0);
            for (JsonNode col : ed.path("collections")) {
                Set<String> seenTileUrls = new HashSet<>();
                for (JsonNode tile : col.path("collageTiles")) {
                    assertThat(seenTileUrls.add(tile.path("imageUrl").asText()))
                        .as("Collage tile images must be distinct inside collection " + col.path("slug").asText())
                        .isTrue();
                }
            }
        }

        // 2. Countries list & honest availability check + 26 luxury brand connector status
        mockMvc.perform(get("/api/countries"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[?(@.code=='IN')].currencyCode").value("INR"))
            .andExpect(jsonPath("$.data[?(@.code=='FR')].currencyCode").value("EUR"));

        MvcResult luxRes = mockMvc.perform(get("/api/sources/luxury-status").param("country", "FR"))
            .andExpect(status().isOk())
            .andReturn();
        JsonNode luxData = objectMapper.readTree(luxRes.getResponse().getContentAsString()).path("data");
        assertThat(luxData.path("luxuryBrands").size()).isEqualTo(26);

        // 3. Universal AI Search across all 13 test scenarios
        // Category search: "Beauty" -> opens beauty category without creating random mission bundle
        mockMvc.perform(post("/api/ai/search")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("query", "Beauty", "countryCode", "IN"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.intentType").value("CATEGORY_SEARCH"))
            .andExpect(jsonPath("$.data.targetCategorySlug").value("beauty"));

        // Budget-filtered category: "Beauty products under ₹1,000"
        MvcResult beautyBudget = mockMvc.perform(post("/api/ai/search")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("query", "Beauty products under ₹1,000", "countryCode", "IN"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.intentType").value("BUDGET_FILTERED_CATEGORY"))
            .andReturn();
        for (JsonNode p : objectMapper.readTree(beautyBudget.getResponse().getContentAsString()).path("data").path("matchedProducts")) {
            assertThat(p.path("price").asDouble()).isLessThanOrEqualTo(1000.0);
        }

        // Milk disambiguation: "Milk products under ₹1,000" NEVER returns lotion/shampoo/body butter
        MvcResult milkRes = mockMvc.perform(post("/api/ai/search")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("query", "Milk products under ₹1,000", "countryCode", "IN"))))
            .andExpect(status().isOk())
            .andReturn();
        for (JsonNode p : objectMapper.readTree(milkRes.getResponse().getContentAsString()).path("data").path("matchedProducts")) {
            String n = p.path("name").asText().toLowerCase();
            assertThat(n).doesNotContain("lotion").doesNotContain("shampoo").doesNotContain("lip balm").doesNotContain("cleanser");
            assertThat(p.path("price").asDouble()).isLessThanOrEqualTo(1000.0);
        }

        // Fashion & Tech & Purpose queries
        for (String q : List.of(
            "Skincare routine within ₹2,000",
            "Bedroom decoration",
            "Women's dresses under ₹3,000",
            "Men's formal clothing under ₹5,000",
            "Unisex fashion under ₹2,000",
            "Laptop under ₹60,000",
            "Kitchen essentials for three people",
            "Travel products under ₹5,000",
            "Minimal acoustic study corner under ₹4,000"
        )) {
            mockMvc.perform(post("/api/ai/search")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(Map.of("query", q, "countryCode", "IN"))))
                .andExpect(status().isOk());
        }

        // Comparison query
        mockMvc.perform(post("/api/ai/search")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("query", "Compare the best three moisturizers", "countryCode", "IN"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.intentType").value("COMPARISON_SEARCH"));

        // Luxury brand + country query BEFORE French dataset upload -> honest datasetPending = true
        mockMvc.perform(post("/api/ai/search")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("query", "Show me original Chanel bags available in France", "countryCode", "FR"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.intentType").value("BRAND_COUNTRY_SEARCH"))
            .andExpect(jsonPath("$.data.resolvedCountryCode").value("FR"))
            .andExpect(jsonPath("$.data.datasetPending").value(true));

        // 4. ZIP Upload Importer workflow (Admin token -> previewOnly then commit -> unmatched image isolation -> France search finds Chanel bag)
        String adminEmail = "admin-zip-" + System.nanoTime() + "@missioncart.local";
        User adminUser = new User();
        adminUser.setEmail(adminEmail);
        adminUser.setPasswordHash(passwordEncoder.encode("AdminPass@123"));
        adminUser.setFullName("Catalog Admin");
        adminUser.setRole("ADMIN");
        adminUser.setEnabled(true);
        userRepo.save(adminUser);

        MvcResult loginRes = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("email", adminEmail, "password", "AdminPass@123"))))
            .andExpect(status().isOk())
            .andReturn();
        String adminToken = objectMapper.readTree(loginRes.getResponse().getContentAsString()).path("data").path("accessToken").asText();

        ByteArrayOutputStream zipBaos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(zipBaos)) {
            zos.putNextEntry(new ZipEntry("france/chanel_bags.csv"));
            zos.write(("sku,name,brand,category,source_website,country,currency,price,gender,garmentType,description\n" +
                "FR-CHAN-001,Chanel Classic Flap Lambskin Bag,Chanel,fashion,https://chanel.com/,FR,EUR,8900,WOMEN,Handbag,Iconic quilted French lambskin shoulder bag\n")
                .getBytes(StandardCharsets.UTF_8));
            zos.closeEntry();

            byte[] tinyPng = new byte[]{(byte) 137, 80, 78, 71, 13, 10, 26, 10};
            zos.putNextEntry(new ZipEntry("france/images/FR-CHAN-001.png"));
            zos.write(tinyPng);
            zos.closeEntry();

            zos.putNextEntry(new ZipEntry("france/images/ORPHAN-PHOTO-999.png"));
            zos.write(tinyPng);
            zos.closeEntry();
        }
        MockMultipartFile zipUpload = new MockMultipartFile("file", "chanel_fr_catalog.zip", "application/zip", zipBaos.toByteArray());

        mockMvc.perform(multipart("/api/admin/catalog/import-file")
                .file(zipUpload)
                .param("previewOnly", "true")
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.detectedCountry").value("FR"))
            .andExpect(jsonPath("$.data.detectedCurrency").value("EUR"))
            .andExpect(jsonPath("$.data.matchedImageCount").value(1))
            .andExpect(jsonPath("$.data.unmatchedImageCount").value(1));

        mockMvc.perform(multipart("/api/admin/catalog/import-file")
                .file(zipUpload)
                .param("previewOnly", "false")
                .param("autoApproveImages", "true")
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.insertedCount").value(1));

        // Now French Chanel bag search resolves the genuinely imported France record in EUR!
        mockMvc.perform(post("/api/ai/search")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("query", "Show me original Chanel bags available in France", "countryCode", "FR"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.datasetPending").value(false))
            .andExpect(jsonPath("$.data.matchedProducts[0].sku").value("FR-CHAN-001"))
            .andExpect(jsonPath("$.data.matchedProducts[0].currency").value("EUR"));

        // Unmatched image is isolated cleanly in the admin review queue
        mockMvc.perform(get("/api/admin/catalog/unmatched-images")
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].fileName").value("ORPHAN-PHOTO-999.png"));
    }

    @Test
    void allIsoCountriesPersistenceAndHomepageEditorialApi() throws Exception {
        // 1. All 240+ ISO 3166 countries returned cleanly across Asia, Europe, North America, South America, Africa, Oceania
        MvcResult allCountriesRes = mockMvc.perform(get("/api/countries"))
            .andExpect(status().isOk())
            .andReturn();
        JsonNode countriesArr = objectMapper.readTree(allCountriesRes.getResponse().getContentAsString()).path("data");
        assertThat(countriesArr.size()).isGreaterThanOrEqualTo(240);

        for (String region : List.of("Asia", "Europe", "North America", "South America", "Africa", "Oceania")) {
            MvcResult regRes = mockMvc.perform(get("/api/countries").param("region", region))
                .andExpect(status().isOk())
                .andReturn();
            assertThat(objectMapper.readTree(regRes.getResponse().getContentAsString()).path("data").size())
                .as("Expected countries in region " + region).isGreaterThan(0);
        }

        // Verify currency symbols & availability status separation
        mockMvc.perform(get("/api/countries").param("q", "South Korea"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].code").value("KR"))
            .andExpect(jsonPath("$.data[0].currencyCode").value("KRW"))
            .andExpect(jsonPath("$.data[0].currencySymbol").value("₩"))
            .andExpect(jsonPath("$.data[0].availabilityStatus").value("DATASET_PENDING"));

        // 2. Registered user country preference persists cleanly across sessions
        String buyerToken = registerCustomer("countrysync");
        mockMvc.perform(patch("/api/users/country")
                .header("Authorization", "Bearer " + buyerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("preferredCountry", "FR", "preferredDeliveryCountry", "IN"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.preferredCountry").value("FR"))
            .andExpect(jsonPath("$.data.preferredDeliveryCountry").value("IN"));

        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + buyerToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.preferredCountry").value("FR"))
            .andExpect(jsonPath("$.data.preferredDeliveryCountry").value("IN"));

        // 3. Homepage editorial endpoint returns all 14 collections + fashion/beauty collages + 10 category tiles + brands
        MvcResult homeRes = mockMvc.perform(get("/api/home/editorial").param("country", "IN"))
            .andExpect(status().isOk())
            .andReturn();
        JsonNode home = objectMapper.readTree(homeRes.getResponse().getContentAsString()).path("data");
        assertThat(home.path("collections").size()).isEqualTo(14);
        assertThat(home.path("categories").size()).isEqualTo(10);
        assertThat(home.path("fashionCollections").size()).isGreaterThan(0);
        assertThat(home.path("beautyCollections").size()).isGreaterThan(0);
        assertThat(home.path("featuredBrands").size()).isGreaterThan(0);

        for (JsonNode col : home.path("collections")) {
            Set<String> seenUrls = new HashSet<>();
            for (JsonNode tile : col.path("collageTiles")) {
                assertThat(seenUrls.add(tile.path("imageUrl").asText()))
                    .as("No repeated images inside homepage collection " + col.path("slug").asText())
                    .isTrue();
            }
        }
    }
}
