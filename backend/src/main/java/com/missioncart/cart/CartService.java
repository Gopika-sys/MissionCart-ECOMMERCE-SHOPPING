package com.missioncart.cart;

import com.missioncart.categories.Brand;
import com.missioncart.categories.BrandRepository;
import com.missioncart.categories.Category;
import com.missioncart.categories.CategoryRepository;
import com.missioncart.compatibility.CompatibilityEngine;
import com.missioncart.compatibility.CompatibilityEngine.CompatibilityReport;
import com.missioncart.products.Product;
import com.missioncart.products.ProductDtos.ProductDto;
import com.missioncart.products.ProductRepository;
import com.missioncart.products.ProductService;
import com.missioncart.products.ProductVariant;
import com.missioncart.products.ProductVariantRepository;
import com.missioncart.retailers.RetailerSource;
import com.missioncart.retailers.RetailerSourceRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class CartService {

    public record CartItemView(
        Long id,
        Long productId,
        Long variantId,
        String selectedSize,
        String selectedColor,
        Long missionId,
        int quantity,
        boolean savedForLater,
        BigDecimal unitPrice,
        BigDecimal lineTotal,
        boolean nativeCheckoutEligible,
        String sourceType,
        ProductDto product
    ) {}

    public record RetailerCartGroup(
        String sourceCode,
        String sourceName,
        String sourceType,
        String officialWebsite,
        boolean nativeCheckout,
        BigDecimal subtotal,
        int unavailablePriceCount,
        List<CartItemView> items
    ) {}

    public record CartSummaryDto(
        Long cartId,
        List<CartItemView> activeItems,
        List<CartItemView> savedForLaterItems,
        List<RetailerCartGroup> externalRetailerGroups,
        List<CartItemView> infoDatabaseItems,
        BigDecimal nativeSubtotal,
        BigDecimal externalSubtotal,
        BigDecimal grandTotal,
        String currency,
        CompatibilityReport compatibilityReport
    ) {}

    private final CartRepository cartRepo;
    private final CartItemRepository itemRepo;
    private final WishlistRepository wishlistRepo;
    private final WishlistItemRepository wishlistItemRepo;
    private final ProductRepository productRepo;
    private final ProductVariantRepository variantRepo;
    private final CategoryRepository categoryRepo;
    private final BrandRepository brandRepo;
    private final RetailerSourceRepository retailerRepo;
    private final ProductService productService;
    private final CompatibilityEngine compatibilityEngine;

    public CartService(
        CartRepository cartRepo,
        CartItemRepository itemRepo,
        WishlistRepository wishlistRepo,
        WishlistItemRepository wishlistItemRepo,
        ProductRepository productRepo,
        ProductVariantRepository variantRepo,
        CategoryRepository categoryRepo,
        BrandRepository brandRepo,
        RetailerSourceRepository retailerRepo,
        ProductService productService,
        CompatibilityEngine compatibilityEngine
    ) {
        this.cartRepo = cartRepo;
        this.itemRepo = itemRepo;
        this.wishlistRepo = wishlistRepo;
        this.wishlistItemRepo = wishlistItemRepo;
        this.productRepo = productRepo;
        this.variantRepo = variantRepo;
        this.categoryRepo = categoryRepo;
        this.brandRepo = brandRepo;
        this.retailerRepo = retailerRepo;
        this.productService = productService;
        this.compatibilityEngine = compatibilityEngine;
    }

    public CartSummaryDto getCart(Long userId) {
        Cart cart = getOrCreateCart(userId);
        List<CartItem> rawItems = itemRepo.findByCartIdOrderByCreatedAtAsc(cart.getId());
        Map<Long, Product> productMap = productRepo.findAllById(rawItems.stream().map(CartItem::getProductId).toList())
            .stream().collect(Collectors.toMap(Product::getId, p -> p));
        List<Long> varIds = rawItems.stream().map(CartItem::getVariantId).filter(Objects::nonNull).toList();
        Map<Long, ProductVariant> variantMap = varIds.isEmpty() ? Map.of() : variantRepo.findAllById(varIds)
            .stream().collect(Collectors.toMap(ProductVariant::getId, v -> v));

        Map<Long, Category> catMap = categoryRepo.findAll().stream().collect(Collectors.toMap(Category::getId, c -> c));
        Map<Long, Brand> brandMap = brandRepo.findAll().stream().collect(Collectors.toMap(Brand::getId, b -> b));
        Map<String, RetailerSource> sourceMap = retailerRepo.findAll().stream()
            .collect(Collectors.toMap(s -> s.getCode().toUpperCase(), s -> s, (a, b) -> a));

        List<CartItemView> active = new ArrayList<>();
        List<CartItemView> saved = new ArrayList<>();
        List<CartItemView> infoDbItems = new ArrayList<>();
        BigDecimal nativeSub = BigDecimal.ZERO;
        BigDecimal externalSub = BigDecimal.ZERO;
        Map<String, List<CartItemView>> extGrouped = new LinkedHashMap<>();

        for (CartItem ci : rawItems) {
            Product p = productMap.get(ci.getProductId());
            if (p == null) continue;
            ProductDto pdto = productService.toDto(p, catMap.get(p.getCategoryId()), p.getBrandId() != null ? brandMap.get(p.getBrandId()) : null, false, sourceMap);
            ProductVariant variant = ci.getVariantId() != null ? variantMap.get(ci.getVariantId()) : null;

            BigDecimal unit = (variant != null && variant.getPrice() != null && variant.getPrice().compareTo(BigDecimal.ZERO) > 0)
                ? variant.getPrice()
                : (p.getPrice() != null && p.getPrice().compareTo(BigDecimal.ZERO) > 0 ? p.getPrice() : null);
            BigDecimal line = unit != null ? unit.multiply(BigDecimal.valueOf(ci.getQuantity())) : null;

            RetailerSource src = p.getSourcePlatform() != null ? sourceMap.get(p.getSourcePlatform().toUpperCase()) : null;
            String sourceType = src != null ? src.getSourceType() : "RETAILER";
            boolean isInfoDb = "PRODUCT_INFORMATION_DATABASE".equalsIgnoreCase(sourceType);
            boolean isNative = "MISSIONCART_DIRECT".equalsIgnoreCase(p.getProductType()) || "SELLER_MANAGED".equalsIgnoreCase(p.getProductType());

            CartItemView view = new CartItemView(
                ci.getId(), p.getId(), ci.getVariantId(), ci.getSelectedSize(), ci.getSelectedColor(),
                ci.getMissionId(), ci.getQuantity(), ci.isSavedForLater(), unit, line, isNative, sourceType, pdto
            );

            if (ci.isSavedForLater()) {
                saved.add(view);
            } else if (isInfoDb) {
                infoDbItems.add(view);
            } else {
                active.add(view);
                if (isNative && line != null) {
                    nativeSub = nativeSub.add(line);
                } else if (!isNative) {
                    if (line != null) externalSub = externalSub.add(line);
                    extGrouped.computeIfAbsent(p.getSourcePlatform(), k -> new ArrayList<>()).add(view);
                }
            }
        }

        List<RetailerCartGroup> externalGroups = new ArrayList<>();
        for (Map.Entry<String, List<CartItemView>> entry : extGrouped.entrySet()) {
            RetailerSource src = sourceMap.get(entry.getKey().toUpperCase());
            if (src != null && "PRODUCT_INFORMATION_DATABASE".equalsIgnoreCase(src.getSourceType())) {
                continue;
            }
            BigDecimal sub = entry.getValue().stream().map(CartItemView::lineTotal).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
            int unavailCount = (int) entry.getValue().stream().filter(it -> it.unitPrice() == null).count();
            externalGroups.add(new RetailerCartGroup(
                entry.getKey(),
                src != null ? src.getName() : entry.getKey(),
                src != null ? src.getSourceType() : "RETAILER",
                src != null ? src.getOfficialWebsite() : "",
                src != null && src.isNativeCheckout(),
                sub,
                unavailCount,
                entry.getValue()
            ));
        }

        CompatibilityReport report = compatibilityEngine.evaluate(
            active.stream().map(CartItemView::productId).toList(), Map.of()
        );

        return new CartSummaryDto(
            cart.getId(), active, saved, externalGroups, infoDbItems,
            nativeSub, externalSub, nativeSub.add(externalSub), "INR", report
        );
    }

    @Transactional
    public CartSummaryDto addItem(Long userId, Long productId, int quantity, Long missionId) {
        return addItem(userId, productId, quantity, missionId, null, null, null);
    }

    @Transactional
    public CartSummaryDto addItem(Long userId, Long productId, int quantity, Long missionId, Long variantId, String selectedSize, String selectedColor) {
        Product p = productRepo.findById(productId)
            .orElseThrow(() -> new EntityNotFoundException("Product not found"));
        RetailerSource src = p.getSourcePlatform() != null ? retailerRepo.findByCodeIgnoreCase(p.getSourcePlatform()).orElse(null) : null;
        if (src != null && "PRODUCT_INFORMATION_DATABASE".equalsIgnoreCase(src.getSourceType())) {
            throw new IllegalArgumentException("Information database records cannot be added for checkout. Save this product to your Wishlist for reference.");
        }

        List<ProductVariant> variants = variantRepo.findByProductIdOrderByDefaultVariantDescIdAsc(p.getId());
        ProductVariant resolvedVariant = null;
        if (variantId != null) {
            resolvedVariant = variantRepo.findById(variantId)
                .orElseThrow(() -> new EntityNotFoundException("Selected size/color variant not found"));
            if (!resolvedVariant.getProductId().equals(p.getId())) {
                throw new IllegalArgumentException("Variant does not belong to this product.");
            }
        } else if (!variants.isEmpty() && (selectedSize != null || selectedColor != null)) {
            resolvedVariant = variants.stream()
                .filter(v -> (selectedSize == null || selectedSize.equalsIgnoreCase(v.getSize()))
                    && (selectedColor == null || selectedColor.equalsIgnoreCase(v.getColor())))
                .findFirst().orElse(null);
        } else if (!variants.isEmpty()) {
            resolvedVariant = variants.stream().filter(v -> v.getStockQuantity() > 0 && "IN_STOCK".equalsIgnoreCase(v.getAvailabilityStatus()))
                .findFirst().orElse(variants.get(0));
        }

        int reqQty = Math.max(1, quantity);
        if (resolvedVariant != null) {
            if (!"IN_STOCK".equalsIgnoreCase(resolvedVariant.getAvailabilityStatus()) || resolvedVariant.getStockQuantity() < reqQty) {
                throw new IllegalStateException("Selected variant (" + (resolvedVariant.getSize() != null ? resolvedVariant.getSize() : resolvedVariant.getVariantName()) + ") is currently out of stock.");
            }
        } else if (!"IN_STOCK".equalsIgnoreCase(p.getAvailabilityStatus()) || p.getStockQuantity() < reqQty) {
            throw new IllegalStateException(p.getName() + " is currently out of stock.");
        }

        Long vId = resolvedVariant != null ? resolvedVariant.getId() : null;
        String finalSize = resolvedVariant != null && resolvedVariant.getSize() != null ? resolvedVariant.getSize() : selectedSize;
        String finalColor = resolvedVariant != null && resolvedVariant.getColor() != null ? resolvedVariant.getColor() : selectedColor;

        Cart cart = getOrCreateCart(userId);
        CartItem existing = itemRepo.findByCartIdAndProductIdAndVariantId(cart.getId(), p.getId(), vId).orElse(null);
        if (existing != null) {
            existing.setQuantity(existing.getQuantity() + reqQty);
            existing.setSavedForLater(false);
            if (missionId != null) existing.setMissionId(missionId);
            itemRepo.save(existing);
        } else {
            CartItem ci = new CartItem();
            ci.setCartId(cart.getId());
            ci.setProductId(p.getId());
            ci.setVariantId(vId);
            ci.setSelectedSize(finalSize);
            ci.setSelectedColor(finalColor);
            ci.setMissionId(missionId);
            ci.setQuantity(reqQty);
            itemRepo.save(ci);
        }
        cart.setUpdatedAt(Instant.now());
        cartRepo.save(cart);
        return getCart(userId);
    }

    @Transactional
    public CartSummaryDto updateItem(Long userId, Long itemId, Integer quantity, Boolean savedForLater, Long variantId) {
        Cart cart = getOrCreateCart(userId);
        CartItem ci = itemRepo.findById(itemId).orElseThrow(() -> new EntityNotFoundException("Cart item not found"));
        if (!ci.getCartId().equals(cart.getId())) throw new IllegalArgumentException("Not authorized");
        if (variantId != null) {
            ProductVariant v = variantRepo.findById(variantId).orElseThrow(() -> new EntityNotFoundException("Variant not found"));
            if (!v.getProductId().equals(ci.getProductId())) throw new IllegalArgumentException("Invalid variant for product");
            if (!"IN_STOCK".equalsIgnoreCase(v.getAvailabilityStatus()) || v.getStockQuantity() < ci.getQuantity()) {
                throw new IllegalStateException("Selected variant is out of stock");
            }
            ci.setVariantId(v.getId());
            ci.setSelectedSize(v.getSize());
            ci.setSelectedColor(v.getColor());
        }
        if (quantity != null) {
            if (quantity <= 0) {
                itemRepo.delete(ci);
                return getCart(userId);
            }
            if (ci.getVariantId() != null) {
                ProductVariant v = variantRepo.findById(ci.getVariantId()).orElse(null);
                if (v != null && v.getStockQuantity() < quantity) {
                    throw new IllegalStateException("Only " + v.getStockQuantity() + " unit(s) available for this variant.");
                }
            }
            ci.setQuantity(quantity);
        }
        if (savedForLater != null) ci.setSavedForLater(savedForLater);
        itemRepo.save(ci);
        return getCart(userId);
    }

    @Transactional
    public CartSummaryDto removeItem(Long userId, Long itemId) {
        Cart cart = getOrCreateCart(userId);
        CartItem ci = itemRepo.findById(itemId).orElseThrow(() -> new EntityNotFoundException("Cart item not found"));
        if (!ci.getCartId().equals(cart.getId())) throw new IllegalArgumentException("Not authorized");
        itemRepo.delete(ci);
        return getCart(userId);
    }

    @Transactional
    public List<ProductDto> getWishlist(Long userId) {
        Wishlist wl = getOrCreateWishlist(userId);
        List<WishlistItem> items = wishlistItemRepo.findByWishlistIdOrderByCreatedAtDesc(wl.getId());
        Map<Long, Category> catMap = categoryRepo.findAll().stream().collect(Collectors.toMap(Category::getId, c -> c));
        Map<Long, Brand> brandMap = brandRepo.findAll().stream().collect(Collectors.toMap(Brand::getId, b -> b));
        Map<String, RetailerSource> srcMap = retailerRepo.findAll().stream().collect(Collectors.toMap(s -> s.getCode().toUpperCase(), s -> s, (a, b) -> a));
        return productRepo.findAllById(items.stream().map(WishlistItem::getProductId).toList()).stream()
            .map(p -> productService.toDto(p, catMap.get(p.getCategoryId()), p.getBrandId() != null ? brandMap.get(p.getBrandId()) : null, false, srcMap))
            .toList();
    }

    @Transactional
    public List<ProductDto> toggleWishlist(Long userId, Long productId) {
        productRepo.findById(productId).orElseThrow(() -> new EntityNotFoundException("Product not found"));
        Wishlist wl = getOrCreateWishlist(userId);
        Optional<WishlistItem> existing = wishlistItemRepo.findByWishlistIdAndProductId(wl.getId(), productId);
        if (existing.isPresent()) {
            wishlistItemRepo.delete(existing.get());
        } else {
            WishlistItem wi = new WishlistItem();
            wi.setWishlistId(wl.getId());
            wi.setProductId(productId);
            wishlistItemRepo.save(wi);
        }
        return getWishlist(userId);
    }

    @Transactional
    public List<ProductDto> syncGuestWishlist(Long userId, List<Long> productIds) {
        Wishlist wl = getOrCreateWishlist(userId);
        if (productIds != null) {
            for (Long pid : productIds) {
                if (pid == null || !productRepo.existsById(pid)) continue;
                if (wishlistItemRepo.findByWishlistIdAndProductId(wl.getId(), pid).isEmpty()) {
                    WishlistItem wi = new WishlistItem();
                    wi.setWishlistId(wl.getId());
                    wi.setProductId(pid);
                    wishlistItemRepo.save(wi);
                }
            }
        }
        return getWishlist(userId);
    }

    public Cart getOrCreateCart(Long userId) {
        return cartRepo.findByUserId(userId).orElseGet(() -> {
            Cart c = new Cart();
            c.setUserId(userId);
            return cartRepo.save(c);
        });
    }

    private Wishlist getOrCreateWishlist(Long userId) {
        return wishlistRepo.findByUserId(userId).orElseGet(() -> {
            Wishlist w = new Wishlist();
            w.setUserId(userId);
            return wishlistRepo.save(w);
        });
    }
}
