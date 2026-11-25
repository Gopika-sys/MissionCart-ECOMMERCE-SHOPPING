import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const CSV_DIR = 'C:/Users/Gopika/Downloads/archive (2)';

const SOURCES = [
  // Women's Fashion
  { file: 'Western Wear.csv', categorySlug: 'fashion', gender: 'WOMEN', cap: 320, occasion: 'Casual & Party' },
  { file: 'Ethnic Wear.csv', categorySlug: 'fashion', gender: 'WOMEN', cap: 260, occasion: 'Wedding & Ethnic' },
  { file: 'Womens Fashion.csv', categorySlug: 'fashion', gender: 'WOMEN', cap: 150, occasion: 'Everyday' },
  { file: 'Handbags and Clutches.csv', categorySlug: 'fashion', gender: 'WOMEN', cap: 80, occasion: 'Casual & Party', forceGarment: 'Handbag' },
  { file: 'Fashion Sandals.csv', categorySlug: 'fashion', gender: 'WOMEN', cap: 60, occasion: 'Casual & Ethnic', forceGarment: 'Footwear' },
  { file: 'Fashion and Silver Jewellery.csv', categorySlug: 'fashion', gender: 'WOMEN', cap: 60, occasion: 'Wedding & Party', forceGarment: 'Jewellery' },
  // Men's Fashion
  { file: 'Shirts.csv', categorySlug: 'fashion', gender: 'MEN', cap: 240, occasion: 'Formal & Casual' },
  { file: 'T-shirts and Polos.csv', categorySlug: 'fashion', gender: 'MEN', cap: 240, occasion: 'Casual & Streetwear' },
  { file: 'Jeans.csv', categorySlug: 'fashion', gender: 'MEN', cap: 180, occasion: 'Casual' },
  { file: 'Mens Fashion.csv', categorySlug: 'fashion', gender: 'MEN', cap: 200, occasion: 'Formal & Casual' },
  { file: 'Formal Shoes.csv', categorySlug: 'fashion', gender: 'MEN', cap: 60, occasion: 'Formal & Wedding', forceGarment: 'Formal Shoes' },
  { file: 'Casual Shoes.csv', categorySlug: 'fashion', gender: 'MEN', cap: 70, occasion: 'Casual', forceGarment: 'Sneakers' },
  // Unisex & Gender-Neutral Streetwear / Sportswear / Bags
  { file: 'Sportswear.csv', categorySlug: 'fashion', gender: 'UNISEX', cap: 130, occasion: 'Sportswear' },
  { file: 'Sports Shoes.csv', categorySlug: 'fashion', gender: 'UNISEX', cap: 80, occasion: 'Sportswear', forceGarment: 'Sneakers' },
  { file: 'Backpacks.csv', categorySlug: 'fashion', gender: 'UNISEX', cap: 70, occasion: 'College & Travel', forceGarment: 'Backpack' },
  { file: 'Watches.csv', categorySlug: 'fashion', gender: 'UNISEX', cap: 70, occasion: 'Formal & Casual', forceGarment: 'Watch' },
  { file: 'Sunglasses.csv', categorySlug: 'fashion', gender: 'UNISEX', cap: 50, occasion: 'Travel & Summer', forceGarment: 'Accessories' },
  // Skincare, Beauty, Electronics, Home, Kitchen, Fitness, Groceries
  { file: 'Beauty and Grooming.csv', categorySlug: 'skincare', gender: null, cap: 140, occasion: 'Daily Care' },
  { file: 'Make-up.csv', categorySlug: 'beauty', gender: null, cap: 80, occasion: 'Beauty' },
  { file: 'Health and Personal Care.csv', categorySlug: 'personal-care', gender: null, cap: 80, occasion: 'Daily Hygiene' },
  { file: 'All Electronics.csv', categorySlug: 'electronics', gender: null, cap: 90, occasion: 'Tech' },
  { file: 'Headphones.csv', categorySlug: 'electronics', gender: null, cap: 60, occasion: 'Audio' },
  { file: 'Speakers.csv', categorySlug: 'electronics', gender: null, cap: 50, occasion: 'Audio' },
  { file: 'All Home and Kitchen.csv', categorySlug: 'kitchen', gender: null, cap: 80, occasion: 'Home' },
  { file: 'Kitchen and Dining.csv', categorySlug: 'kitchen', gender: null, cap: 70, occasion: 'Kitchen' },
  { file: 'Home Dcor.csv', categorySlug: 'home-decor', gender: null, cap: 60, occasion: 'Decor' },
  { file: 'Home Storage.csv', categorySlug: 'storage-organization', gender: null, cap: 60, occasion: 'Storage' },
  { file: 'All Exercise and Fitness.csv', categorySlug: 'fitness', gender: null, cap: 60, occasion: 'Workout' },
  { file: 'All Grocery and Gourmet Foods.csv', categorySlug: 'groceries', gender: null, cap: 90, occasion: 'Groceries' },
  { file: 'Coffee Tea and Beverages.csv', categorySlug: 'groceries', gender: null, cap: 60, occasion: 'Breakfast' },
];

