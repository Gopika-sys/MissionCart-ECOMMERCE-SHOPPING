export interface UserProfile {
  id: number;
  email: string;
  fullName: string;
  phone?: string;
  role: 'CUSTOMER' | 'ADMIN' | 'SELLER';
  avatarUrl?: string;
  preferredCountry?: string;
  preferredDeliveryCountry?: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  parentId?: number;
  description?: string;
  purposeGroup?: string;
  displayOrder: number;
}

export interface RetailerSource {
  id: number;
  code: string;
  name: string;
  officialWebsite: string;
  logoUrl?: string;
  categoryFocus: string;
  supportedCategories: string;
  importMethod: string;
  productUrlPattern?: string;
  imageSourcingMethod: string;
  connectionStatus: string;
  sourceType?: 'MISSIONCART_NATIVE_SELLER' | 'MANUFACTURER' | 'MARKETPLACE' | 'RETAILER' | 'PRODUCT_INFORMATION_DATABASE' | string;
  nativeCheckout: boolean;
  lastSuccessfulImport?: string;
  lastPriceVerification?: string;
}

export interface ProductImage {
  id: number;
  imageUrl: string;
  imageSource: string;
  imageAttribution?: string;
  imageLicense?: string;
  imageStatus: string;
  imageType?: string;
  imageWidth?: number;
  imageHeight?: number;
  imageAltText: string;
  primaryImage: boolean;
}

export interface ProductVariant {
  id: number;
  variantSku: string;
  size?: string | null;
  color?: string | null;
  colorHex?: string | null;
  variantName?: string | null;
  price: number;
  originalPrice?: number | null;
  stockQuantity: number;
  availabilityStatus: string;
  imageUrl?: string | null;
  defaultVariant: boolean;
}

export interface ReviewPhoto {
  id: number;
  reviewId: number;
  productId: number;
  orderId?: number | null;
  userId: number;
  imageDataUrl: string;
  caption?: string | null;
  imageType: string;
  moderationStatus: string;
  verifiedPurchase: boolean;
  consentGranted: boolean;
  createdAt: string;
}

export interface FashionFacets {
  genders: string[];
  garmentTypes: string[];
  occasions: string[];
  brands: string[];
  sizes: string[];
  materials: string[];
  fits: string[];
  patterns: string[];
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  slug: string;
  brandId?: number;
  brandName?: string;
  categoryId: number;
  categoryName?: string;
  categorySlug?: string;
  sourcePlatform: string;
  sourceType?: 'MISSIONCART_NATIVE_SELLER' | 'MANUFACTURER' | 'MARKETPLACE' | 'RETAILER' | 'PRODUCT_INFORMATION_DATABASE' | string;
  sourceProductId?: string;
  sourceUrl?: string | null;
  productType: string;
  description: string;
  price: number | null;
  originalPrice?: number | null;
  currency: string;
  priceVerified: boolean;
  priceStatus?: 'VERIFIED' | 'ESTIMATED' | 'UNAVAILABLE' | 'EXPIRED';
  taxRate?: number;
  shippingEstimate?: number;
  priceLastVerifiedAt?: string;
  availabilityVerifiedAt?: string;
  availabilityStatus: string;
  stockQuantity: number;
  rating?: number;
  reviewCount?: number;
  ratingVerified: boolean;
  dataVerificationStatus: string;
  specifications: Record<string, unknown>;
  attributes: Record<string, unknown>;
  missionTags: string[];
  priorityTier: string;
  lifecycleOptions: string[];
  imageUrl?: string | null;
  imageSource?: string;
  imageAttribution?: string;
  imageLicense?: string;
  imageStatus: 'VERIFIED' | 'PENDING_REVIEW' | 'REQUIRES_IMAGE' | 'INVALID';
  imageType?: 'OFFICIAL_PACKSHOT' | 'AUTHORIZED_RETAILER_IMAGE' | 'LIFESTYLE_IMAGE' | 'SECONDARY_PRODUCT_IMAGE' | 'MAIN_PACKSHOT' | 'FRONT_VIEW' | 'BACK_VIEW' | 'DETAIL_VIEW' | string;
  imageResolution?: string;
  imageVerifiedAt?: string;
  gender?: 'WOMEN' | 'MEN' | 'UNISEX' | string | null;
  garmentType?: string | null;
  occasion?: string | null;
  material?: string | null;
  fit?: string | null;
  sleeveLength?: string | null;
  pattern?: string | null;
  careInstructions?: string | null;
  sizeChart?: Record<string, unknown> | null;
  variants?: ProductVariant[];
  additionalImages: ProductImage[];
  countryCode?: string;
  deliveryCountries?: string[];
  published: boolean;
  approved: boolean;
}

