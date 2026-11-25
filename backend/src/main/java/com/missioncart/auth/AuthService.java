package com.missioncart.auth;

import com.missioncart.auth.AuthDtos.*;
import com.missioncart.config.AppProperties;
import com.missioncart.security.AuthenticatedUser;
import com.missioncart.security.JwtService;
import com.missioncart.users.User;
import com.missioncart.users.UserRepository;
import io.jsonwebtoken.Claims;
import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseCookie;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AppProperties props;

    public AuthService(UserRepository userRepo, PasswordEncoder passwordEncoder, JwtService jwtService, AppProperties props) {
        this.userRepo = userRepo;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.props = props;
    }

    public AuthResponse register(RegisterRequest req, HttpServletResponse response) {
        String fullName = req.fullName() == null ? "" : req.fullName().trim();
        if (fullName.isEmpty()) {
            throw new IllegalArgumentException("Full name is required.");
        }
        String email = req.email() == null ? "" : req.email().trim().toLowerCase();
        if (userRepo.existsByEmailIgnoreCase(email)) {
            throw new IllegalStateException("An account with this email already exists.");
        }
        String pwd = req.password() == null ? "" : req.password();
        if (pwd.length() < 8
            || !pwd.chars().anyMatch(Character::isUpperCase)
            || !pwd.chars().anyMatch(Character::isLowerCase)
            || !pwd.chars().anyMatch(Character::isDigit)
            || !pwd.chars().anyMatch(ch -> !Character.isLetterOrDigit(ch))) {
            throw new IllegalArgumentException("Password must include at least 8 characters, uppercase, lowercase, number, and special character.");
        }
        if (req.confirmPassword() != null && !pwd.equals(req.confirmPassword())) {
            throw new IllegalArgumentException("Password and confirm password do not match.");
        }
        if (req.termsAccepted() != null && !req.termsAccepted()) {
            throw new IllegalArgumentException("You must agree to the Terms & Privacy Policy.");
        }
        String cleanPhone = req.phone() == null ? null : req.phone().trim();
        String normalizedDigits = cleanPhone == null ? "" : cleanPhone.replaceAll("[\\s\\-]+", "");
        if (cleanPhone != null && !cleanPhone.isEmpty() && !normalizedDigits.matches("^(\\+91)?[6-9]\\d{9}$")) {
            throw new IllegalArgumentException("Enter a valid 10-digit Indian mobile number.");
        }
        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(pwd));
        user.setFullName(fullName);
        user.setPhone(cleanPhone != null && !cleanPhone.isEmpty() ? cleanPhone : null);
        String requestedRole = "SELLER".equalsIgnoreCase(req.accountType()) ? "SELLER" : "CUSTOMER";
        user.setRole(requestedRole);
        user = userRepo.save(user);
        return issueTokens(user, response);
    }

    public AuthResponse login(LoginRequest req, HttpServletResponse response) {
        User user = userRepo.findByEmailIgnoreCase(req.email().trim())
            .orElseThrow(() -> new IllegalArgumentException("Invalid email or password."));
        if (!user.isEnabled()) {
            throw new IllegalStateException("Account is disabled.");
        }
        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid email or password.");
        }
        return issueTokens(user, response);
    }

    public AuthResponse refresh(HttpServletRequest request, HttpServletResponse response) {
        String refreshToken = null;
        if (request.getCookies() != null) {
            for (Cookie c : request.getCookies()) {
                if ("mc_refresh".equals(c.getName())) {
                    refreshToken = c.getValue();
                    break;
                }
            }
        }
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new IllegalArgumentException("Missing refresh token.");
        }
        Claims claims = jwtService.parseRefreshToken(refreshToken);
        String email = claims.getSubject();
        User user = userRepo.findByEmailIgnoreCase(email)
            .orElseThrow(() -> new EntityNotFoundException("User not found."));
        return issueTokens(user, response);
    }

    public void logout(HttpServletResponse response) {
        clearCookie(response, "mc_access", "/");
        clearCookie(response, "mc_refresh", "/api/auth");
    }

    public UserProfileDto me(AuthenticatedUser principal) {
        if (principal == null) throw new IllegalArgumentException("Not authenticated.");
        User u = userRepo.findById(principal.id())
            .orElseThrow(() -> new EntityNotFoundException("User not found."));
        return toDto(u);
    }

    private AuthResponse issueTokens(User user, HttpServletResponse response) {
        String access = jwtService.generateAccessToken(user.getId(), user.getEmail(), user.getRole());
        String refresh = jwtService.generateRefreshToken(user.getId(), user.getEmail(), user.getRole());

        ResponseCookie accessCookie = ResponseCookie.from("mc_access", access)
            .httpOnly(true)
            .secure(props.jwt().cookieSecure())
            .path("/")
            .maxAge(props.jwt().accessExpirationMs() / 1000)
            .sameSite("Lax")
            .build();
        ResponseCookie refreshCookie = ResponseCookie.from("mc_refresh", refresh)
            .httpOnly(true)
            .secure(props.jwt().cookieSecure())
            .path("/api/auth")
            .maxAge(props.jwt().refreshExpirationMs() / 1000)
            .sameSite("Lax")
            .build();

        response.addHeader("Set-Cookie", accessCookie.toString());
        response.addHeader("Set-Cookie", refreshCookie.toString());
        return new AuthResponse(toDto(user), access);
    }

    private void clearCookie(HttpServletResponse response, String name, String path) {
        ResponseCookie cookie = ResponseCookie.from(name, "")
            .httpOnly(true)
            .path(path)
            .maxAge(0)
            .sameSite("Lax")
            .build();
        response.addHeader("Set-Cookie", cookie.toString());
    }

    public UserProfileDto toDto(User u) {
        return new UserProfileDto(
            u.getId(), u.getEmail(), u.getFullName(), u.getPhone(), u.getRole(), u.getAvatarUrl(),
            u.getPreferredCountry() != null ? u.getPreferredCountry() : "IN",
            u.getPreferredDeliveryCountry() != null ? u.getPreferredDeliveryCountry() : "IN"
        );
    }
}
