-- Migration 0002: add is_estimated flag to prices
-- Marks whether a price row came from a live scrape (false) or the fallback table (true).
ALTER TABLE prices
  ADD COLUMN IF NOT EXISTS is_estimated boolean NOT NULL DEFAULT false;