export interface CountryView {
  code: string;
  iso3?: string;
  name: string;
  flagEmoji: string;
  currencyCode: string;
  currencySymbol: string;
  sizeSystem: string;
  region?: string;
  defaultLocale?: string;
  dialCode?: string;
  popular?: boolean;
  exchangeRateToInr: number;
  productCount: number;
  datasetAvailable: boolean;
  availabilityStatus?: 'CATALOGUE_AVAILABLE' | 'PARTIALLY_AVAILABLE' | 'DATASET_PENDING' | 'COMING_SOON' | string;
}

export interface HomepageEditorialData {
  countryCode: string;
  totalCountryProducts: number;
  collections: EditorialCollectionCard[];
  fashionCollections: EditorialCollectionCard[];
  beautyCollections: EditorialCollectionCard[];
  categories: Array<{
    routeSlug: string;
    title: string;
    description: string;
    imageUrl: string;
    productCount: number;
  }>;
  featuredBrands: Array<{
    name: string;
    status: string;
    productCount: number;
  }>;
}

export interface CollageTile {
  productId: number;
  slug: string;
  name: string;
  brandName?: string | null;
  imageUrl: string;
  price?: number | null;
  currency: string;
}

export interface EditorialCollectionCard {
  id: number;
  categorySlug: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  countryCode?: string | null;
  matchingProductCount: number;
  filterParams: Record<string, unknown>;
  collageTiles: CollageTile[];
}

export interface EditorialCategoryPageData {
  requestedSlug: string;
  name: string;
  heroHeading: string;
  heroItalicAccent: string;
  editorialDescription: string;
  countryCode: string;
  resolvedCategorySlugs: string[];
  subcategories: string[];
  featuredBrands: string[];
  totalProductsInCountry: number;
  collections: EditorialCollectionCard[];
  hasDatasetForCountry: boolean;
}

export interface SmartSearchResponse {
  intentType: 'CATEGORY_SEARCH' | 'BUDGET_FILTERED_CATEGORY' | 'DIRECT_PRODUCT_SEARCH' | 'COMPARISON_SEARCH' | 'BRAND_COUNTRY_SEARCH' | 'PURPOSE_MISSION';
  rawQuery: string;
  resolvedCountryCode: string;
  targetCategorySlug?: string | null;
  targetFilterUrl: string;
  parsedBudget?: {
    minPrice?: number | null;
    maxPrice?: number | null;
    currency: string;
    budgetType: 'TOTAL_BUNDLE_BUDGET' | 'PER_PRODUCT_MAX_PRICE';
    ambiguous: boolean;
    clarificationQuestion?: string | null;
  };
  datasetPending: boolean;
  explanation: string;
  unmatchedNotes: string[];
  categoryPreview?: EditorialCategoryPageData | null;
  matchedProducts: Product[];
  missionPlan?: MissionDetail | null;
}

export interface LuxuryBrandStatus {
  code: string;
  name: string;
  officialWebsite: string;
  connectionStatus: string;
  productCount: number;
  availableCountries: string[];
}

export interface DataBoutiqueStatus {
  tokenConfigured: boolean;
  collectionUrl: string;
  message: string;
  datasets: Array<{
    id: number;
    contractId: string;
    title: string;
    brandName?: string;
    geography?: string;
    geographyCode?: string;
    sourceWebsite?: string;
    refreshPolicy?: string;
    datasetPrice?: string;
    lastDeliveredDate?: string;
    ingestStatus: string;
    importedRecordCount: number;
  }>;
  luxuryBrands: LuxuryBrandStatus[];
}

