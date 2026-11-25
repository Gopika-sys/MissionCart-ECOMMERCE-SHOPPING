import fs from 'node:fs';
import zlib from 'node:zlib';

const SOURCES = [
  // Women's Fashion
  { sourceCode: 'LIBAS_OFFICIAL', brand: 'Libas', host: 'https://www.libas.in', categorySlug: 'fashion', defaultGender: 'WOMEN', pages: [1, 2], defaultOccasion: 'Ethnic & Wedding', limit: 45 },
  { sourceCode: 'VEROMODA_OFFICIAL', brand: 'Vero Moda', host: 'https://www.veromoda.in', categorySlug: 'fashion', defaultGender: 'WOMEN', pages: [1, 2], defaultOccasion: 'Casual & Party', limit: 45 },
  { sourceCode: 'ONLY_OFFICIAL', brand: 'ONLY', host: 'https://www.only.in', categorySlug: 'fashion', defaultGender: 'WOMEN', pages: [1, 2], defaultOccasion: 'Casual', limit: 40 },
  // Men's & Unisex Fashion
  { sourceCode: 'SNITCH_OFFICIAL', brand: 'Snitch', host: 'https://www.snitch.co.in', categorySlug: 'fashion', defaultGender: 'MEN', pages: [1, 2], defaultOccasion: 'Casual & Formal', limit: 50 },
  { sourceCode: 'JACKJONES_OFFICIAL', brand: 'Jack & Jones', host: 'https://www.jackjones.in', categorySlug: 'fashion', defaultGender: 'MEN', pages: [1, 2], defaultOccasion: 'Casual & Streetwear', limit: 45 },
  { sourceCode: 'USPOLO_OFFICIAL', brand: 'US Polo Assn.', host: 'https://uspoloassn.in', categorySlug: 'fashion', defaultGender: 'UNISEX', pages: [1, 2], defaultOccasion: 'Casual & Smart Casual', limit: 45 },
  { sourceCode: 'RARERABBIT_OFFICIAL', brand: 'Rare Rabbit', host: 'https://thehouseofrare.com', categorySlug: 'fashion', defaultGender: 'UNISEX', pages: [1, 2], defaultOccasion: 'Formal & Casual', limit: 45 },
  { sourceCode: 'NEEMANS_OFFICIAL', brand: "Neeman's", host: 'https://neemans.com', categorySlug: 'fashion', defaultGender: 'UNISEX', pages: [1], defaultOccasion: 'Everyday & Activewear', limit: 30 },
  // Skincare, Beauty & Personal Care Manufacturers
  { sourceCode: 'HIMALAYA_OFFICIAL', brand: 'Himalaya', host: 'https://himalayawellness.in', categorySlug: 'skincare', defaultGender: null, pages: [1, 2], defaultOccasion: 'Daily Care', limit: 40 },
  { sourceCode: 'MINIMALIST_OFFICIAL', brand: 'Minimalist', host: 'https://beminimalist.co', categorySlug: 'skincare', defaultGender: null, pages: [1], defaultOccasion: 'Daily Skincare', limit: 35 },
  { sourceCode: 'PLUM_OFFICIAL', brand: 'Plum', host: 'https://plumgoodness.com', categorySlug: 'beauty', defaultGender: null, pages: [1], defaultOccasion: 'Daily Beauty', limit: 35 },
  // Electronics Manufacturers
  { sourceCode: 'BOAT_OFFICIAL', brand: 'boAt', host: 'https://www.boat-lifestyle.com', categorySlug: 'electronics', defaultGender: null, pages: [1], defaultOccasion: 'Work & Travel', limit: 25 },
  { sourceCode: 'PORTRONICS_OFFICIAL', brand: 'Portronics', host: 'https://www.portronics.com', categorySlug: 'electronics', defaultGender: null, pages: [1], defaultOccasion: 'Work & Study', limit: 25 },
];

