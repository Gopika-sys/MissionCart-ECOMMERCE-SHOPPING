package com.missioncart.categories;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "categories")
public class Category {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false, unique = true, length = 120)
    private String slug;

    @Column(name = "parent_id")
    private Long parentId;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "purpose_group", length = 100)
    private String purposeGroup;

    @Column(name = "display_order", nullable = false)
    private int displayOrder = 0;

    @Column(name = "hero_heading", length = 240)
    private String heroHeading;

    @Column(name = "hero_italic_accent", length = 160)
    private String heroItalicAccent;

    @Column(name = "editorial_description", columnDefinition = "TEXT")
    private String editorialDescription;

    @Column(name = "hero_image_url", length = 500)
    private String heroImageUrl;

    @Column(name = "featured_brands_json", columnDefinition = "TEXT")
    private String featuredBrandsJson;

    @Column(name = "subcategories_json", columnDefinition = "TEXT")
    private String subcategoriesJson;

    @Column(name = "country_codes_json", columnDefinition = "TEXT")
    private String countryCodesJson;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public Long getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }
    public Long getParentId() { return parentId; }
    public void setParentId(Long parentId) { this.parentId = parentId; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getPurposeGroup() { return purposeGroup; }
    public void setPurposeGroup(String purposeGroup) { this.purposeGroup = purposeGroup; }
    public int getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(int displayOrder) { this.displayOrder = displayOrder; }
    public String getHeroHeading() { return heroHeading; }
    public void setHeroHeading(String heroHeading) { this.heroHeading = heroHeading; }
    public String getHeroItalicAccent() { return heroItalicAccent; }
    public void setHeroItalicAccent(String heroItalicAccent) { this.heroItalicAccent = heroItalicAccent; }
    public String getEditorialDescription() { return editorialDescription; }
    public void setEditorialDescription(String editorialDescription) { this.editorialDescription = editorialDescription; }
    public String getHeroImageUrl() { return heroImageUrl; }
    public void setHeroImageUrl(String heroImageUrl) { this.heroImageUrl = heroImageUrl; }
    public String getFeaturedBrandsJson() { return featuredBrandsJson; }
    public void setFeaturedBrandsJson(String featuredBrandsJson) { this.featuredBrandsJson = featuredBrandsJson; }
    public String getSubcategoriesJson() { return subcategoriesJson; }
    public void setSubcategoriesJson(String subcategoriesJson) { this.subcategoriesJson = subcategoriesJson; }
    public String getCountryCodesJson() { return countryCodesJson; }
    public void setCountryCodesJson(String countryCodesJson) { this.countryCodesJson = countryCodesJson; }
}