export interface ZipImportPreviewResult {
  jobId?: number | null;
  previewOnly: boolean;
  fileName: string;
  detectedCountry: string;
  detectedCurrency: string;
  detectedCategories: string[];
  detectedBrands: string[];
  totalRecords: number;
  insertedCount: number;
  updatedCount: number;
  skippedDuplicateCount: number;
  errorCount: number;
  matchedImageCount: number;
  unmatchedImageCount: number;
  unmatchedImageNames: string[];
  rows: Array<{
    rowIndex: number;
    sku: string;
    name: string;
    sourcePlatform: string;
    price: number;
    status: string;
    message: string;
  }>;
}

export interface UnmatchedImportImageItem {
  id: number;
  importJobId?: number | null;
  countryCode: string;
  fileName: string;
  extractedSkuHint?: string;
  imageDataUrl: string;
  status: string;
  assignedProductId?: number | null;
  createdAt: string;
}

export interface ProductCounts {
  totalImportedProducts: number;
  publishedProducts: number;
  imageVerifiedProducts: number;
  availableProducts: number;
  pendingImageProducts: number;
  byRetailer: Record<string, number>;
  byCategory: Record<string, number>;
}

export interface BudgetSummary {
  totalBudget: number;
  essentialSpending: number;
  optionalSpending: number;
  productSubtotal: number;
  totalSelected: number;
  verifiedDiscount: number;
  shippingCost: number;
  applicableTaxes: number;
  couponDiscount: number;
  finalPayable: number;
  remainingBudget: number;
  utilizationPercent: number;
  excludedOwnedSavings: number;
  unpricedItemCount: number;
  overBudget: boolean;
  affordableConfirmed: boolean;
}

export interface CompatibilityIssue {
  ruleCode: string;
  domain: string;
  status: 'COMPATIBLE' | 'WARNING' | 'INCOMPATIBLE' | 'NOT_VERIFIED';
  reason: string;
  recommendedAction: string;
  affectedProductIds: number[];
}

export interface CompatibilityReport {
  overallStatus: 'COMPATIBLE' | 'WARNING' | 'INCOMPATIBLE' | 'NOT_VERIFIED';
  issues: CompatibilityIssue[];
}

export interface MissionItem {
  id: number;
  productId: number;
  product: Product | null;
  requirementLabel: string;
  priority: 'ESSENTIAL' | 'OPTIONAL';
  quantity: number;
  unitPrice: number | null;
  lineTotal: number | null;
  selected: boolean;
  excludedOwned: boolean;
  compatibilityStatus: string;
  compatibilityReason?: string;
  recommendationReason?: string;
  assignedToUserId?: number;
  claimedByName?: string;
}

export interface MissionDetail {
  id: number;
  userId?: number;
  title: string;
  slug: string;
  rawPrompt: string;
  goal: string;
  situationSummary: string;
  purpose: string;
  budget?: number;
  currency: string;
  timeframe?: string;
  peopleCount: number;
  aiProviderUsed: string;
  aiExplanation: string;
  assumptions: string[];
  existingPossessions: string[];
  unmatchedRequirements: string[];
  followUpQuestion?: string;
  status: string;
  shared: boolean;
  shareToken?: string;
  budgetSummary: BudgetSummary;
  compatibilityReport: CompatibilityReport;
  items: MissionItem[];
  progressPercent: number;
  createdAt: string;
}

export interface CartItemView {
  id: number;
  productId: number;
  variantId?: number | null;
  selectedSize?: string | null;
  selectedColor?: string | null;
  missionId?: number;
  quantity: number;
  savedForLater: boolean;
  unitPrice: number | null;
  lineTotal: number | null;
  nativeCheckoutEligible: boolean;
  sourceType?: string | null;
  product: Product;
}

export interface RetailerCartGroup {
  sourceCode: string;
  sourceName: string;
  sourceType?: string;
  officialWebsite: string;
  nativeCheckout: boolean;
  subtotal: number;
  unavailablePriceCount?: number;
  items: CartItemView[];
}

export interface CartSummary {
  cartId: number;
  activeItems: CartItemView[];
  savedForLaterItems: CartItemView[];
  externalRetailerGroups: RetailerCartGroup[];
  infoDatabaseItems?: CartItemView[];
  nativeSubtotal: number;
  externalSubtotal: number;
  grandTotal: number;
  currency: string;
  compatibilityReport: CompatibilityReport;
}
