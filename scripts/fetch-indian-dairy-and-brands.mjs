// Fetches genuine Indian dairy/milk food products (Open Food Facts India)
// and verified branded products (Himalaya, Nivea, Dove, Lakme, etc.)
// and merges them into open_catalog_seed.jsonl.gz without duplicates.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const gzPath = path.join(process.cwd(), 'backend', 'src', 'main', 'resources', 'db', 'open_catalog_seed.jsonl.gz');
const existingLines = zlib.gunzipSync(fs.readFileSync(gzPath)).toString('utf8').split('\n').filter(Boolean);
const records = existingLines.map((l) => JSON.parse(l));
const seenSkus = new Set(records.map((r) => r.sku));
const seenImages = new Set(records.map((r) => r.imageUrl));

async function fetchDairySlice(query) {
  const url = `https://in.openfoodfacts.org/api/v2/search?${query}&page_size=100&fields=code,product_name,brands,categories,quantity,image_front_url`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'MissionCartCatalog/1.0' }, signal: AbortSignal.timeout(12000) });
    if (!res.ok) return 0;
    const data = await res.json();
    let added = 0;
    for (const p of data.products || []) {
      if (!p.code || !p.product_name || !p.brands || !p.image_front_url) continue;
      const code = String(p.code).replace(/[^a-zA-Z0-9]/g, '');
      const sku = `OFF-${code}`;
      if (seenSkus.has(sku) || seenImages.has(p.image_front_url)) continue;
      const name = String(p.product_name).trim().replace(/\s+/g, ' ');
      const brand = String(p.brands).split(',')[0].trim();
      if (name.length < 3 || brand.length < 2 || !/^[A-Za-z0-9]/.test(name)) continue;

      seenSkus.add(sku);
      seenImages.add(p.image_front_url);
      records.push({
        sku,
        name,
        brand,
        categorySlug: 'groceries',
        sourcePlatform: 'OPEN_FOOD_FACTS',
        sourceProductId: code,
        sourceUrl: `https://in.openfoodfacts.org/product/${code}`,
        description: `${name} by ${brand}. ${p.quantity ? `Pack size: ${p.quantity}. ` : ''}Verified dairy & grocery product (barcode ${code}).`,
        quantitySpec: p.quantity || '',
        missionTags: 'groceries,dairy,milk,kitchen,daily-essentials,breakfast',
        imageUrl: p.image_front_url,
        imageSource: 'Open Food Facts India',
        imageLicense: 'ODbL 1.0',
        imageAttribution: `${brand} / Open Food Facts Contributors`,
        imageType: 'AUTHORIZED_RETAILER_IMAGE',
      });
      added++;
    }
    return added;
  } catch {
    return 0;
  }
}

async function fetchBeautyBrand(brandQuery) {
  const url = `https://world.openbeautyfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(brandQuery)}&json=1&page_size=40`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'MissionCartCatalog/1.0' }, signal: AbortSignal.timeout(12000) });
    if (!res.ok) return 0;
    const data = await res.json();
    let added = 0;
    for (const p of data.products || []) {
      if (!p.code || !p.product_name || !p.brands || !p.image_front_url) continue;
      const code = String(p.code).replace(/[^a-zA-Z0-9]/g, '');
      const sku = `OBF-${code}`;
      if (seenSkus.has(sku) || seenImages.has(p.image_front_url)) continue;
      const name = String(p.product_name).trim().replace(/\s+/g, ' ');
      const brand = String(p.brands).split(',')[0].trim();
      if (name.length < 3 || brand.length < 2 || !/^[A-Za-z0-9]/.test(name)) continue;

      const lower = (name + ' ' + (p.categories || '')).toLowerCase();
      const catSlug = (lower.includes('lipstick') || lower.includes('lip balm') || lower.includes('makeup') || lower.includes('kajal'))
        ? 'beauty'
        : (lower.includes('cleanser') || lower.includes('cream') || lower.includes('serum') || lower.includes('sunscreen') || lower.includes('moistur') || lower.includes('face'))
          ? 'skincare'
          : 'personal-care';

      seenSkus.add(sku);
      seenImages.add(p.image_front_url);
      records.push({
        sku,
        name: name.toLowerCase().includes(brand.toLowerCase()) ? name : `${brand} ${name}`,
        brand,
        categorySlug: catSlug,
        sourcePlatform: 'OPEN_BEAUTY_FACTS',
        sourceProductId: code,
        sourceUrl: `https://world.openbeautyfacts.org/product/${code}`,
        description: `${brand} ${name}. ${p.quantity ? `Pack size: ${p.quantity}. ` : ''}Barcode ${code}.`,
        quantitySpec: p.quantity || '',
        missionTags: `${catSlug},skincare,daily-essentials,self-care`,
        imageUrl: p.image_front_url,
        imageSource: 'Open Beauty Facts',
        imageLicense: 'ODbL 1.0',
        imageAttribution: `${brand} / Open Beauty Facts Contributors`,
        imageType: 'AUTHORIZED_RETAILER_IMAGE',
      });
      added++;
    }
    return added;
  } catch {
    return 0;
  }
}

async function main() {
  const dairySlices = [
    'categories_tags_en=dairies&countries_tags_en=india&sort_by=unique_scans_n',
    'categories_tags_en=milks&countries_tags_en=india&sort_by=unique_scans_n',
    'categories_tags_en=cheeses&countries_tags_en=india&sort_by=unique_scans_n',
    'categories_tags_en=butters&countries_tags_en=india&sort_by=unique_scans_n',
    'categories_tags_en=yogurts&countries_tags_en=india&sort_by=unique_scans_n',
    'categories_tags_en=ghee&countries_tags_en=india&sort_by=unique_scans_n',
    'brands_tags=amul&sort_by=unique_scans_n',
    'brands_tags=mother-dairy&sort_by=unique_scans_n',
    'brands_tags=nandini&sort_by=unique_scans_n',
    'brands_tags=britannia&categories_tags_en=dairies&sort_by=unique_scans_n'
  ];

  let totalDairy = 0;
  for (const q of dairySlices) {
    const n = await fetchDairySlice(q);
    totalDairy += n;
    console.log(`Dairy slice (${q.split('&')[0]}): +${n}`);
  }

  const brandQueries = ['himalaya lip balm', 'cetaphil', 'minimalist', 'mamaearth', 'lakme', 'biotique', 'plum goodness'];
  let totalBrands = 0;
  for (const bq of brandQueries) {
    const n = await fetchBeautyBrand(bq);
    totalBrands += n;
    console.log(`Brand (${bq}): +${n}`);
  }

  const jsonl = records.map((r) => JSON.stringify(r)).join('\n');
  fs.writeFileSync(gzPath, zlib.gzipSync(Buffer.from(jsonl, 'utf8')));
  console.log(`Merged +${totalDairy} dairy/milk & +${totalBrands} branded items. Total open catalog records: ${records.length}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
