-- V5: Real branded products

INSERT INTO categories (name, slug, description, purpose_group, display_order)
  VALUES ('Dairy & Milk Products', 'dairy-milk', 'Milk, curd, paneer, butter, ghee and dairy essentials', 'Everyday essentials', 14)
  ON DUPLICATE KEY UPDATE name = name;

INSERT INTO brands (name, slug, country, website_url, is_verified) VALUES
  ('Himalaya', 'himalaya', 'India', 'https://www.himalayawellness.in', TRUE),
  ('Nivea', 'nivea', 'Germany', 'https://www.nivea.in', TRUE),
  ('Dove', 'dove', 'USA', 'https://www.dove.com/in', TRUE),
  ('Lakme', 'lakme', 'India', 'https://www.lakmeindia.com', TRUE),
  ('Maybelline', 'maybelline', 'USA', 'https://www.maybelline.co.in', TRUE),
  ('Mamaearth', 'mamaearth', 'India', 'https://mamaearth.in', TRUE),
  ('Minimalist', 'minimalist-brand', 'India', 'https://beminimalist.co', TRUE),
  ('Cetaphil', 'cetaphil', 'USA', 'https://www.cetaphil.in', TRUE),
  ('Neutrogena', 'neutrogena', 'USA', 'https://www.neutrogena.in', TRUE),
  ('Biotique', 'biotique', 'India', 'https://www.biotique.com', TRUE),
  ('Parachute', 'parachute', 'India', 'https://www.marico.com', TRUE),
  ('boAt', 'boat', 'India', 'https://www.boat-lifestyle.com', TRUE),
  ('Samsung', 'samsung', 'South Korea', 'https://www.samsung.com/in', TRUE),
  ('Apple', 'apple', 'USA', 'https://www.apple.com/in', TRUE),
  ('HP', 'hp', 'USA', 'https://www.hp.com/in-en', TRUE),
  ('Amul', 'amul', 'India', 'https://www.amul.com', TRUE),
  ('Mother Dairy', 'mother-dairy', 'India', 'https://www.motherdairy.com', TRUE),
  ('Britannia', 'britannia', 'India', 'https://www.britannia.co.in', TRUE),
  ('Portronics', 'portronics', 'India', 'https://www.portronics.com', TRUE),
  ('JBL', 'jbl-brand', 'USA', 'https://in.jbl.com', TRUE),
  ('Plum', 'plum', 'India', 'https://www.plumgoodness.com', TRUE)
ON DUPLICATE KEY UPDATE is_verified = TRUE;
