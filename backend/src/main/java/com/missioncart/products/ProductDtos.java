package com.missioncart.products;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

public class ProductDtos {
    public record ProductImageDto(
        Long id,
        String imageUrl,
        String imageSource,
        String imageAttribution,
        String imageLicense,
        String imageStatus,
        String imageType,
        Integer imageWidth,
        Integer imageHeight,
        String imageAltText,
        boolean primaryImage
    ) {}

    public record ProductVariantDto(
        Long id,
        String variantSku,
        String size,
        String color,
        String colorHex,
        String variantName,
        BigDecimal price,
        BigDecimal originalPrice,
        int stockQuantity,
        String availabilityStatus,
        String imageUrl,
        boolean defaultVariant
    ) {}

    public record ProductDto(
        Long id,
        String sku,
        String name,
        String slug,
        Long brandId,
        String brandName,
        Long categoryId,
        String categoryName,
        String categorySlug,
        String sourcePlatform,
        String sourceType,
        String sourceProductId,
        String sourceUrl,
        String productType,
        String description,
        BigDecimal price,
        BigDecimal originalPrice,
        String currency,
        boolean priceVerified,
        String priceStatus,
        BigDecimal taxRate,
        BigDecimal shippingEstimate,
        Instant priceLastVerifiedAt,
        Instant availabilityVerifiedAt,
        String availabilityStatus,
        int stockQuantity,
        BigDecimal rating,
        Integer reviewCount,
        boolean ratingVerified,
        String dataVerificationStatus,
        Map<String, Object> specifications,
        Map<String, Object> attributes,
        List<String> missionTags,
        String priorityTier,
        List<String> lifecycleOptions,
        String imageUrl,
        String imageSource,
        String imageAttribution,
        String imageLicense,
        String imageStatus,
        String imageType,
        String imageResolution,
        Instant imageVerifiedAt,
        String gender,
        String garmentType,
        String occasion,
        String material,
        String fit,
        String sleeveLength,
        String pattern,
        String careInstructions,
        Map<String, Object> sizeChart,
        String countryCode,
        List<String> deliveryCountries,
        List<ProductVariantDto> variants,
        List<ProductImageDto> additionalImages,
        boolean published,
        boolean approved,
        Instant createdAt
    ) {}

    public record AlternativesDto(
        List<ProductDto> budget,
        List<ProductDto> balanced,
        List<ProductDto> premium
    ) {}

    public record ProductCountsDto(
        long totalImportedProducts,
        long publishedProducts,
        long imageVerifiedProducts,
        long availableProducts,
        long pendingImageProducts,
        Map<String, Long> byRetailer,
        Map<String, Long> byCategory
    ) {}

    public record FashionFacetsDto(
        List<String> genders,
        List<String> garmentTypes,
        List<String> occasions,
        List<String> brands,
        List<String> sizes,
        List<String> materials,
        List<String> fits,
        List<String> patterns
    ) {}
}
