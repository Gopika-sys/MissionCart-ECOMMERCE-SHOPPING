package com.missioncart.users;

import com.missioncart.common.ApiResponse;
import com.missioncart.orders.Order;
import com.missioncart.orders.OrderItem;
import com.missioncart.orders.OrderItemRepository;
import com.missioncart.orders.OrderRepository;
import com.missioncart.products.Review;
import com.missioncart.products.ReviewPhoto;
import com.missioncart.products.ReviewPhotoRepository;
import com.missioncart.products.ReviewRepository;
import com.missioncart.security.AuthenticatedUser;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class UserProfileController {

    private final UserRepository userRepo;
    private final AddressRepository addressRepo;
    private final ReviewRepository reviewRepo;
    private final ReviewPhotoRepository reviewPhotoRepo;
    private final OrderRepository orderRepo;
    private final OrderItemRepository orderItemRepo;

    public UserProfileController(
        UserRepository userRepo,
        AddressRepository addressRepo,
        ReviewRepository reviewRepo,
        ReviewPhotoRepository reviewPhotoRepo,
        OrderRepository orderRepo,
        OrderItemRepository orderItemRepo
    ) {
        this.userRepo = userRepo;
        this.addressRepo = addressRepo;
        this.reviewRepo = reviewRepo;
        this.reviewPhotoRepo = reviewPhotoRepo;
        this.orderRepo = orderRepo;
        this.orderItemRepo = orderItemRepo;
    }

    public record UpdateProfileRequest(String fullName, String phone, String avatarUrl) {}
    public record AddressRequest(String label, String recipientName, String phone, String line1, String line2, String city, String state, String postalCode, boolean defaultAddress) {}
    public record CreateReviewRequest(Long productId, int rating, String title, String comment) {}
    public record UploadReceivedPhotoRequest(int rating, String title, String comment, String caption, String imageDataUrl, boolean consentGranted) {}

    @PatchMapping("/users/profile")
    public ApiResponse<User> updateProfile(@AuthenticationPrincipal AuthenticatedUser principal, @RequestBody UpdateProfileRequest req) {
        User u = userRepo.findById(principal.id()).orElseThrow(() -> new EntityNotFoundException("User not found"));
        if (req.fullName() != null && !req.fullName().isBlank()) u.setFullName(req.fullName().trim());
        if (req.phone() != null) u.setPhone(req.phone().trim());
        if (req.avatarUrl() != null) u.setAvatarUrl(req.avatarUrl().trim());
        u.setPasswordHash(u.getPasswordHash());
        userRepo.save(u);
        u.setPasswordHash("[PROTECTED]");
        return ApiResponse.ok("Profile updated", u);
    }

    @PatchMapping("/users/country")
    public ApiResponse<java.util.Map<String, String>> updateCountryPreference(
        @AuthenticationPrincipal AuthenticatedUser principal,
        @RequestBody java.util.Map<String, String> body
    ) {
        User u = userRepo.findById(principal.id()).orElseThrow(() -> new EntityNotFoundException("User not found"));
        if (body.get("preferredCountry") != null && !body.get("preferredCountry").isBlank()) {
            u.setPreferredCountry(body.get("preferredCountry").trim().toUpperCase());
        }
        if (body.get("preferredDeliveryCountry") != null && !body.get("preferredDeliveryCountry").isBlank()) {
            u.setPreferredDeliveryCountry(body.get("preferredDeliveryCountry").trim().toUpperCase());
        }
        userRepo.save(u);
        return ApiResponse.ok("Country preference saved", java.util.Map.of(
            "preferredCountry", u.getPreferredCountry(),
            "preferredDeliveryCountry", u.getPreferredDeliveryCountry()
        ));
    }

    @GetMapping("/addresses")
    public ApiResponse<List<Address>> listAddresses(@AuthenticationPrincipal AuthenticatedUser principal) {
        return ApiResponse.ok(addressRepo.findByUserIdOrderByDefaultAddressDescIdDesc(principal.id()));
    }

    @PostMapping("/addresses")
    public ApiResponse<Address> addAddress(@AuthenticationPrincipal AuthenticatedUser principal, @RequestBody AddressRequest req) {
        Address a = new Address();
        a.setUserId(principal.id());
        a.setLabel(req.label() != null ? req.label() : "Home");
        a.setRecipientName(req.recipientName());
        a.setPhone(req.phone());
        a.setLine1(req.line1());
        a.setLine2(req.line2());
        a.setCity(req.city());
        a.setState(req.state());
        a.setPostalCode(req.postalCode());
        a.setDefaultAddress(req.defaultAddress());
        return ApiResponse.ok("Address saved", addressRepo.save(a));
    }

    @DeleteMapping("/addresses/{id}")
    public ApiResponse<Void> deleteAddress(@AuthenticationPrincipal AuthenticatedUser principal, @PathVariable Long id) {
        Address a = addressRepo.findById(id).orElseThrow(() -> new EntityNotFoundException("Address not found"));
        if (!a.getUserId().equals(principal.id())) throw new IllegalArgumentException("Not authorized");
        addressRepo.delete(a);
        return ApiResponse.ok("Address deleted", null);
    }

    @GetMapping("/products/{productId}/reviews")
    public ApiResponse<List<Review>> productReviews(@PathVariable Long productId) {
        return ApiResponse.ok(reviewRepo.findByProductIdAndApprovedTrueOrderByCreatedAtDesc(productId));
    }

    @GetMapping("/products/{productId}/customer-photos")
    public ApiResponse<List<ReviewPhoto>> productCustomerPhotos(@PathVariable Long productId) {
        return ApiResponse.ok(reviewPhotoRepo.findByProductIdAndModerationStatusOrderByCreatedAtDesc(productId, "APPROVED"));
    }

    @PostMapping("/reviews")
    public ApiResponse<Review> submitReview(@AuthenticationPrincipal AuthenticatedUser principal, @RequestBody CreateReviewRequest req) {
        Review r = new Review();
        r.setProductId(req.productId());
        r.setUserId(principal.id());
        r.setRating(Math.min(5, Math.max(1, req.rating())));
        r.setTitle(req.title());
        r.setComment(req.comment());
        r.setVerifiedPurchase(false);
        return ApiResponse.ok("Review submitted", reviewRepo.save(r));
    }

    @PostMapping("/orders/{orderId}/items/{itemId}/review-photo")
    @Transactional
    public ApiResponse<ReviewPhoto> uploadReceivedProductPhoto(
        @AuthenticationPrincipal AuthenticatedUser principal,
        @PathVariable Long orderId,
        @PathVariable Long itemId,
        @RequestBody UploadReceivedPhotoRequest req
    ) {
        if (!req.consentGranted()) {
            throw new IllegalArgumentException("Please confirm customer photo display consent before uploading.");
        }
        if (req.imageDataUrl() == null || req.imageDataUrl().isBlank()
            || (!req.imageDataUrl().startsWith("data:image/") && !req.imageDataUrl().startsWith("https://") && !req.imageDataUrl().startsWith("/"))) {
            throw new IllegalArgumentException("Please provide a valid received product image.");
        }

        Order order = orderRepo.findById(orderId).orElseThrow(() -> new EntityNotFoundException("Order not found"));
        if (!order.getUserId().equals(principal.id())) {
            throw new IllegalArgumentException("Only the customer who placed this order can upload received product photos.");
        }
        String st = order.getStatus() == null ? "" : order.getStatus().toUpperCase();
        boolean eligibleOrder = st.equals("CONFIRMED") || st.equals("CONFIRMED_DEMO") || st.equals("DELIVERED") || st.equals("PARTIALLY_REFUNDED");
        if (!eligibleOrder) {
            throw new IllegalStateException("Verified purchase photo reviews are only allowed for confirmed or delivered orders.");
        }

        OrderItem item = orderItemRepo.findById(itemId).orElseThrow(() -> new EntityNotFoundException("Order item not found"));
        if (!item.getOrderId().equals(order.getId())) {
            throw new IllegalArgumentException("Item does not belong to this order.");
        }

        Review r = new Review();
        r.setProductId(item.getProductId());
        r.setUserId(principal.id());
        r.setOrderId(order.getId());
        r.setOrderItemId(item.getId());
        r.setRating(Math.min(5, Math.max(1, req.rating() <= 0 ? 5 : req.rating())));
        r.setTitle(req.title() != null && !req.title().isBlank() ? req.title().trim() : "Verified Purchase Review");
        r.setComment(req.comment() != null && !req.comment().isBlank() ? req.comment().trim() : "Received genuine packaged item.");
        r.setVerifiedPurchase(true);
        r.setConsentGranted(true);
        r.setModerationStatus("APPROVED");
        r.setApproved(true);
        r = reviewRepo.save(r);

        ReviewPhoto photo = new ReviewPhoto();
        photo.setReviewId(r.getId());
        photo.setProductId(item.getProductId());
        photo.setOrderId(order.getId());
        photo.setUserId(principal.id());
        photo.setImageDataUrl(req.imageDataUrl().trim());
        photo.setCaption(req.caption() != null ? req.caption().trim() : "Customer parcel photo");
        photo.setImageType("CUSTOMER_REVIEW_IMAGE");
        photo.setVerifiedPurchase(true);
        photo.setConsentGranted(true);
        photo.setModerationStatus("APPROVED");
        photo = reviewPhotoRepo.save(photo);

        return ApiResponse.ok("Verified purchase photo uploaded", photo);
    }
}
