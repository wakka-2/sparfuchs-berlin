-- Add per-store image URL to product_matches
-- Products show a store-specific image (their own-brand version) alongside each store's price.

ALTER TABLE product_matches
  ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);
