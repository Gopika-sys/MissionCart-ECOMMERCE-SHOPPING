package com.missioncart.ai;

import com.missioncart.common.ApiResponse;
import com.missioncart.security.AuthenticatedUser;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/ai/search")
public class SmartSearchController {

    public record SmartSearchRequest(
        String query,
        String countryCode,
        BigDecimal budget
    ) {}

    private final SmartSearchService smartSearchService;

    public SmartSearchController(SmartSearchService smartSearchService) {
        this.smartSearchService = smartSearchService;
    }

    @PostMapping
    public ApiResponse<SmartSearchService.SmartSearchResponse> postSearch(
        @AuthenticationPrincipal AuthenticatedUser user,
        @RequestBody SmartSearchRequest req
    ) {
        Long uid = user != null ? user.id() : null;
        return ApiResponse.ok(smartSearchService.handleSearch(uid, req.query(), req.countryCode(), req.budget()));
    }

    @GetMapping
    public ApiResponse<SmartSearchService.SmartSearchResponse> getSearch(
        @AuthenticationPrincipal AuthenticatedUser user,
        @RequestParam String q,
        @RequestParam(required = false, defaultValue = "IN") String country,
        @RequestParam(required = false) BigDecimal budget
    ) {
        Long uid = user != null ? user.id() : null;
        return ApiResponse.ok(smartSearchService.handleSearch(uid, q, country, budget));
    }
}