const KNOWN_BRANDS = [
  'Allen Solly', 'Van Heusen', 'Peter England', 'Louis Philippe', "Levi's", 'Levis', 'U.S. Polo Assn.', 'US Polo',
  'Tommy Hilfiger', 'Calvin Klein', 'Pepe Jeans', 'Wrangler', 'Lee', 'Mufti', 'Roadster', 'HRX', 'Puma', 'Adidas',
  'Nike', 'Reebok', 'Skechers', 'Sparx', 'Red Tape', 'Bata', 'Woodland', 'Wildcraft', 'American Tourister', 'Skybags',
  'Biba', 'Aurelia', 'W for Woman', 'Fabindia', 'Libas', 'Global Desi', 'ONLY', 'Vero Moda', 'Max', 'AND',
  'ANNI DESIGNER', 'Vaamsi', 'Bollyclues', 'Leriya Fashion', 'Symbol', 'Amazon Brand', 'Jack & Jones', 'Flying Machine',
  'H&M', 'Zara', 'Fastrack', 'Titan', 'Timex', 'Casio', 'Fossil', 'Lenskart', 'Vincent Chase', 'Fasttrack',
  'Himalaya', 'Cetaphil', 'Vaseline', 'Nivea', 'Dove', 'Lakme', 'Maybelline', 'Mamaearth', 'Minimalist', 'Plum',
  'Biotique', 'Parachute', 'Neutrogena', 'Garnier', 'Loreal', "L'Oreal", 'WOW Skin Science', 'The Derma Co', 'Dot & Key',
  'Aqualogica', 'boAt', 'JBL', 'Sony', 'Samsung', 'Apple', 'HP', 'Dell', 'Lenovo', 'Logitech', 'Anker', 'Portronics',
  'Philips', 'Prestige', 'Pigeon', 'Milton', 'Cello', 'Amul', 'Mother Dairy', 'Britannia', 'Tata', 'Nescafe', 'Bru',
  'Nutraj', 'Saffola', 'Quaker', 'Bournvita'
];

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === ',' && !inQ) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function parseInr(str) {
  if (!str) return null;
  const cleaned = String(str).replace(/[^0-9.]/g, '');
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) && num > 0 ? num : null;
}

