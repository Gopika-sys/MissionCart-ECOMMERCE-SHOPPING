-- V7: Real Commerce Upgrade — Source Types, All-Gender Fashion Attributes, Product Variants, Cart/Order Variants, Customer Review Photos

ALTER TABLE retailer_sources ADD COLUMN source_type VARCHAR(40) NOT NULL DEFAULT 'RETAILER';

UPDATE retailer_sources SET source_type = 'MISSIONCART_NATIVE_SELLER' WHERE code = 'MISSIONCART_DIRECT';
UPDATE retailer_sources SET source_type = 'PRODUCT_INFORMATION_DATABASE' WHERE code IN ('OPEN_BEAUTY_FACTS', 'OPEN_FOOD_FACTS', 'OPEN_PRODUCTS_FACTS');
UPDATE retailer_sources SET source_type = 'MARKETPLACE' WHERE code IN ('AMAZON_IN', 'FLIPKART', 'MEESHO', 'MYNTRA', 'AJIO', 'TATA_CLIQ', 'NYKAA', 'PURPLLE');
UPDATE retailer_sources SET source_type = 'RETAILER' WHERE code IN ('JIOMART', 'SAVANA', 'DAILYOBJECTS', 'NESTASIA', 'CROMA');

INSERT INTO retailer_sources (code, name, official_website, category_focus, supported_categories, import_method, product_url_pattern, image_sourcing_method, connection_status, is_native_checkout, source_type)
VALUES
('HIMALAYA_OFFICIAL', 'Himalaya Wellness Store', 'https://himalayawellness.in', 'Official Ayurvedic Skincare & Personal Care', 'Lip Care, Face Wash, Skincare, Personal Care', 'Official Brand Catalogue JSON', 'https://himalayawellness.in/products/{sourceProductId}', 'Official Manufacturer Product Packshots', 'ACTIVE', FALSE, 'MANUFACTURER'),
('MINIMALIST_OFFICIAL', 'Minimalist Official', 'https://beminimalist.co', 'Clinical Actives Skincare & Haircare', 'Serums, Cleansers, Sunscreens, Moisturizers', 'Official Brand Catalogue JSON', 'https://beminimalist.co/products/{sourceProductId}', 'Official Manufacturer Product Packshots', 'ACTIVE', FALSE, 'MANUFACTURER'),
('PLUM_OFFICIAL', 'Plum Goodness', 'https://plumgoodness.com', 'Vegan Skincare, Bodycare & Makeup', 'Face Wash, Serums, Beauty, Makeup', 'Official Brand Catalogue JSON', 'https://plumgoodness.com/products/{sourceProductId}', 'Official Manufacturer Product Packshots', 'ACTIVE', FALSE, 'MANUFACTURER'),
('LIBAS_OFFICIAL', 'Libas India', 'https://www.libas.in', 'Women Ethnic & Wedding Fashion', 'Kurtis, Kurta Sets, Salwar Suits, Sarees, Lehengas, Ethnic Dresses', 'Official Brand Catalogue JSON', 'https://www.libas.in/products/{sourceProductId}', 'Official Brand Studio Lookbook', 'ACTIVE', FALSE, 'MANUFACTURER'),
('VEROMODA_OFFICIAL', 'Vero Moda India', 'https://www.veromoda.in', 'Women Western & Party Fashion', 'Maxi Dresses, Midi Dresses, Bodycon, Tops, Blazers, Trousers', 'Official Brand Catalogue JSON', 'https://www.veromoda.in/products/{sourceProductId}', 'Official Brand Studio Garment Photos', 'ACTIVE', FALSE, 'MANUFACTURER'),
('ONLY_OFFICIAL', 'ONLY India', 'https://www.only.in', 'Women Denim & Casual Fashion', 'Dresses, Tops, Jeans, Co-ords, Shirts, Jackets', 'Official Brand Catalogue JSON', 'https://www.only.in/products/{sourceProductId}', 'Official Brand Studio Garment Photos', 'ACTIVE', FALSE, 'MANUFACTURER'),
('SNITCH_OFFICIAL', 'Snitch', 'https://www.snitch.co.in', 'Men & Unisex Contemporary Fashion', 'Casual Shirts, Oversized T-Shirts, Chinos, Jeans, Cargos, Jackets', 'Official Brand Catalogue JSON', 'https://www.snitch.co.in/products/{sourceProductId}', 'Official Brand Studio Garment Photos', 'ACTIVE', FALSE, 'MANUFACTURER'),
('JACKJONES_OFFICIAL', 'Jack & Jones India', 'https://www.jackjones.in', 'Men & Unisex Denim & Streetwear', 'T-Shirts, Polo Tees, Jeans, Chinos, Hoodies, Sweatshirts, Sneakers', 'Official Brand Catalogue JSON', 'https://www.jackjones.in/products/{sourceProductId}', 'Official Brand Studio Garment Photos', 'ACTIVE', FALSE, 'MANUFACTURER'),
('USPOLO_OFFICIAL', 'U.S. Polo Assn. India', 'https://uspoloassn.in', 'All-Gender Classic Casual & Footwear', 'Polo T-Shirts, Shirts, Trousers, Jeans, Sneakers, Jackets', 'Official Brand Catalogue JSON', 'https://uspoloassn.in/products/{sourceProductId}', 'Official Brand Studio Garment Photos', 'ACTIVE', FALSE, 'MANUFACTURER'),
('RARERABBIT_OFFICIAL', 'Rare Rabbit & Rareism', 'https://thehouseofrare.com', 'Men & Women Tailored Contemporary Apparel', 'Shirts, Tops, Dresses, Trousers, Blazers, Footwear', 'Official Brand Catalogue JSON', 'https://thehouseofrare.com/products/{sourceProductId}', 'Official Brand Studio Garment Photos', 'ACTIVE', FALSE, 'MANUFACTURER'),
('NEEMANS_OFFICIAL', 'Neeman''s Shoes', 'https://neemans.com', 'Unisex Sustainable Footwear', 'Sneakers, Loafers, Slides, Casual & Formal Shoes', 'Official Brand Catalogue JSON', 'https://neemans.com/products/{sourceProductId}', 'Official Brand Product Packshots', 'ACTIVE', FALSE, 'MANUFACTURER'),
('BOAT_OFFICIAL', 'boAt Lifestyle', 'https://www.boat-lifestyle.com', 'Indian Consumer Audio & Wearables', 'Headphones, Earbuds, Speakers, Chargers', 'Official Brand Catalogue JSON', 'https://www.boat-lifestyle.com/products/{sourceProductId}', 'Official Manufacturer Product Packshots', 'ACTIVE', FALSE, 'MANUFACTURER'),
('PORTRONICS_OFFICIAL', 'Portronics India', 'https://www.portronics.com', 'Workspace & Mobile Accessories', 'USB Hubs, Chargers, Power Banks, Stands', 'Official Brand Catalogue JSON', 'https://www.portronics.com/products/{sourceProductId}', 'Official Manufacturer Product Packshots', 'ACTIVE', FALSE, 'MANUFACTURER')
ON DUPLICATE KEY UPDATE source_type = VALUES(source_type), connection_status = 'ACTIVE';

