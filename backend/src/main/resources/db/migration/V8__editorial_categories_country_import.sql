-- V8: Editorial Category Experience, International Countries, Data Boutique Datasets & ZIP Media Staging

CREATE TABLE IF NOT EXISTS countries (
    code VARCHAR(8) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    flag_emoji VARCHAR(16) NOT NULL,
    currency_code VARCHAR(8) NOT NULL,
    currency_symbol VARCHAR(8) NOT NULL,
    size_system VARCHAR(32) NOT NULL,
    exchange_rate_to_inr DECIMAL(12,6) NOT NULL DEFAULT 1.000000,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INT NOT NULL DEFAULT 0
);

INSERT INTO countries (code, name, flag_emoji, currency_code, currency_symbol, size_system, exchange_rate_to_inr, is_active, display_order) VALUES
('IN', 'India', '🇮🇳', 'INR', '₹', 'IN/UK', 1.000000, TRUE, 1),
('IT', 'Italy', '🇮🇹', 'EUR', '€', 'EU/IT', 90.500000, TRUE, 2),
('FR', 'France', '🇫🇷', 'EUR', '€', 'EU/FR', 90.500000, TRUE, 3),
('GB', 'United Kingdom', '🇬🇧', 'GBP', '£', 'UK', 107.200000, TRUE, 4),
('US', 'United States', '🇺🇸', 'USD', '$', 'US', 84.500000, TRUE, 5),
('DE', 'Germany', '🇩🇪', 'EUR', '€', 'EU', 90.500000, TRUE, 6),
('AE', 'United Arab Emirates', '🇦🇪', 'AED', 'د.إ', 'EU/UK', 23.000000, TRUE, 7),
('SG', 'Singapore', '🇸🇬', 'SGD', 'S$', 'UK/US', 63.000000, TRUE, 8),
('JP', 'Japan', '🇯🇵', 'JPY', '¥', 'JP', 0.560000, TRUE, 9);

ALTER TABLE products ADD COLUMN IF NOT EXISTS country_code VARCHAR(8) NOT NULL DEFAULT 'IN';
ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_countries_json TEXT;

CREATE INDEX IF NOT EXISTS idx_products_country_pub ON products (country_code, is_published, is_approved);
CREATE INDEX IF NOT EXISTS idx_products_cat_country ON products (category_id, country_code);

ALTER TABLE categories ADD COLUMN IF NOT EXISTS hero_heading VARCHAR(240);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS hero_italic_accent VARCHAR(160);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS editorial_description TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS hero_image_url VARCHAR(500);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS featured_brands_json TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS subcategories_json TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS country_codes_json TEXT;

UPDATE categories SET
  hero_heading = 'Everyday style.',
  hero_italic_accent = 'Extraordinary expression.',
  editorial_description = 'Tailored silhouettes, elevated staples, and expressive occasionwear curated from real Indian & global fashion houses.',
  subcategories_json = '["Maxi Dress","Dress","Top","Shirt","T-Shirt","Jeans","Trousers","Kurti","Kurta","Saree","Lehenga","Co-ord Set","Footwear","Handbag","Watch","Jewellery","Accessories"]'
WHERE slug = 'fashion';

UPDATE categories SET
  hero_heading = 'Your beauty.',
  hero_italic_accent = 'Your everyday ritual.',
  editorial_description = 'Dermatologist-trusted cleansers, sunscreens, serums, and clean daily makeup photographed in crisp studio packshots.',
  subcategories_json = '["Cleansers","Moisturizers","Sunscreens","Serums","Toners","Makeup","Lip care","Haircare","Body care","Fragrances","Grooming"]'
WHERE slug IN ('beauty', 'skincare');

UPDATE categories SET
  hero_heading = 'Make space.',
  hero_italic_accent = 'Feel at home.',
  editorial_description = 'Calm linens, ceramic tableware, modular storage, and warm ambient lighting built to anchor everyday spaces.',
  subcategories_json = '["Bedroom","Bedding","Kitchen","Decor","Storage","Lighting","Tableware","Ceramics"]'