function normalizeAmazonImage(url) {
  if (!url || !url.startsWith('http')) return null;
  // Strip /W/IMAGERENDERING_xxx prefix because Amazon CDN returns 400 with it but 200 without it
  return url.replace(/\/images\/W\/[^/]+\/images\//, '/images/');
}

function extractBrand(name) {
  const lower = name.toLowerCase();
  for (const b of KNOWN_BRANDS) {
    if (lower.includes(b.toLowerCase())) {
      if (b === 'Levis') return "Levi's";
      if (b === 'US Polo') return 'US Polo Assn.';
      if (b === 'Loreal') return "L'Oreal Paris";
      if (b === 'Amazon Brand') return 'Amazon Brand - Symbol';
      return b;
    }
  }
  const firstWord = name.trim().split(/[\s(]+/)[0]?.replace(/[^A-Za-z0-9&'.-]/g, '');
  if (firstWord && firstWord.length >= 2 && !/^(women|men|unisex|pack|combo|set|pair|cotton|solid|printed)$/i.test(firstWord)) {
    return firstWord;
  }
  return 'Amazon Fashion';
}

function detectGarmentType(name, forceGarment) {
  if (forceGarment) return forceGarment;
  const hay = name.toLowerCase();
  const map = [
    ['maxi dress', 'Maxi Dress'], ['midi dress', 'Midi Dress'], ['mini dress', 'Mini Dress'],
    ['floral', 'Floral Dress'], ['bodycon', 'Bodycon Dress'], ['a-line', 'A-Line Dress'],
    ['shirt dress', 'Shirt Dress'], ['dress', 'Dress'],
    ['lehenga', 'Lehenga Set'], ['anarkali', 'Anarkali'], ['salwar', 'Salwar Suit'], ['saree', 'Saree'],
    ['kurta set', 'Kurta Set'], ['kurti', 'Kurti'], ['kurta', 'Kurta'], ['sherwani', 'Sherwani'],
    ['co-ord', 'Co-ord Set'], ['jumpsuit', 'Jumpsuit'],
    ['oversized', 'Oversized T-Shirt'], ['hoodie', 'Hoodie'], ['sweatshirt', 'Sweatshirt'],
    ['polo', 'Polo T-Shirt'], ['t-shirt', 'T-Shirt'], ['formal shirt', 'Formal Shirt'], ['shirt', 'Casual Shirt'],
    ['blazer', 'Blazer'], ['jacket', 'Jacket'], ['cardigan', 'Cardigan'], ['sweater', 'Sweater'], ['top', 'Top'],
    ['palazzo', 'Palazzos'], ['wide-leg', 'Wide-Leg Pants'], ['wide leg', 'Wide-Leg Pants'],
    ['cargo', 'Cargo Pants'], ['chino', 'Chinos'], ['formal trouser', 'Formal Trousers'], ['trouser', 'Formal Trousers'],
    ['jogger', 'Joggers'], ['track pant', 'Track Pants'], ['jeans', 'Jeans'], ['skirt', 'Skirt'], ['shorts', 'Shorts'],
    ['sneaker', 'Sneakers'], ['loafer', 'Loafers'], ['formal shoe', 'Formal Shoes'], ['shoe', 'Footwear'],
  ];
  for (const [k, v] of map) if (hay.includes(k)) return v;
  return 'Apparel';
}

function detectAsin(link) {
  const m = String(link || '').match(/\/dp\/([A-Z0-9]{10})/i);
  return m ? m[1].toUpperCase() : null;
}

const existing = zlib.gunzipSync(fs.readFileSync('backend/src/main/resources/db/real_brands_catalog_seed.jsonl.gz'))
  .toString('utf8').split('\n').filter(Boolean).map(JSON.parse);

const seenSku = new Set(existing.map(x => x.sku));
const seenImg = new Set(existing.map(x => x.imageUrl));
let totalAdded = 0;

for (const src of SOURCES) {
  const fullPath = path.join(CSV_DIR, src.file);
  if (!fs.existsSync(fullPath)) continue;
  const lines = fs.readFileSync(fullPath, 'utf8').split('\n').filter(Boolean);
  let count = 0;
  // Prioritize known-brand and priority-keyword hits first, then remaining clean items up to src.cap
  const parsed = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length < 9) continue;
    const [name, , , rawImg, link, ratingsStr, ratingCountStr, discStr, actStr] = cols;
    if (!name || name.length < 5) continue;
    if (src.categorySlug === 'fashion' && /\bkids\b|\btoddler\b|\bboy's\b|\bgirl's\b|\bchild\b/i.test(name)) continue;

    const imgUrl = normalizeAmazonImage(rawImg);
    if (!imgUrl || seenImg.has(imgUrl)) continue;
    const price = parseInr(discStr) || parseInr(actStr);
    const orig = parseInr(actStr);
    if (!price || price <= 0) continue;
    const asin = detectAsin(link);
    const sku = asin ? `AMZIN-${asin}` : `AMZIN-${Math.abs([...name].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7))}`;
    if (seenSku.has(sku)) continue;

    const isKnown = KNOWN_BRANDS.some(b => name.toLowerCase().includes(b.toLowerCase()));
    const isPriority = /(himalaya.*lip|cetaphil|vaseline|floral.*maxi|maxi.*dress|formal.*trouser|oversized.*t-shirt|kurta|saree|lehenga|chinos|hoodie|milk|ghee|paneer|butter|curd)/i.test(name);
    const ratingVal = Number(ratingsStr);
    parsed.push({
      priorityScore: (isPriority ? 20 : 0) + (isKnown ? 10 : 0) + (Number.isFinite(ratingVal) ? ratingVal : 0),
      sku, name: name.trim().slice(0, 240), imgUrl, link, price, orig: (orig && orig > price ? orig : null),
      rating: Number.isFinite(ratingVal) && ratingVal > 0 && ratingVal <= 5 ? ratingVal : null,
      reviewCount: parseInt(String(ratingCountStr || '').replace(/[^0-9]/g, ''), 10) || 0,
      asin,
    });
  }

  parsed.sort((a, b) => b.priorityScore - a.priorityScore);
  for (const row of parsed) {
    if (count >= src.cap) break;
    if (seenSku.has(row.sku) || seenImg.has(row.imgUrl)) continue;
    seenSku.add(row.sku);
    seenImg.add(row.imgUrl);

    const lowerName = row.name.toLowerCase();
    let gender = src.gender;
    if (gender && /\bunisex\b|men's & women|men and women|oversized/i.test(row.name)) gender = 'UNISEX';
    else if (gender && /\bwomen\b|\bwomen's\b|\bsaree\b|\blehenga\b|\bkurti\b/i.test(row.name) && !/\bmen's\b/i.test(row.name)) gender = 'WOMEN';

    let catSlug = src.categorySlug;
    if (catSlug === 'skincare' && /lipstick|kajal|mascara|eyeliner|foundation|nail/i.test(lowerName)) catSlug = 'beauty';

    const garmentType = catSlug === 'fashion' ? detectGarmentType(row.name, src.forceGarment) : null;
    const brand = extractBrand(row.name);
    const cleanUrl = row.link && row.link.startsWith('http')
      ? (row.link.includes('/dp/') ? `https://www.amazon.in/dp/${row.asin}` : row.link.slice(0, 500))
      : `https://www.amazon.in/dp/${row.asin}`;

    existing.push({
      sku: row.sku,
      name: row.name,
      brand,
      categorySlug: catSlug,
      sourcePlatform: 'AMAZON_IN',
      sourceProductId: row.asin || row.sku,
      sourceUrl: cleanUrl,
      productType: 'EXTERNAL_CATALOG',
      description: `${row.name} listed via Amazon India catalog (${brand}).`,
      price: row.price,
      originalPrice: row.orig,
      currency: 'INR',
      priceVerified: true,
      priceStatus: 'ESTIMATED',
      availabilityStatus: 'IN_STOCK',
      stockQuantity: 10,
      rating: row.rating,
      reviewCount: row.reviewCount,
      ratingVerified: row.rating !== null && row.reviewCount > 0,
      missionTags: [
        catSlug,
        gender ? gender.toLowerCase() : null,
        garmentType ? garmentType.toLowerCase().replace(/\s+/g, '-') : null,
        brand.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        /floral/i.test(lowerName) ? 'floral' : null,
        /maxi/i.test(lowerName) ? 'maxi' : null,
        /oversized/i.test(lowerName) ? 'oversized' : null,
        /formal/i.test(lowerName) ? 'formal' : null,
        /wedding|ethnic|kurta|saree|lehenga/i.test(lowerName) ? 'wedding' : null,
        /milk|dairy|ghee|butter|cheese|paneer|curd/i.test(lowerName) ? 'dairy' : null,
      ].filter(Boolean).join(','),
      priorityTier: row.price <= 799 ? 'BUDGET' : row.price <= 2499 ? 'BALANCED' : 'PREMIUM',
      imageUrl: row.imgUrl,
      imageSource: 'Amazon India Product Listing',
      imageAttribution: `${brand} / Amazon India`,
      imageLicense: 'Marketplace Catalog Reference',
      imageType: 'AUTHORIZED_RETAILER_IMAGE',
      gallery: [{ imageUrl: row.imgUrl, imageType: 'AUTHORIZED_RETAILER_IMAGE', primaryImage: true }],
      gender,
      garmentType,
      occasion: src.occasion,
      material: /cotton/i.test(lowerName) ? 'Cotton Blend' : /silk/i.test(lowerName) ? 'Silk Blend' : /linen/i.test(lowerName) ? 'Linen Blend' : /denim/i.test(lowerName) ? 'Denim' : null,
      fit: /oversized/i.test(lowerName) ? 'Oversized Fit' : /slim/i.test(lowerName) ? 'Slim Fit' : /regular/i.test(lowerName) ? 'Regular Fit' : null,
      pattern: /floral/i.test(lowerName) ? 'Floral' : /printed/i.test(lowerName) ? 'Printed' : /checked/i.test(lowerName) ? 'Checked' : /striped/i.test(lowerName) ? 'Striped' : null,
      variants: (() => {
        if (catSlug !== 'fashion') return [];
        const m = /\b(XXS|XS|XXL|XXXL|XL|Small|Medium|Large|[23][02468])\b/i.exec(`${row.name} ${row.link}`);
        if (!m) return [];
        const szMap = { small: 'S', medium: 'M', large: 'L' };
        const sz = szMap[m[1].toLowerCase()] || m[1].toUpperCase();
        return [{ variantSku: `${row.sku}-${sz}`, size: sz, color: null, variantName: sz, price: row.price, originalPrice: row.orig, stockQuantity: 10, availabilityStatus: 'IN_STOCK', isDefault: true }];
      })(),
    });
    count++;
    totalAdded++;
  }
  console.log(`${src.file.padEnd(36)} -> added ${count}`);
}

fs.writeFileSync('backend/src/main/resources/db/real_brands_catalog_seed.jsonl.gz', zlib.gzipSync(existing.map(x => JSON.stringify(x)).join('\n') + '\n'));
console.log('Total real_brands_catalog_seed.jsonl.gz count:', existing.length, '(added', totalAdded, 'Amazon India products)');
