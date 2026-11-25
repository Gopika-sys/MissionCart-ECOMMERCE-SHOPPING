package com.missioncart.auth;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class AuthDtos {
    public record RegisterRequest(
        @NotBlank(message = "Email is required") @Email(message = "Enter a valid email address") String email,
        @NotBlank(message = "Password is required") @Size(min = 8, message = "Password must be at least 8 characters") String password,
        String confirmPassword,
        @NotBlank(message = "Full name is required") String fullName,
        @Pattern(regexp = "^$|^(\\+91[\\-\\s]?)?[6-9]\\d{4}[\\-\\s]?\\d{5}$", message = "Enter a valid 10-digit Indian mobile number") String phone,
        String accountType,
        @AssertTrue(message = "Please accept the Terms & Privacy Policy") Boolean termsAccepted
    ) {}

    public record LoginRequest(
        @NotBlank @Email String email,
        @NotBlank String password
    ) {}

    public record UserProfileDto(
        Long id,
        String email,
        String fullName,
        String phone,
        String role,
        String avatarUrl,
        String preferredCountry,
        String preferredDeliveryCountry
    ) {
        public UserProfileDto(Long id, String email, String fullName, String phone, String role, String avatarUrl) {
            this(id, email, fullName, phone, role, avatarUrl, "IN", "IN");
        }
    }

    public record AuthResponse(
        UserProfileDto user,
        String accessToken
    ) {}
}