WHERE slug IN ('home-decor', 'kitchen', 'storage-organization');

UPDATE categories SET
  hero_heading = 'Technology.',
  hero_italic_accent = 'Made for everyday life.',
  editorial_description = 'Portable audio, surge-safe desk power, keyboards, lamps, and smart daily devices built with real specs.',
  subcategories_json = '["Work Desk","Smart Gadgets","Audio","Laptop Accessories","Mobile Accessories","Home Electronics","Productivity"]'
WHERE slug = 'electronics';

UPDATE categories SET
  hero_heading = 'Good food.',
  hero_italic_accent = 'Everyday essentials.',
  editorial_description = 'Fresh dairy staples, artisanal coffee roasts, whole-grain breakfasts, and verified pantry essentials strictly separated from beauty feeds.',
  subcategories_json = '["Dairy & Milk","Pantry Essentials","Breakfast","Snacks","Beverages","Cooking Essentials","Organic"]'
WHERE slug = 'groceries';

UPDATE categories SET
  hero_heading = 'Pack light.',
  hero_italic_accent = 'Explore more.',
  editorial_description = 'Cabin luggage, weather-ready layers, universal adapters, and compact transit essentials designed for smooth departures.',
  subcategories_json = '["Travel Bags","Weekend Edit","Airport Essentials","Travel Beauty","Accessories","Luggage","Adventure"]'
WHERE slug = 'travel';

UPDATE categories SET
  hero_heading = 'Move better.',
  hero_italic_accent = 'Feel stronger.',
  editorial_description = 'Supportive yoga mats, home strength gear, breathable activewear, and hydration built for lasting daily consistency.',
  subcategories_json = '["Home Workout","Yoga Edit","Gym Essentials","Activewear","Fitness Accessories"]'
WHERE slug = 'fitness';

UPDATE categories SET
  hero_heading = 'Create your space.',
  hero_italic_accent = 'Find your focus.',
  editorial_description = 'Ergonomic stands, tactile notebooks, USB-C hubs, and quiet desk organization crafted for deep creative sessions.',
  subcategories_json = '["Desk Setup","Productivity","Study Stationery","Tech Accessories","Organization","Work From Home"]'
WHERE slug = 'study-workspace';

