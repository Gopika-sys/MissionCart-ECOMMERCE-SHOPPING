-- V5: Image type/hash verification, Open Food Facts dairy source, and multi-provider UPI QR payment fields

INSERT INTO retailer_sources (code, name, official_website, category_focus, supported_categories, import_method, product_url_pattern, image_sourcing_method, connection_status, is_native_checkout)
VALUES
('OPEN_FOOD_FACTS', 'Open Food Facts India', 'https://in.openfoodfacts.org', 'Verified Dairy, Milk & Indian Groceries', 'Milk, Curd, Paneer, Butter, Ghee, Cheese, Yogurt, Breakfast & Groceries', 'Open Food Facts API v2 (ODbL 1.0)', 'https://in.openfoodfacts.org/product/{sourceProductId}', 'Verified Product Packaging Front Photos', 'ACTIVE_OPEN_DATASET', FALSE)
ON DUPLICATE KEY UPDATE connection_status = 'ACTIVE_OPEN_DATASET';

ALTER TABLE products ADD COLUMN image_type VARCHAR(40) NOT NULL DEFAULT 'AUTHORIZED_RETAILER_IMAGE';
ALTER TABLE products ADD COLUMN image_resolution VARCHAR(40);
ALTER TABLE products ADD COLUMN image_verified_at TIMESTAMP NULL;
ALTER TABLE products ADD COLUMN perceptual_hash VARCHAR(64);

ALTER TABLE product_images ADD COLUMN image_type VARCHAR(40) NOT NULL DEFAULT 'AUTHORIZED_RETAILER_IMAGE';
ALTER TABLE product_images ADD COLUMN source_url VARCHAR(600);
ALTER TABLE product_images ADD COLUMN perceptual_hash VARCHAR(64);

UPDATE products
SET image_type = 'OFFICIAL_PACKSHOT',
    image_verified_at = CURRENT_TIMESTAMP
WHERE image_status = 'VERIFIED';

ALTER TABLE payments ADD COLUMN qr_code_url TEXT;
ALTER TABLE payments ADD COLUMN upi_intent_uri VARCHAR(700);
ALTER TABLE payments ADD COLUMN qr_expires_at TIMESTAMP NULL;