ALTER TABLE products ADD COLUMN gender VARCHAR(30);
ALTER TABLE products ADD COLUMN garment_type VARCHAR(80);
ALTER TABLE products ADD COLUMN occasion VARCHAR(80);
ALTER TABLE products ADD COLUMN material VARCHAR(120);
ALTER TABLE products ADD COLUMN fit VARCHAR(60);
ALTER TABLE products ADD COLUMN sleeve_length VARCHAR(60);
ALTER TABLE products ADD COLUMN pattern VARCHAR(60);
ALTER TABLE products ADD COLUMN care_instructions VARCHAR(255);
ALTER TABLE products ADD COLUMN size_chart_json TEXT;

CREATE INDEX idx_products_gender_type ON products(gender, garment_type);

CREATE TABLE product_variants (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT NOT NULL,
    variant_sku VARCHAR(140) NOT NULL UNIQUE,
    size VARCHAR(40),
    color VARCHAR(60),
    color_hex VARCHAR(20),
    variant_name VARCHAR(180),
    price DECIMAL(12,2),
    original_price DECIMAL(12,2),
    stock_quantity INT NOT NULL DEFAULT 0,
    availability_status VARCHAR(40) NOT NULL DEFAULT 'IN_STOCK',
    image_url VARCHAR(700),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_variants_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX idx_product_variants_pid ON product_variants(product_id);

ALTER TABLE cart_items ADD COLUMN variant_id BIGINT;
ALTER TABLE cart_items ADD COLUMN selected_size VARCHAR(40);
ALTER TABLE cart_items ADD COLUMN selected_color VARCHAR(60);

ALTER TABLE order_items ADD COLUMN variant_id BIGINT;
ALTER TABLE order_items ADD COLUMN selected_size VARCHAR(40);
ALTER TABLE order_items ADD COLUMN selected_color VARCHAR(60);

ALTER TABLE reviews ADD COLUMN order_id BIGINT;
ALTER TABLE reviews ADD COLUMN order_item_id BIGINT;
ALTER TABLE reviews ADD COLUMN consent_granted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE reviews ADD COLUMN moderation_status VARCHAR(30) NOT NULL DEFAULT 'APPROVED';

CREATE TABLE review_photos (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    review_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    order_id BIGINT,
    user_id BIGINT NOT NULL,
    image_data_url TEXT NOT NULL,
    caption VARCHAR(255),
    image_type VARCHAR(40) NOT NULL DEFAULT 'CUSTOMER_REVIEW_IMAGE',
    moderation_status VARCHAR(30) NOT NULL DEFAULT 'APPROVED',
    is_verified_purchase BOOLEAN NOT NULL DEFAULT FALSE,
    consent_granted BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_review_photos_review FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
    CONSTRAINT fk_review_photos_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_review_photos_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_review_photos_product ON review_photos(product_id, moderation_status);

UPDATE products SET gender = 'MEN', garment_type = 'Formal Shirt', occasion = 'Formal & Office', material = '100% Cotton', fit = 'Tailored Fit', pattern = 'Solid', sleeve_length = 'Full Sleeve', care_instructions = 'Machine wash cold; warm iron',
  size_chart_json = '{"unit":"inches","rows":[{"size":"S","chest":"38","shoulder":"17"},{"size":"M","chest":"40","shoulder":"18"},{"size":"L","chest":"42","shoulder":"19"},{"size":"XL","chest":"44","shoulder":"20"}]}'
WHERE sku = 'MC-FASH-001';

UPDATE products SET gender = 'UNISEX', garment_type = 'Sneakers', occasion = 'Casual & Travel', material = 'Breathable Leather', fit = 'Regular Fit', pattern = 'Solid',
  size_chart_json = '{"unit":"UK","rows":[{"size":"UK6","cm":"24.6"},{"size":"UK7","cm":"25.4"},{"size":"UK8","cm":"26.2"},{"size":"UK9","cm":"27.1"},{"size":"UK10","cm":"27.9"}]}'
WHERE sku = 'MC-FASH-002';

UPDATE products SET gender = 'UNISEX', garment_type = 'Bag', occasion = 'College & Office', material = 'Organic Canvas', fit = '16L Capacity', pattern = 'Solid' WHERE sku = 'MC-FASH-003';
UPDATE products SET gender = 'UNISEX', garment_type = 'Watch', occasion = 'Formal & Office', material = 'Genuine Leather & Stainless Steel' WHERE sku = 'MC-FASH-004';
UPDATE products SET gender = 'UNISEX', garment_type = 'Accessories', occasion = 'Travel & Casual', material = 'Acetate Frame' WHERE sku = 'MC-FASH-005';
UPDATE products SET gender = 'UNISEX', garment_type = 'Backpack', occasion = 'Office & Travel', material = 'Water-Repellent Weave' WHERE sku = 'MC-FASH-006';
UPDATE products SET gender = 'MEN', garment_type = 'Blazer', occasion = 'Formal & Wedding', material = 'Linen Blend', fit = 'Structured Fit', sleeve_length = 'Full Sleeve', pattern = 'Solid' WHERE sku = 'MC-FASH-007';
UPDATE products SET gender = 'MEN', garment_type = 'Formal Shoes', occasion = 'Formal & Wedding', material = 'Leather Upper' WHERE sku = 'MC-FASH-008';
UPDATE products SET gender = 'WOMEN', garment_type = 'Kurta', occasion = 'Wedding & Ethnic', material = 'Cotton Silk', fit = 'Regular Fit' WHERE sku = 'MC-FASH-009';
UPDATE products SET gender = 'UNISEX', garment_type = 'Jacket', occasion = 'Travel & Winter', material = 'Thermal Fleece Puffer', fit = 'Regular Fit', sleeve_length = 'Full Sleeve' WHERE sku = 'MC-FASH-010';
UPDATE products SET gender = 'WOMEN', garment_type = 'Co-ord Set', occasion = 'Casual & Travel', material = 'Cotton Knit', fit = 'Relaxed Fit' WHERE sku = 'MC-FASH-011';

INSERT INTO product_variants (product_id, variant_sku, size, color, color_hex, variant_name, price, original_price, stock_quantity, availability_status, is_default)
SELECT id, 'MC-FASH-003-IVORY', 'Standard (16L)', 'Natural Ivory', '#F3EDE3', 'Natural Ivory Canvas', 549.00, 799.00, 12, 'IN_STOCK', TRUE FROM products WHERE sku = 'MC-FASH-003';
INSERT INTO product_variants (product_id, variant_sku, size, color, color_hex, variant_name, price, original_price, stock_quantity, availability_status, is_default)
SELECT id, 'MC-FASH-003-CHARCOAL', 'Standard (16L)', 'Charcoal Black', '#2B2220', 'Charcoal Canvas', 549.00, 799.00, 8, 'IN_STOCK', FALSE FROM products WHERE sku = 'MC-FASH-003';
INSERT INTO product_variants (product_id, variant_sku, size, color, color_hex, variant_name, price, original_price, stock_quantity, availability_status, is_default)
SELECT id, 'MC-FASH-003-BURGUNDY', 'Standard (16L)', 'Deep Burgundy', '#7F2548', 'Deep Burgundy Canvas', 549.00, 799.00, 4, 'IN_STOCK', FALSE FROM products WHERE sku = 'MC-FASH-003';

INSERT INTO product_variants (product_id, variant_sku, size, color, color_hex, variant_name, price, original_price, stock_quantity, availability_status, is_default)
SELECT id, 'MC-FASH-002-UK7', 'UK 7', 'Cloud White', '#F9F8F6', 'UK 7 - Cloud White', 2199.00, 2999.00, 5, 'IN_STOCK', FALSE FROM products WHERE sku = 'MC-FASH-002';
INSERT INTO product_variants (product_id, variant_sku, size, color, color_hex, variant_name, price, original_price, stock_quantity, availability_status, is_default)
SELECT id, 'MC-FASH-002-UK8', 'UK 8', 'Cloud White', '#F9F8F6', 'UK 8 - Cloud White', 2199.00, 2999.00, 6, 'IN_STOCK', TRUE FROM products WHERE sku = 'MC-FASH-002';
INSERT INTO product_variants (product_id, variant_sku, size, color, color_hex, variant_name, price, original_price, stock_quantity, availability_status, is_default)
SELECT id, 'MC-FASH-002-UK9', 'UK 9', 'Cloud White', '#F9F8F6', 'UK 9 - Cloud White', 2199.00, 2999.00, 0, 'OUT_OF_STOCK', FALSE FROM products WHERE sku = 'MC-FASH-002';