CREATE TABLE IF NOT EXISTS editorial_collections (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    category_slug VARCHAR(100) NOT NULL,
    slug VARCHAR(120) NOT NULL UNIQUE,
    title VARCHAR(180) NOT NULL,
    subtitle VARCHAR(300),
    description TEXT,
    filter_params_json TEXT,
    country_code VARCHAR(8),
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_editorial_col_cat ON editorial_collections (category_slug, is_active);

-- Fashion Collections (10 distinct editorial panels)
INSERT INTO editorial_collections (category_slug, slug, title, subtitle, description, filter_params_json, display_order) VALUES
('fashion', 'womens-fashion-edit', 'Women''s Fashion', 'Dresses, Tops & Ethnic Silhouettes', 'Curated dresses, tailored trousers, and modern Indian separates for every setting.', '{"gender":"WOMEN","categories":["fashion"]}', 1),
('fashion', 'mens-fashion-edit', 'Men''s Fashion', 'Shirts, Chinos, Denim & Footwear', 'Crisp cotton shirts, tailored trousers, and structured layers from trusted menswear brands.', '{"gender":"MEN","categories":["fashion"]}', 2),
('fashion', 'unisex-gender-neutral', 'Unisex & Gender-Neutral', 'Relaxed Oversized Tees & Hoodies', 'Inclusive boxy cuts, fleece hoodies, and everyday streetwear.', '{"gender":"UNISEX","categories":["fashion"]}', 3),
('fashion', 'dresses-occasion-wear', 'Dresses & Occasion Wear', 'Maxi, Midi & Floral Edit', 'Flowing maxi dresses, midi wrap silhouettes, and evening styles.', '{"categories":["fashion"],"keywords":["dress","maxi","midi","floral"]}', 4),
('fashion', 'old-money-collection', 'Old Money Collection', 'Linen, Blazers & Classic Watch Craft', 'Understated earth tones, crisp Oxford shirts, chinos, and tailored layers.', '{"categories":["fashion"],"keywords":["linen","blazer","trouser","shirt","polo","chino"]}', 5),
('fashion', 'streetwear-collection', 'Streetwear Collection', 'Oversized Fits, Cargos & Sneakers', 'Boxy graphic tees, utility cargos, hoodies, and low-top sneakers.', '{"categories":["fashion"],"keywords":["oversized","hoodie","cargo","sweatshirt","sneaker"]}', 6),
('fashion', 'casual-everyday-collection', 'Casual Everyday Collection', 'Denim, Polos & Tees', 'Easy everyday layers engineered for comfort and durability.', '{"categories":["fashion"],"keywords":["t-shirt","jeans","casual","cotton"]}', 7),
('fashion', 'wedding-party-collection', 'Wedding & Party Collection', 'Kurtas, Sarees, Lehengas & Festives', 'Celebratory silk weaves, embroidered kurtis, and occasion footwear.', '{"categories":["fashion"],"keywords":["kurta","kurti","saree","lehenga","ethnic","wedding","party"]}', 8),
('fashion', 'luxury-designer-collection', 'Luxury Designer Collection', 'International Heritage Fashion Houses', 'Country-specific luxury garments and leather goods sourced via authorized datasets.', '{"categories":["fashion"],"sourceTypes":["MANUFACTURER"],"minPrice":4000}', 9),
('fashion', 'accessories-collection', 'Accessories Collection', 'Bags, Watches, Jewellery & Eyewear', 'Leather handbags, minimal timepieces, sunglasses, and everyday accents.', '{"categories":["fashion"],"keywords":["bag","watch","jewellery","sunglasses","wallet","belt"]}', 10);

-- Beauty Collections
INSERT INTO editorial_collections (category_slug, slug, title, subtitle, description, filter_params_json, display_order) VALUES
('beauty', 'skincare-essentials', 'Skincare Essentials', 'Gentle Cleansers, Moisturizers & SPF', 'Daily barrier-first skincare fundamentals from dermatologist-recommended brands.', '{"categories":["skincare","beauty"],"keywords":["cleanser","moisturizer","sunscreen","spf","cetaphil","minimalist"]}', 1),
('beauty', 'makeup-edit', 'Makeup Edit', 'Lipsticks, Kajal, Tint & Finish', 'Rich pigments, lip balms, and luminous everyday complexion staples.', '{"categories":["beauty","skincare"],"keywords":["lipstick","lip","kajal","mascara","foundation","eyeliner","makeup"]}', 2),
('beauty', 'haircare-ritual', 'Haircare Ritual', 'Nourishing Oils, Serums & Cleansers', 'Scalp care, botanical oils, and frizz-control serums.', '{"categories":["beauty","skincare"],"keywords":["hair","shampoo","serum","onion","bhringraj"]}', 3),
('beauty', 'body-care-collection', 'Body Care Collection', 'Rich Balms, Lotions & Scrubs', 'Hydrating body butters, pure skin jelly, and gentle washes.', '{"categories":["skincare","beauty","personal-care"],"keywords":["body","vaseline","lotion","scrub","butter","soap"]}', 4),
('beauty', 'minimal-beauty', 'Minimal Beauty', 'Actives With Transparent Ingredients', 'High-efficacy niacinamide, salicylic acid, and vitamin C serums.', '{"categories":["skincare","beauty"],"keywords":["minimalist","serum","niacinamide","salicylic","vitamin c"]}', 5),
('beauty', 'everyday-glow', 'Everyday Glow', 'Lip Care, Mists & Brightening', 'Quick everyday staples for dewy hydration from morning to night.', '{"categories":["skincare","beauty"],"keywords":["glow","lip balm","himalaya","plum","vitamin c","rose"]}', 6),
('beauty', 'fragrance-collection', 'Fragrance Collection', 'Eau de Parfum & Body Mists', 'Botanical mists, clean musks, and warm evening notes.', '{"categories":["beauty","personal-care"],"keywords":["perfume","mist","fragrance","deodorant"]}', 7),
('beauty', 'mens-grooming', 'Men''s Grooming', 'Beard Care, Face Washes & Trimmers', 'Precision trimmers, charcoal cleansers, and post-shave care.', '{"categories":["personal-care","beauty","electronics"],"keywords":["beard","grooming","trimmer","shave","men"]}', 8);

-- Home & Living Collections
INSERT INTO editorial_collections (category_slug, slug, title, subtitle, description, filter_params_json, display_order) VALUES
('home-living', 'bedroom-edit', 'Bedroom Edit', 'Bedsheets, Throws & Warm Cushions', 'Calm breathable cotton linens and soft furnishings.', '{"categories":["home-decor"],"keywords":["bed","cushion","sheet","pillow","blanket","linen"]}', 1),
('home-living', 'modern-kitchen', 'Modern Kitchen', 'Cookware, Kettles & Prep', 'Reliable induction cookware, kettles, and daily kitchen tools.', '{"categories":["kitchen"],"keywords":["kettle","pan","cookware","induction","knife","bottle"]}', 2),
('home-living', 'minimal-decor', 'Minimal Decor', 'Vases, Wall Accents & Sculptural Art', 'Thoughtfully glazed ceramics and understated decor pieces.', '{"categories":["home-decor"],"keywords":["vase","decor","wall","planter","clock"]}', 3),
('home-living', 'storage-solutions', 'Storage Solutions', 'Modular Bins, Racks & Closets', 'Space-maximizing organizers for wardrobes, pantries, and dorms.', '{"categories":["storage-organization","home-decor"],"keywords":["storage","organizer","basket","rack","container","box"]}', 4),
('home-living', 'lighting-collection', 'Lighting Collection', 'Ambient Lamps & Fairy Glow', 'Warm task and ambient lighting for calm evenings.', '{"categories":["home-decor","electronics"],"keywords":["lamp","light","candle","led"]}', 5),
('home-living', 'tableware-collection', 'Tableware Collection', 'Ceramic Plates, Bowls & Mugs', 'Artisanal stoneware cups, dinner plates, and serving bowls.', '{"categories":["kitchen","home-decor"],"keywords":["plate","mug","cup","bowl","glass","table"]}', 6);

-- Electronics Collections
INSERT INTO editorial_collections (category_slug, slug, title, subtitle, description, filter_params_json, display_order) VALUES
('electronics', 'audio-collection', 'Audio Collection', 'Headphones, Earbuds & Speakers', 'Wireless earbuds, ANC headphones, and portable Bluetooth speakers.', '{"categories":["electronics"],"keywords":["headphone","earbud","speaker","boat","audio"]}', 1),
('electronics', 'work-desk-essentials', 'Work Desk Essentials', 'Monitors, Keyboards, Mice & Power', 'Surge strips, ergonomic mice, webcams, and desk lighting.', '{"categories":["electronics","study-workspace"],"keywords":["mouse","keyboard","power strip","lamp","portronics","stand"]}', 2),
('electronics', 'laptop-accessories', 'Laptop Accessories', 'Hubs, Chargers & Cooling Stands', 'USB-C hubs, sleeves, and GaN chargers.', '{"categories":["electronics","study-workspace"],"keywords":["laptop","usb","hub","adapter","charger","cable"]}', 3),
('electronics', 'mobile-accessories', 'Mobile Accessories', 'Power Banks & Fast Charging', 'Pocket power banks, braided cables, and wireless pads.', '{"categories":["electronics"],"keywords":["power bank","cable","charger","phone","watch"]}', 4),
('electronics', 'home-electronics', 'Home Electronics', 'Smart Kettles, Induction & Care', 'Everyday utility electronics rated for local power standards.', '{"categories":["electronics","kitchen"],"keywords":["kettle","induction","trimmer","iron","fan"]}', 5);

-- Grocery & Food Collections
INSERT INTO editorial_collections (category_slug, slug, title, subtitle, description, filter_params_json, display_order) VALUES
('grocery', 'dairy-and-milk', 'Dairy & Milk', 'Milk, Curd, Paneer, Butter & Ghee', 'Verified grocery dairy essentials cleanly separated from skincare.', '{"categories":["groceries"],"keywords":["milk","dairy","curd","paneer","butter","ghee","cheese","yogurt"]}', 1),
('grocery', 'breakfast-collection', 'Breakfast Collection', 'Rolled Oats, Muesli & Spreads', 'Nutrient-dense breakfast staples to start the morning right.', '{"categories":["groceries"],"keywords":["oats","muesli","breakfast","cereal","honey","granola"]}', 2),
('grocery', 'beverages-edit', 'Beverages', 'Artisanal Coffee, Tea & Matcha', 'Freshly roasted coffee beans, herbal infusions, and masala chai.', '{"categories":["groceries"],"keywords":["coffee","tea","green tea","beverage","chai"]}', 3),
('grocery', 'snacks-and-pantry', 'Snacks & Pantry', 'Nuts, Seeds & Healthy Bakes', 'Trail mixes, dry fruits, and honest everyday pantry staples.', '{"categories":["groceries"],"keywords":["snack","trail","almond","nut","cookie","cracker","pantry"]}', 4);

-- Travel Collections
INSERT INTO editorial_collections (category_slug, slug, title, subtitle, description, filter_params_json, display_order) VALUES
('travel', 'travel-bags-luggage', 'Travel Bags & Luggage', 'Trolleys, Duffels & Backpacks', 'Lightweight hard-shell luggage and commuter backpacks.', '{"categories":["travel","fashion"],"keywords":["luggage","suitcase","backpack","duffel","trolley","bag"]}', 1),
('travel', 'airport-essentials', 'Airport Essentials', 'Adapters, Power Banks & Pouches', 'Carry-on organizers, universal plugs, and transit hydration.', '{"categories":["travel","electronics"],"keywords":["power bank","adapter","pillow","pouch","bottle","packing"]}', 2),
('travel', 'weekend-edit', 'Weekend Edit', 'All-Weather Layers & Casuals', 'Wrinkle-resistant travel layers and packable jackets.', '{"categories":["travel","fashion"],"keywords":["jacket","sneaker","sunglasses","hoodie"]}', 3),
('travel', 'travel-beauty', 'Travel Beauty', 'Mini Sunscreens, Lip Balm & Kits', 'Pocket-sized SPF, cleansers, and leakproof toiletry kits.', '{"categories":["skincare","personal-care","travel"],"keywords":["lip balm","sunscreen","toiletry","travel","mini"]}', 4);

-- Fitness Collections
INSERT INTO editorial_collections (category_slug, slug, title, subtitle, description, filter_params_json, display_order) VALUES
('fitness', 'home-workout', 'Home Workout', 'Resistance Bands, Dumbbells & Ropes', 'Compact strength & cardio tools for home workouts.', '{"categories":["fitness"],"keywords":["dumbbell","band","jump rope","workout","gym"]}', 1),
('fitness', 'yoga-edit', 'Yoga Edit', 'Mats, Blocks & Mindfulness Gear', 'Grippy non-slip mats and recovery straps.', '{"categories":["fitness"],"keywords":["yoga","mat","block","stretch"]}', 2),
('fitness', 'activewear-edit', 'Activewear', 'Breathable Tees, Tracks & Sports Shoes', 'Moisture-wicking training apparel and running footwear.', '{"categories":["fashion","fitness"],"keywords":["activewear","sportswear","track","jogger","sports shoes","running"]}', 3);

-- Study & Workspace Collections
INSERT INTO editorial_collections (category_slug, slug, title, subtitle, description, filter_params_json, display_order) VALUES
('study-workspace', 'desk-setup', 'Desk Setup', 'Lamps, Mats, Stands & Organization', 'Tactile desk mats, aluminum laptop stands, and focused task lamps.', '{"categories":["study-workspace","electronics"],"keywords":["desk","lamp","stand","mat"]}', 1),
('study-workspace', 'study-stationery', 'Study Stationery', 'Notebooks, Planners & Pens', 'Dot-grid notebooks, study timers, and desk trays.', '{"categories":["study-workspace"],"keywords":["notebook","journal","pen","stationery","planner"]}', 2),
('study-workspace', 'productivity-tech', 'Productivity & WFH', 'Wireless Mice, Audio & USB-C Hubs', 'Essential peripherals for smooth remote work and coding.', '{"categories":["electronics","study-workspace"],"keywords":["mouse","keyboard","headphone","hub","power strip"]}', 3);

-- 26 Heritage & Luxury Fashion Brands (source platforms — initially DATASET_PENDING until real Data Boutique or ZIP files imported)
INSERT INTO retailer_sources (code, name, official_website, category_focus, supported_categories, import_method, product_url_pattern, image_sourcing_method, connection_status, source_type, is_native_checkout) VALUES
('GUCCI', 'Gucci', 'https://www.gucci.com', 'Luxury Fashion & Leather Goods', 'Fashion, Bags, Shoes, Jewellery, Accessories', 'Data Boutique / Authorized Country Feed', 'https://www.gucci.com', 'Authorized Brand Archive Media', 'DATASET_PENDING', 'MANUFACTURER', FALSE),
('ARMANI', 'Giorgio Armani', 'https://www.armani.com/', 'Luxury Tailoring & Accessories', 'Fashion, Bags, Watches, Eyewear', 'Data Boutique / Authorized Country Feed', 'https://www.armani.com/', 'Authorized Brand Archive Media', 'DATASET_PENDING', 'MANUFACTURER', FALSE),
('LORO_PIANA', 'Loro Piana', 'https://loropiana.com/', 'Cashmere & Quiet Luxury', 'Apparel, Leather Bags, Footwear', 'Data Boutique / Authorized Country Feed', 'https://loropiana.com/', 'Authorized Brand Archive Media', 'DATASET_PENDING', 'MANUFACTURER', FALSE),
('BURBERRY', 'Burberry', 'https://it.burberry.com/', 'Heritage Outerwear & Accessories', 'Outerwear, Bags, Scarves, Footwear', 'Data Boutique / Authorized Country Feed', 'https://it.burberry.com/', 'Authorized Brand Archive Media', 'DATASET_PENDING', 'MANUFACTURER', FALSE),
('BALENCIAGA', 'Balenciaga', 'https://www.balenciaga.com/', 'Avant-Garde Luxury Fashion', 'Apparel, Bags, Sneakers, Accessories', 'Data Boutique / Authorized Country Feed', 'https://www.balenciaga.com/', 'Authorized Brand Archive Media', 'DATASET_PENDING', 'MANUFACTURER', FALSE),
('ALEXANDER_MCQUEEN', 'Alexander McQueen', 'https://alexandermcqueen.com/', 'British Luxury Couture & Footwear', 'Apparel, Bags, Sneakers, Jewellery', 'Data Boutique / Authorized Country Feed', 'https://alexandermcqueen.com/', 'Authorized Brand Archive Media', 'DATASET_PENDING', 'MANUFACTURER', FALSE),
('DOLCE_GABBANA', 'Dolce & Gabbana', 'https://www.dolcegabbana.com/', 'Italian Luxury Fashion', 'Dresses, Menswear, Bags, Fragrance', 'Data Boutique / Authorized Country Feed', 'https://www.dolcegabbana.com/', 'Authorized Brand Archive Media', 'DATASET_PENDING', 'MANUFACTURER', FALSE),
('CHANEL', 'Chanel', 'https://chanel.com/', 'Haute Couture, Bags & Beauty', 'Handbags, Ready-to-Wear, Jewellery, Fragrance', 'Data Boutique / Authorized Country Feed', 'https://chanel.com/', 'Authorized Brand Archive Media', 'DATASET_PENDING', 'MANUFACTURER', FALSE),
('LOUIS_VUITTON', 'Louis Vuitton', 'https://www.louisvuitton.com/', 'Luxury Trunkmaking & Leather Goods', 'Bags, Luggage, Apparel, Watches', 'Data Boutique / Authorized Country Feed', 'https://www.louisvuitton.com/', 'Authorized Brand Archive Media', 'DATASET_PENDING', 'MANUFACTURER', FALSE),
('HERMES', 'Hermes', 'https://hermes.com/', 'Saddlery Heritage & Silk', 'Bags, Silk Scarves, Watches, Footwear', 'Data Boutique / Authorized Country Feed', 'https://hermes.com/', 'Authorized Brand Archive Media', 'DATASET_PENDING', 'MANUFACTURER', FALSE),
('BOTTEGA_VENETA', 'Bottega Veneta', 'https://bottegaveneta.com/', 'Intrecciato Leather & Ready-to-Wear', 'Bags, Shoes, Ready-to-Wear, Accessories', 'Data Boutique / Authorized Country Feed', 'https://bottegaveneta.com/', 'Authorized Brand Archive Media', 'DATASET_PENDING', 'MANUFACTURER', FALSE),
('DIOR', 'Dior', 'https://dior.com/', 'French Couture, Bags & Beauty', 'Bags, Ready-to-Wear, Footwear, Beauty', 'Data Boutique / Authorized Country Feed', 'https://dior.com/', 'Authorized Brand Archive Media', 'DATASET_PENDING', 'MANUFACTURER', FALSE),
('TIFFANY_CO', 'Tiffany & Co', 'https://www.tiffany.com/', 'Fine Jewellery & Timepieces', 'Fine Jewellery, Watches, Gifts', 'Data Boutique / Authorized Country Feed', 'https://www.tiffany.com/', 'Authorized Brand Archive Media', 'DATASET_PENDING', 'MANUFACTURER', FALSE),
('FENDI', 'Fendi', 'https://fendi.com/', 'Roman Fur, Leather & Ready-to-Wear', 'Bags, Apparel, Shoes, Accessories', 'Data Boutique / Authorized Country Feed', 'https://fendi.com/', 'Authorized Brand Archive Media', 'DATASET_PENDING', 'MANUFACTURER', FALSE),
('CELINE', 'Celine', 'https://www.celine.com/', 'Parisian Ready-to-Wear & Leather', 'Bags, Apparel, Footwear, Eyewear', 'Data Boutique / Authorized Country Feed', 'https://www.celine.com/', 'Authorized Brand Archive Media', 'DATASET_PENDING', 'MANUFACTURER', FALSE),
('CHLOE', 'Chloe', 'https://www.chloe.com/', 'Bohemian French Luxury', 'Dresses, Bags, Footwear, Fragrances', 'Data Boutique / Authorized Country Feed', 'https://www.chloe.com/', 'Authorized Brand Archive Media', 'DATASET_PENDING', 'MANUFACTURER', FALSE),
('VERSACE', 'Versace', 'https://www.versace.com/', 'Italian Maximalist Luxury', 'Apparel, Bags, Jewellery, Footwear', 'Data Boutique / Authorized Country Feed', 'https://www.versace.com/', 'Authorized Brand Archive Media', 'DATASET_PENDING', 'MANUFACTURER', FALSE),
('BRIONI', 'Brioni', 'https://brioni.com/', 'Bespoke Roman Menswear', 'Suits, Blazers, Shirts, Menswear Accessories', 'Data Boutique / Authorized Country Feed', 'https://brioni.com/', 'Authorized Brand Archive Media', 'DATASET_PENDING', 'MANUFACTURER', FALSE),
('BRUNELLO_CUCINELLI', 'Brunello Cucinelli', 'https://shop.brunellocucinelli.com/it-it', 'Solomeo Cashmere & Tailoring', 'Knitwear, Blazers, Trousers, Accessories', 'Data Boutique / Authorized Country Feed', 'https://shop.brunellocucinelli.com/it-it', 'Authorized Brand Archive Media', 'DATASET_PENDING', 'MANUFACTURER', FALSE),
('FERRAGAMO', 'Ferragamo', 'https://www.ferragamo.com/', 'Florentine Footwear & Leather', 'Shoes, Bags, Belts, Silk', 'Data Boutique / Authorized Country Feed', 'https://www.ferragamo.com/', 'Authorized Brand Archive Media', 'DATASET_PENDING', 'MANUFACTURER', FALSE),
('LOEWE', 'Loewe', 'https://www.loewe.com/', 'Spanish Craft Leather & Apparel', 'Leather Bags, Apparel, Footwear, Scents', 'Data Boutique / Authorized Country Feed', 'https://www.loewe.com/', 'Authorized Brand Archive Media', 'DATASET_PENDING', 'MANUFACTURER', FALSE),
('CANADA_GOOSE', 'Canada Goose', 'https://www.canadagoose.com/', 'Technical Cold-Weather Parkas', 'Parkas, Outerwear, Knitwear, Footwear', 'Data Boutique / Authorized Country Feed', 'https://www.canadagoose.com/', 'Authorized Brand Archive Media', 'DATASET_PENDING', 'MANUFACTURER', FALSE),
('ERMENEGILDO_ZEGNA', 'Ermenegildo Zegna', 'https://www.zegna.com/', 'Italian Luxury Menswear', 'Suits, Knitwear, Triple Stitch Footwear, Bags', 'Data Boutique / Authorized Country Feed', 'https://www.zegna.com/', 'Authorized Brand Archive Media', 'DATASET_PENDING', 'MANUFACTURER', FALSE),
('VALENTINO', 'Valentino', 'https://www.valentino.com/it-it/', 'Haute Couture & Rockstud Leather', 'Dresses, Bags, Footwear, Fragrances', 'Data Boutique / Authorized Country Feed', 'https://www.valentino.com/it-it/', 'Authorized Brand Archive Media', 'DATASET_PENDING', 'MANUFACTURER', FALSE),
('TOM_FORD', 'Tom Ford', 'https://www.tomford.com/', 'Tailoring, Eyewear & Private Blend', 'Suits, Dresses, Eyewear, Fragrance', 'Data Boutique / Authorized Country Feed', 'https://www.tomford.com/', 'Authorized Brand Archive Media', 'DATASET_PENDING', 'MANUFACTURER', FALSE),
('ETRO', 'ETRO', 'https://www.etro.com/it-it/', 'Paisley Textiles & Milanese Fashion', 'Apparel, Bags, Scarves, Home Decor', 'Data Boutique / Authorized Country Feed', 'https://www.etro.com/it-it/', 'Authorized Brand Archive Media', 'DATASET_PENDING', 'MANUFACTURER', FALSE);

CREATE TABLE IF NOT EXISTS data_boutique_datasets (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    contract_id VARCHAR(120) UNIQUE,
    title VARCHAR(255) NOT NULL,
    brand_name VARCHAR(120),
    geography VARCHAR(120),
    geography_code VARCHAR(16),
    schema_name VARCHAR(120),
    source_website VARCHAR(300),
    refresh_policy VARCHAR(120),
    dataset_price VARCHAR(64),
    sample_file_url VARCHAR(500),
    last_delivered_date VARCHAR(64),
    dataset_url VARCHAR(500),
    ingest_status VARCHAR(40) NOT NULL DEFAULT 'DATASET_PENDING',
    imported_record_count INT NOT NULL DEFAULT 0,
    synced_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS unmatched_import_images (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    import_job_id BIGINT,
    country_code VARCHAR(8) NOT NULL DEFAULT 'IN',
    file_name VARCHAR(255) NOT NULL,
    extracted_sku_hint VARCHAR(150),
    image_data_url TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_REVIEW',
    assigned_product_id BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
