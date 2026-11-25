package com.missioncart.categories;

import com.missioncart.common.ApiResponse;
import com.missioncart.common.PageResponse;
import com.missioncart.products.ProductDtos.ProductDto;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class CategoryAndBrandController {

    private final CategoryRepository categoryRepo;
    private final BrandRepository brandRepo;
    private final EditorialCategoryService editorialService;

    public CategoryAndBrandController(
        CategoryRepository categoryRepo,
        BrandRepository brandRepo,
        EditorialCategoryService editorialService
    ) {
        this.categoryRepo = categoryRepo;
        this.brandRepo = brandRepo;
        this.editorialService = editorialService;
    }

    @GetMapping("/categories")
    public ApiResponse<List<Category>> categories() {
        return ApiResponse.ok(categoryRepo.findAllByOrderByDisplayOrderAscNameAsc());
    }

    @GetMapping("/home/editorial")
    public ApiResponse<EditorialCategoryService.HomepageEditorialDto> homeEditorial(
        @RequestParam(required = false, defaultValue = "IN") String country
    ) {
        return ApiResponse.ok(editorialService.getEditorialHomepage(country));
    }

    @GetMapping("/categories/{slug}/editorial")
    public ApiResponse<EditorialCategoryService.EditorialCategoryPageDto> editorialCategory(
        @PathVariable String slug,
        @RequestParam(required = false, defaultValue = "IN") String country
    ) {
        return ApiResponse.ok(editorialService.getEditorialCategory(slug, country));
    }

    @GetMapping("/categories/{slug}/collections/{collectionSlug}")
    public ApiResponse<PageResponse<ProductDto>> collectionProducts(
        @PathVariable String slug,
        @PathVariable String collectionSlug,
        @RequestParam(required = false, defaultValue = "IN") String country,
        @RequestParam(required = false, defaultValue = "0") int page,
        @RequestParam(required = false, defaultValue = "24") int size,
        @RequestParam(required = false, defaultValue = "relevance") String sort
    ) {
        return ApiResponse.ok(editorialService.getCollectionProducts(collectionSlug, country, page, size, sort));
    }

    @GetMapping("/brands")
    public ApiResponse<List<Brand>> brands() {
        return ApiResponse.ok(brandRepo.findAll());
    }
}
