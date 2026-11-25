-- V9: Full ISO 3166 Country Metadata, User Country Persistence & 14 Homepage Editorial Collections

ALTER TABLE countries ADD COLUMN IF NOT EXISTS iso3 VARCHAR(8);
ALTER TABLE countries ADD COLUMN IF NOT EXISTS region VARCHAR(64);
ALTER TABLE countries ADD COLUMN IF NOT EXISTS default_locale VARCHAR(24);
ALTER TABLE countries ADD COLUMN IF NOT EXISTS dial_code VARCHAR(16);
ALTER TABLE countries ADD COLUMN IF NOT EXISTS is_popular BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_country VARCHAR(8) DEFAULT 'IN';
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_delivery_country VARCHAR(8) DEFAULT 'IN';

-- 14 Homepage Editorial Collections (backed dynamically by real DB listings per active country)
INSERT INTO editorial_collections (category_slug, slug, title, subtitle, description, filter_params_json, display_order) VALUES
('home-featured', 'home-fashion-edit', 'Fashion Edit Collection', 'Tailored Apparel & Global Style', 'Elevated everyday silhouettes, dresses, shirts, and seasonal staples across verified brands.', '{"categories":["fashion"]}', 1),
('home-featured', 'home-old-money', 'Old Money Collection', 'Crisp Poplin, Linen & Classic Craft', 'Structured shirts, trousers, blazers, chinos, and heirloom-inspired accessories.', '{"categories":["fashion"],"keywords":["shirt","blazer","trouser","chino","linen","polo","watch"]}', 2),
('home-featured', 'home-everyday-essentials', 'Everyday Essentials Collection', 'Reliable Daily Staples & Care', 'Daily pantry, personal care, cables, mugs, and calm functional essentials.', '{"categories":["everyday-essentials","groceries","personal-care"]}', 3),
('home-featured', 'home-beauty-ritual', 'Beauty Ritual Collection', 'Cleansers, Serums & Lip Care', 'Clean skincare, SPF, moisturizers, lip balms, and studio-verified beauty edits.', '{"categories":["skincare","beauty"]}', 4),
('home-featured', 'home-luxury-designer', 'Luxury Designer Collection', 'International Luxury Fashion Houses', 'Authorized heritage designer garments and leather goods sourced per country dataset.', '{"categories":["fashion"],"sourceTypes":["MANUFACTURER"],"minPrice":3500}', 5),
('home-featured', 'home-modern-home', 'Modern Home Collection', 'Ceramics, Kitchen & Warm Accents', 'Thoughtfully crafted cookware, tableware, vases, and room lighting.', '{"categories":["home-decor","kitchen"]}', 6),
('home-featured', 'home-travel-edit', 'Travel Edit Collection', 'Carry-Ons, Packs & Transit Gear', 'Smart luggage, power banks, universal adapters, and lightweight layers.', '{"categories":["travel","electronics"],"keywords":["backpack","suitcase","power bank","adapter","travel","jacket"]}', 7),
('home-featured', 'home-minimal-workspace', 'Minimal Workspace Collection', 'Desk Lighting, Audio & Focus', 'Ergonomic mice, desk lamps, notebooks, and productivity electronics.', '{"categories":["study-workspace","electronics"],"keywords":["desk","lamp","mouse","keyboard","headphone","notebook","stand"]}', 8),
('home-featured', 'home-streetwear', 'Streetwear Collection', 'Oversized Cuts, Cargos & Sneakers', 'Boxy graphic tees, fleece hoodies, cargo trousers, and everyday kicks.', '{"categories":["fashion"],"keywords":["oversized","hoodie","cargo","sweatshirt","sneaker"]}', 9),
('home-featured', 'home-soft-living', 'Soft Living Collection', 'Linens, Cushions & Cozy Rituals', 'Soft cotton bedsheets, ambient candles, throws, and organizer baskets.', '{"categories":["home-decor","storage-organization"],"keywords":["bed","cushion","blanket","candle","organizer","basket"]}', 10),
('home-featured', 'home-mens-style', 'Men''s Style Collection', 'Shirts, Denim, Polos & Footwear', 'Crisp menswear essentials curated across shirts, denim, formal shoes, and watches.', '{"gender":"MEN","categories":["fashion"]}', 11),
('home-featured', 'home-womens-style', 'Women''s Style Collection', 'Maxi Dresses, Kurtis & Co-ords', 'Flowing dresses, ethnic weaves, tops, handbags, and refined separates.', '{"gender":"WOMEN","categories":["fashion"]}', 12),
('home-featured', 'home-unisex', 'Unisex Collection', 'Gender-Neutral Street & Comfort', 'Relaxed inclusive cuts, sweatshirts, totes, and versatile unisex pieces.', '{"gender":"UNISEX","categories":["fashion"]}', 13),
('home-featured', 'home-premium-accessories', 'Premium Accessories Collection', 'Watches, Jewellery, Bags & Eyewear', 'Leather handbags, minimal timepieces, silver jewellery, and sunglasses.', '{"categories":["fashion"],"keywords":["watch","bag","jewellery","sunglasses","wallet","handbag"]}', 14);
