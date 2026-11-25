package com.missioncart.countries;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "countries")
public class Country {
    @Id
    @Column(length = 8)
    private String code;

    @Column(length = 8)
    private String iso3;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "flag_emoji", nullable = false, length = 16)
    private String flagEmoji;

    @Column(name = "currency_code", nullable = false, length = 8)
    private String currencyCode;

    @Column(name = "currency_symbol", nullable = false, length = 8)
    private String currencySymbol;

    @Column(name = "size_system", nullable = false, length = 32)
    private String sizeSystem;

    @Column(length = 64)
    private String region;

    @Column(name = "default_locale", length = 24)
    private String defaultLocale;

    @Column(name = "dial_code", length = 16)
    private String dialCode;

    @Column(name = "is_popular", nullable = false)
    private boolean popular = false;

    @Column(name = "exchange_rate_to_inr", nullable = false, precision = 12, scale = 6)
    private BigDecimal exchangeRateToInr = BigDecimal.ONE;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "display_order", nullable = false)
    private int displayOrder = 0;

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getIso3() { return iso3; }
    public void setIso3(String iso3) { this.iso3 = iso3; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getFlagEmoji() { return flagEmoji; }
    public void setFlagEmoji(String flagEmoji) { this.flagEmoji = flagEmoji; }
    public String getCurrencyCode() { return currencyCode; }
    public void setCurrencyCode(String currencyCode) { this.currencyCode = currencyCode; }
    public String getCurrencySymbol() { return currencySymbol; }
    public void setCurrencySymbol(String currencySymbol) { this.currencySymbol = currencySymbol; }
    public String getSizeSystem() { return sizeSystem; }
    public void setSizeSystem(String sizeSystem) { this.sizeSystem = sizeSystem; }
    public String getRegion() { return region; }
    public void setRegion(String region) { this.region = region; }
    public String getDefaultLocale() { return defaultLocale; }
    public void setDefaultLocale(String defaultLocale) { this.defaultLocale = defaultLocale; }
    public String getDialCode() { return dialCode; }
    public void setDialCode(String dialCode) { this.dialCode = dialCode; }
    public boolean isPopular() { return popular; }
    public void setPopular(boolean popular) { this.popular = popular; }
    public BigDecimal getExchangeRateToInr() { return exchangeRateToInr; }
    public void setExchangeRateToInr(BigDecimal exchangeRateToInr) { this.exchangeRateToInr = exchangeRateToInr; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public int getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(int displayOrder) { this.displayOrder = displayOrder; }
}