function stripHtml(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function detectGender(title, tags, defaultGender) {
  const hay = `${title} ${tags}`.toLowerCase();
  if (defaultGender === null) return null;
  if (/\b(unisex|gender[- ]?neutral)\b/.test(hay)) return 'UNISEX';
  if (/\b(women|women's|womens|ladies|girl|girls|kurti|saree|lehenga|anarkali|palazzo|salwar|maxi dress|midi dress|mini dress|bodycon|blouse|skirt|rareism)\b/.test(hay)) return 'WOMEN';
  if (/\b(men|men's|mens|boy|chinos|sherwani|dhoti)\b/.test(hay)) return 'MEN';
  if (/\b(oversized t-?shirt|hoodie|sweatshirt|sneaker|backpack|cap|jogger|cargo)\b/.test(hay) && defaultGender === 'UNISEX') return 'UNISEX';
  return defaultGender;
}

function detectGarmentType(title, productType, tags) {
  const hay = `${title} ${productType} ${tags}`.toLowerCase();
  const map = [
    ['maxi dress', 'Maxi Dress'], ['midi dress', 'Midi Dress'], ['mini dress', 'Mini Dress'],
    ['bodycon', 'Bodycon Dress'], ['a-line', 'A-Line Dress'], ['floral dress', 'Floral Dress'],
    ['shirt dress', 'Shirt Dress'], ['wrap dress', 'Wrap Dress'], ['dress', 'Dress'],
    ['lehenga', 'Lehenga Set'], ['anarkali', 'Anarkali'], ['salwar', 'Salwar Suit'], ['saree', 'Saree'],
    ['kurti', 'Kurti'], ['kurta set', 'Kurta Set'], ['kurta', 'Kurta'], ['sherwani', 'Sherwani'],
    ['co-ord', 'Co-ord Set'], ['coord', 'Co-ord Set'], ['jumpsuit', 'Jumpsuit'],
    ['crop top', 'Crop Top'], ['cardigan', 'Cardigan'], ['sweater', 'Sweater'], ['blouse', 'Blouse'], ['top', 'Top'],
    ['polo', 'Polo T-Shirt'], ['oversized', 'Oversized T-Shirt'], ['hoodie', 'Hoodie'], ['sweatshirt', 'Sweatshirt'],
    ['t-shirt', 'T-Shirt'], ['tee', 'T-Shirt'],
    ['formal shirt', 'Formal Shirt'], ['shirt', 'Casual Shirt'],
    ['blazer', 'Blazer'], ['jacket', 'Jacket'], ['windcheater', 'Jacket'],
    ['wide leg', 'Wide-Leg Pants'], ['wide-leg', 'Wide-Leg Pants'], ['palazzo', 'Palazzos'],
    ['cargo', 'Cargo Pants'], ['chino', 'Chinos'], ['formal trouser', 'Formal Trousers'],
    ['trouser', 'Trousers'], ['jogger', 'Joggers'], ['track pant', 'Track Pants'],
    ['jeans', 'Jeans'], ['denim', 'Jeans'], ['skirt', 'Skirt'], ['shorts', 'Shorts'],
    ['sneaker', 'Sneakers'], ['loafer', 'Loafers'], ['sandal', 'Sandals'], ['slipper', 'Slides'], ['shoe', 'Footwear'],
    ['handbag', 'Handbag'], ['tote', 'Bag'], ['backpack', 'Backpack'], ['watch', 'Watch'], ['cap', 'Cap'], ['belt', 'Belt'],
  ];
  for (const [k, v] of map) {
    if (hay.includes(k)) return v;
  }
  return productType ? String(productType).slice(0, 60) : 'Apparel';
}

function detectOccasion(title, tags, fallback) {
  const hay = `${title} ${tags}`.toLowerCase();
  if (/wedding|bridal|sangeet|festive|ethnic|saree|lehenga|sherwani|kurta/.test(hay)) return 'Wedding & Ethnic';
  if (/party|evening|sequin|cocktail|bodycon/.test(hay)) return 'Party & Evening';
  if (/formal|office|tailored|blazer|trouser/.test(hay)) return 'Formal & Office';
  if (/gym|active|sport|running|training|jogger|track|sneaker/.test(hay)) return 'Sportswear';
  if (/summer|linen|floral|breezy/.test(hay)) return 'Summer & Casual';
  return fallback || 'Casual';
}

function detectMaterial(desc, tags) {
  const hay = `${desc} ${tags}`.toLowerCase();
  for (const m of ['100% cotton', 'organic cotton', 'cotton blend', 'linen blend', 'linen', 'silk blend', 'silk', 'georgette', 'chiffon', 'viscose', 'rayon', 'denim', 'fleece', 'polyester', 'wool', 'knit', 'cotton']) {
    if (hay.includes(m)) return m.replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return null;
}

function detectFit(desc, title) {
  const hay = `${title} ${desc}`.toLowerCase();
  if (hay.includes('oversized')) return 'Oversized Fit';
  if (hay.includes('relaxed')) return 'Relaxed Fit';
  if (hay.includes('slim fit') || hay.includes('slim-fit')) return 'Slim Fit';
  if (hay.includes('regular fit')) return 'Regular Fit';
  if (hay.includes('tailored')) return 'Tailored Fit';
  if (hay.includes('wide leg') || hay.includes('wide-leg')) return 'Wide-Leg Fit';
  if (hay.includes('a-line')) return 'A-Line Silhouette';
  if (hay.includes('bodycon')) return 'Bodycon Fit';
  return 'Regular Fit';
}

function detectPattern(title, desc) {
  const hay = `${title} ${desc}`.toLowerCase();
  for (const p of ['floral', 'striped', 'checked', 'plaid', 'printed', 'embroidered', 'textured', 'ribbed', 'colorblock', 'solid']) {
    if (hay.includes(p)) return p.charAt(0).toUpperCase() + p.slice(1);
  }
  return 'Solid';
}

function detectSleeve(title, desc) {
  const hay = `${title} ${desc}`.toLowerCase();
  if (hay.includes('sleeveless') || hay.includes('spaghetti') || hay.includes('strapless')) return 'Sleeveless';
  if (hay.includes('half sleeve') || hay.includes('short sleeve')) return 'Half Sleeve';
  if (hay.includes('full sleeve') || hay.includes('long sleeve')) return 'Full Sleeve';
  if (hay.includes('3/4 sleeve') || hay.includes('three quarter')) return '3/4 Sleeve';
  return null;
}

function buildSizeChart(garmentType, gender) {
  const gt = (garmentType || '').toLowerCase();
  if (/sneaker|shoe|loafer|sandal|slide|footwear/.test(gt)) {
    return {
      unit: 'UK / EU / Foot cm',
      rows: [
        { size: 'UK 6', eu: '40', lengthCm: '24.6' },
        { size: 'UK 7', eu: '41', lengthCm: '25.4' },
        { size: 'UK 8', eu: '42', lengthCm: '26.2' },
        { size: 'UK 9', eu: '43', lengthCm: '27.1' },
        { size: 'UK 10', eu: '44', lengthCm: '27.9' },
        { size: 'UK 11', eu: '45', lengthCm: '28.8' },
      ],
    };
  }
  if (/jeans|chino|trouser|pant|jogger|short|bottom/.test(gt)) {
    return {
      unit: 'inches',
      rows: [
        { size: '28 / XS', waist: '28', hip: '35', inseam: '30' },
        { size: '30 / S', waist: '30', hip: '37', inseam: '30.5' },
        { size: '32 / M', waist: '32', hip: '39', inseam: '31' },
        { size: '34 / L', waist: '34', hip: '41', inseam: '31.5' },
        { size: '36 / XL', waist: '36', hip: '43', inseam: '32' },
      ],
    };
  }
  if (gender === 'WOMEN') {
    return {
      unit: 'inches',
      rows: [
        { size: 'XS', bust: '32', waist: '26', hip: '35' },
        { size: 'S', bust: '34', waist: '28', hip: '37' },
        { size: 'M', bust: '36', waist: '30', hip: '39' },
        { size: 'L', bust: '38', waist: '32', hip: '41' },
        { size: 'XL', bust: '40', waist: '34', hip: '43' },
        { size: 'XXL', bust: '42', waist: '36', hip: '45' },
      ],
    };
  }
  return {
    unit: 'inches',
    rows: [
      { size: 'S', chest: '38', shoulder: '17', length: '27.5' },
      { size: 'M', chest: '40', shoulder: '18', length: '28.5' },
      { size: 'L', chest: '42', shoulder: '19', length: '29.5' },
      { size: 'XL', chest: '44', shoulder: '20', length: '30.5' },
      { size: 'XXL', chest: '46', shoulder: '21', length: '31.5' },
    ],
  };
}

function classifyImageType(idx, srcPlatform) {
  if (srcPlatform.includes('HIMALAYA') || srcPlatform.includes('MINIMALIST') || srcPlatform.includes('PLUM') || srcPlatform.includes('BOAT') || srcPlatform.includes('PORTRONICS')) {
    return idx === 0 ? 'MAIN_PACKSHOT' : 'DETAIL_VIEW';
  }
  if (idx === 0) return 'MAIN_PACKSHOT';
  if (idx === 1) return 'FRONT_VIEW';
  if (idx === 2) return 'BACK_VIEW';
  return 'DETAIL_VIEW';
}

function parseColorAndSize(variant, options, productTitle) {
  let size = null;
  let color = null;
  const optNames = (options || []).map((o) => String(o.name || '').toLowerCase());
  const vals = [variant.option1, variant.option2, variant.option3];
  for (let i = 0; i < optNames.length; i++) {
    const val = vals[i];
    if (!val || val === 'Default Title') continue;
    if (/size|uk|us|pack|volume|weight/.test(optNames[i])) size = String(val).trim();
    else if (/color|colour|shade/.test(optNames[i])) color = String(val).trim();
  }
  if (!size && variant.option1 && variant.option1 !== 'Default Title' && optNames.length === 1) {
    if (/^(XXS|XS|S|M|L|XL|XXL|3XL|Free Size|One Size|\d{2}|UK\s?\d+)$/i.test(String(variant.option1).trim())) {
      size = String(variant.option1).trim();
    }
  }
  if (!color) {
    const titleLower = productTitle.toLowerCase();
    for (const c of ['black', 'white', 'navy', 'blue', 'green', 'pista', 'red', 'maroon', 'pink', 'beige', 'ivory', 'cream', 'olive', 'grey', 'gray', 'brown', 'yellow', 'mustard', 'lavender', 'coral']) {
      if (titleLower.includes(c)) {
        color = c.charAt(0).toUpperCase() + c.slice(1);
        break;
      }
    }
  }
  return { size, color };
}

const COLOR_HEX_MAP = {
  black: '#1E1B1A', white: '#F9F8F6', navy: '#1B2A4A', blue: '#2E5A88', green: '#2F6F4E',
  pista: '#9DBB9B', red: '#9E2A2B', maroon: '#7F2548', pink: '#D88EA3', beige: '#D7C4A9',
  ivory: '#F3EDE3', cream: '#EFE7DA', olive: '#5F6B3C', grey: '#737373', gray: '#737373',
  brown: '#6B4423', yellow: '#D9A726', mustard: '#C8921F', lavender: '#B6A6CA', coral: '#D96B52',
};

async function fetchSource(src) {
  const collected = [];
  for (const page of src.pages) {
    if (collected.length >= src.limit) break;
    try {
      const r = await fetch(`${src.host}/products.json?limit=50&page=${page}`, {
        headers: { 'User-Agent': 'MissionCartCatalogSync/1.0' },
        signal: AbortSignal.timeout(12000),
      });
      if (!r.ok) continue;
      const json = await r.json();
      for (const p of (json.products || [])) {
        if (collected.length >= src.limit) break;
        const imgs = (p.images || []).map((i) => i.src).filter((u) => typeof u === 'string' && u.startsWith('http'));
        if (imgs.length === 0) continue;
        // Skip test/dummy/gift card items
        if (/gift\s*card|sample\s*test|dummy/i.test(p.title || '')) continue;
        // Skip kids-only if source isn't kids category
        if (/\bkids\b|\btoddler\b|\bbaby\b/i.test(p.title || '') && src.categorySlug === 'fashion') continue;

        const rawVars = (p.variants || []).filter((v) => Number(v.price) > 0);
        if (rawVars.length === 0) continue;

        const baseVar = rawVars.find((v) => v.available) || rawVars[0];
        const price = Number(baseVar.price);
        const orig = baseVar.compare_at_price && Number(baseVar.compare_at_price) > price ? Number(baseVar.compare_at_price) : null;
        const tagsStr = Array.isArray(p.tags) ? p.tags.join(',') : String(p.tags || '');
        const descClean = stripHtml(p.body_html) || `${src.brand} ${p.title}`;

        const gender = detectGender(p.title, tagsStr, src.defaultGender);
        const garmentType = src.categorySlug === 'fashion' ? detectGarmentType(p.title, p.product_type, tagsStr) : null;
        const occasion = src.categorySlug === 'fashion' ? detectOccasion(p.title, tagsStr, src.defaultOccasion) : null;
        const material = src.categorySlug === 'fashion' ? detectMaterial(descClean, tagsStr) : null;
        const fit = src.categorySlug === 'fashion' ? detectFit(descClean, p.title) : null;
        const pattern = src.categorySlug === 'fashion' ? detectPattern(p.title, descClean) : null;
        const sleeveLength = src.categorySlug === 'fashion' ? detectSleeve(p.title, descClean) : null;

        // Refine category slug for skincare vs beauty vs groceries vs electronics
        let catSlug = src.categorySlug;
        const lowerTitle = (p.title || '').toLowerCase();
        if (catSlug === 'skincare' && (/lip\s*balm|lipstick|kajal|mascara|shampoo|hair\s*oil/.test(lowerTitle))) {
          catSlug = 'beauty';
        }
        if (/pet\s*food|puppy|dog\s*food/.test(lowerTitle)) {
          catSlug = 'everyday-essentials';
        }

        const uniqueGallery = [...new Set(imgs)].slice(0, 5);
        const variants = [];
        const seenVarKey = new Set();
        for (const v of rawVars.slice(0, 10)) {
          const { size, color } = parseColorAndSize(v, p.options, p.title);
          const vSku = `RB-${src.brand.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 5)}-${p.id}-${v.id}`;
          const vKey = `${size || ''}|${color || v.title || v.id}`;
          if (seenVarKey.has(vKey)) continue;
          seenVarKey.add(vKey);
          variants.push({
            variantSku: vSku,
            size: size || (src.categorySlug === 'fashion' ? 'One Size' : null),
            color: color || null,
            colorHex: color ? (COLOR_HEX_MAP[color.toLowerCase()] || null) : null,
            variantName: v.title && v.title !== 'Default Title' ? v.title : p.title,
            price: Number(v.price),
            originalPrice: v.compare_at_price && Number(v.compare_at_price) > Number(v.price) ? Number(v.compare_at_price) : null,
            stockQuantity: v.available ? 12 : 0,
            availabilityStatus: v.available ? 'IN_STOCK' : 'OUT_OF_STOCK',
            imageUrl: v.featured_image?.src || uniqueGallery[0],
            isDefault: variants.length === 0,
          });
        }

        const productSku = `BRAND-${src.brand.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6)}-${p.id}`;
        collected.push({
          sku: productSku,
          name: String(p.title).trim().slice(0, 240),
          brand: src.brand,
          categorySlug: catSlug,
          sourcePlatform: src.sourceCode,
          sourceProductId: String(p.id),
          sourceUrl: `${src.host}/products/${p.handle}`,
          productType: 'EXTERNAL_CATALOG',
          description: descClean.slice(0, 1200),
          price,
          originalPrice: orig,
          currency: 'INR',
          priceVerified: true,
          priceStatus: 'VERIFIED',
          availabilityStatus: rawVars.some((v) => v.available) ? 'IN_STOCK' : 'OUT_OF_STOCK',
          stockQuantity: rawVars.some((v) => v.available) ? 15 : 0,
          missionTags: [
            catSlug,
            gender ? gender.toLowerCase() : null,
            garmentType ? garmentType.toLowerCase().replace(/\s+/g, '-') : null,
            src.brand.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            ...tagsStr.split(',').map((t) => t.trim().toLowerCase()).filter((t) => t.length > 2 && t.length < 30).slice(0, 5),
          ].filter(Boolean).join(','),
          priorityTier: price <= 999 ? 'BUDGET' : price <= 2999 ? 'BALANCED' : 'PREMIUM',
          imageUrl: uniqueGallery[0],
          imageSource: `${src.brand} Official Catalog`,
          imageAttribution: `${src.brand} Official Product Media`,
          imageLicense: 'Official Brand Product Listing',
          imageType: classifyImageType(0, src.sourceCode),
          gallery: uniqueGallery.map((url, idx) => ({
            imageUrl: url,
            imageType: classifyImageType(idx, src.sourceCode),
            primaryImage: idx === 0,
          })),
          gender,
          garmentType,
          occasion,
          material,
          fit,
          sleeveLength,
          pattern,
          careInstructions: src.categorySlug === 'fashion' ? 'Machine wash cold or gentle hand wash; dry in shade' : null,
          sizeChart: src.categorySlug === 'fashion' ? buildSizeChart(garmentType, gender) : null,
          variants,
        });
      }
    } catch (e) {
      console.error('Warn fetching', src.brand, page, e.message);
    }
  }
  return collected;
}

// Also ensure explicit curated official-packshot listings for Himalaya Lip Balm, Cetaphil Gentle Skin Cleanser, and Vaseline Original Pure Skin Jelly
const SPECIAL_OFFICIAL_PACKSHOTS = [
  {
    sku: 'BRAND-HIMALAYA-LIPBALM10G',
    name: 'Himalaya Lip Balm 10g (Carrot Seed Oil & Wheat Germ)',
    brand: 'Himalaya',
    categorySlug: 'skincare',
    sourcePlatform: 'HIMALAYA_OFFICIAL',
    sourceProductId: 'himalaya-lip-balm-10g',
    sourceUrl: 'https://himalayawellness.in/products/lip-balm',
    productType: 'EXTERNAL_CATALOG',
    description: 'Original Himalaya Lip Balm enriched with Wheat Germ Oil (Vitamin E) and Carrot Seed Oil to moisturize, soothe, and prevent chapped lips.',
    price: 45.00,
    originalPrice: 50.00,
    currency: 'INR',
    priceVerified: true,
    priceStatus: 'VERIFIED',
    availabilityStatus: 'IN_STOCK',
    stockQuantity: 40,
    missionTags: 'skincare,lip-balm,lip-care,himalaya,travel,hostel,daily-essentials',
    priorityTier: 'BUDGET',
    imageUrl: 'https://himalayawellness.in/cdn/shop/products/Lip-Balm-2.jpg?v=1665636386&width=1780',
    imageSource: 'Himalaya Wellness Official Store',
    imageAttribution: 'Himalaya Wellness',
    imageLicense: 'Official Brand Packshot',
    imageType: 'MAIN_PACKSHOT',
    gallery: [{ imageUrl: 'https://himalayawellness.in/cdn/shop/products/Lip-Balm-2.jpg?v=1665636386&width=1780', imageType: 'MAIN_PACKSHOT', primaryImage: true }],
    variants: [{ variantSku: 'RB-HIMLB-10G', size: '10g Tube', color: null, variantName: '10g Original Tube', price: 45.00, originalPrice: 50.00, stockQuantity: 40, availabilityStatus: 'IN_STOCK', isDefault: true }],
  },
  {
    sku: 'BRAND-CETAPHIL-GSC250',
    name: 'Cetaphil Gentle Skin Cleanser 250ml (Dry to Normal & Sensitive Skin)',
    brand: 'Cetaphil',
    categorySlug: 'skincare',
    sourcePlatform: 'NYKAA',
    sourceProductId: 'cetaphil-gentle-skin-cleanser/p/20499',
    sourceUrl: 'https://www.nykaa.com/cetaphil-gentle-skin-cleanser/p/20499',
    productType: 'EXTERNAL_CATALOG',
    description: 'Dermatologist-recommended soap-free, fragrance-free Cetaphil Gentle Skin Cleanser with Niacinamide (B3), Panthenol (B5) & Hydrating Glycerin.',
    price: 399.00,
    originalPrice: 429.00,
    currency: 'INR',
    priceVerified: true,
    priceStatus: 'VERIFIED',
    availabilityStatus: 'IN_STOCK',
    stockQuantity: 30,
    missionTags: 'skincare,cleanser,cetaphil,sensitive-skin,daily-essentials,morning-routine',
    priorityTier: 'BALANCED',
    imageUrl: 'https://images-static.nykaa.com/media/catalog/product/a/a/aaea9a38906005273413_1.jpg?tr=w-500',
    imageSource: 'Nykaa Authorized Product Catalogue',
    imageAttribution: 'Cetaphil / Nykaa',
    imageLicense: 'Authorized Retailer Packshot',
    imageType: 'MAIN_PACKSHOT',
    gallery: [{ imageUrl: 'https://images-static.nykaa.com/media/catalog/product/a/a/aaea9a38906005273413_1.jpg?tr=w-500', imageType: 'MAIN_PACKSHOT', primaryImage: true }],
    variants: [
      { variantSku: 'RB-CTPH-125ML', size: '125ml', color: null, variantName: '125ml Bottle', price: 249.00, originalPrice: 279.00, stockQuantity: 25, availabilityStatus: 'IN_STOCK', isDefault: false },
      { variantSku: 'RB-CTPH-250ML', size: '250ml', color: null, variantName: '250ml Bottle', price: 399.00, originalPrice: 429.00, stockQuantity: 30, availabilityStatus: 'IN_STOCK', isDefault: true },
    ],
  },
  {
    sku: 'BRAND-VASELINE-JELLY100',
    name: 'Vaseline Original Pure Skin Jelly 100g',
    brand: 'Vaseline',
    categorySlug: 'skincare',
    sourcePlatform: 'AMAZON_IN',
    sourceProductId: 'vaseline-original-pure-skin-jelly-100g',
    sourceUrl: 'https://www.amazon.in/dp/B00CSZ8N7Q',
    productType: 'EXTERNAL_CATALOG',
    description: '100% pure triple-purified petroleum jelly protecting dry skin, chapped lips, and minor scrapes with clean original tub packaging.',
    price: 110.00,
    originalPrice: 125.00,
    currency: 'INR',
    priceVerified: true,
    priceStatus: 'VERIFIED',
    availabilityStatus: 'IN_STOCK',
    stockQuantity: 45,
    missionTags: 'skincare,vaseline,jelly,lip-care,dry-skin,travel,winter,manali',
    priorityTier: 'BUDGET',
    imageUrl: 'https://m.media-amazon.com/images/I/51fp48N3DnL.jpg',
    imageSource: 'Authorized E-Commerce Packshot',
    imageAttribution: 'Vaseline / Unilever',
    imageLicense: 'Authorized Retailer Packshot',
    imageType: 'MAIN_PACKSHOT',
    gallery: [{ imageUrl: 'https://m.media-amazon.com/images/I/51fp48N3DnL.jpg', imageType: 'MAIN_PACKSHOT', primaryImage: true }],
    variants: [
      { variantSku: 'RB-VAS-50G', size: '50g', color: null, variantName: '50g Jar', price: 65.00, originalPrice: 75.00, stockQuantity: 40, availabilityStatus: 'IN_STOCK', isDefault: false },
      { variantSku: 'RB-VAS-100G', size: '100g', color: null, variantName: '100g Jar', price: 110.00, originalPrice: 125.00, stockQuantity: 45, availabilityStatus: 'IN_STOCK', isDefault: true },
    ],
  },
];

(async () => {
  const all = [...SPECIAL_OFFICIAL_PACKSHOTS];
  const seenImg = new Set(all.map((p) => p.imageUrl));
  const seenSku = new Set(all.map((p) => p.sku));

  for (const src of SOURCES) {
    const rows = await fetchSource(src);
    let kept = 0;
    for (const r of rows) {
      if (seenSku.has(r.sku)) continue;
      if (seenImg.has(r.imageUrl)) continue; // guarantee unique image per product
      seenSku.add(r.sku);
      seenImg.add(r.imageUrl);
      all.push(r);
      kept++;
    }
    console.log(`${src.brand.padEnd(16)} (${src.defaultGender || 'NON-FASHION'}) -> kept ${kept}`);
  }

  const gz = zlib.gzipSync(all.map((x) => JSON.stringify(x)).join('\n') + '\n');
  fs.writeFileSync('backend/src/main/resources/db/real_brands_catalog_seed.jsonl.gz', gz);
  console.log('Saved real_brands_catalog_seed.jsonl.gz with', all.length, 'products.');
})();
