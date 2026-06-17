-- ================================================================
-- SmartCart – Full Database Migration
-- Run this in: Supabase Dashboard → SQL Editor
-- ================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- for fuzzy product matching

-- ────────────────────────────────────────────────────────────────
-- 1. FAMILIES
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS families (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────
-- 2. USERS
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id  UUID REFERENCES families(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  email      TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────
-- 3. STORE CHAINS & BRANCHES
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_chains (
  id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL   -- e.g. 'רמי לוי', 'שופרסל', 'ויקטורי'
);

CREATE TABLE IF NOT EXISTS stores (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chain_id    UUID REFERENCES store_chains(id) ON DELETE SET NULL,
  city        TEXT,
  branch_name TEXT,
  UNIQUE(chain_id, city, branch_name)
);

-- ────────────────────────────────────────────────────────────────
-- 4. PRODUCT CATALOG
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL   -- e.g. 'חלב', 'לחם', 'בשר'
);

CREATE TABLE IF NOT EXISTS products (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  brand       TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  unit        TEXT NOT NULL CHECK (unit IN ('ml', 'g', 'units')),
  size        NUMERIC,         -- e.g. 1000 for 1-litre bottle
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'needs_review')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(name, brand)
);

-- Trigram index for fuzzy product name matching
CREATE INDEX IF NOT EXISTS products_name_trgm ON products USING gin (name gin_trgm_ops);

-- ────────────────────────────────────────────────────────────────
-- 5. RECEIPTS
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS receipts (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id  UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  store_id   UUID REFERENCES stores(id) ON DELETE SET NULL,
  user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  date       DATE,
  total      NUMERIC(10, 2),
  file_url   TEXT,
  raw_text   TEXT,
  status     TEXT NOT NULL DEFAULT 'pending'
             CHECK (status IN ('pending', 'processing', 'done', 'error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────
-- 6. RECEIPT LINE ITEMS
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS receipt_items (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_id          UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  product_id          UUID REFERENCES products(id) ON DELETE SET NULL,
  qty                 NUMERIC(10, 3) NOT NULL DEFAULT 1,
  price               NUMERIC(10, 2) NOT NULL,
  unit_price_per_100  NUMERIC(10, 4),   -- price per 100g or 100ml
  raw_name            TEXT,              -- original text from receipt
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────
-- 7. INDEXES
-- ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS receipts_family_id  ON receipts(family_id);
CREATE INDEX IF NOT EXISTS receipts_date       ON receipts(date);
CREATE INDEX IF NOT EXISTS receipt_items_receipt_id ON receipt_items(receipt_id);
CREATE INDEX IF NOT EXISTS receipt_items_product_id ON receipt_items(product_id);

-- ────────────────────────────────────────────────────────────────
-- 8. ROW-LEVEL SECURITY (basic setup)
-- ────────────────────────────────────────────────────────────────
ALTER TABLE families      ENABLE ROW LEVEL SECURITY;
ALTER TABLE users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_items ENABLE ROW LEVEL SECURITY;

-- Allow service-role full access (server uses service role key)
CREATE POLICY "service_role_all" ON families      FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON users         FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON receipts      FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON receipt_items FOR ALL TO service_role USING (true);

-- ────────────────────────────────────────────────────────────────
-- 9. SEED DATA – Store chains & categories
-- ────────────────────────────────────────────────────────────────
INSERT INTO store_chains (name) VALUES
  ('רמי לוי'), ('שופרסל'), ('ויקטורי'), ('מגה'),
  ('יינות ביתן'), ('חצי חינם'), ('קרפור'), ('AM:PM')
ON CONFLICT (name) DO NOTHING;

INSERT INTO categories (name) VALUES
  ('חלב ומוצריו'), ('לחם ומאפים'), ('בשר ועוף'), ('דגים'),
  ('ירקות ופירות'), ('קפואים'), ('שימורים'), ('שתייה'),
  ('חטיפים'), ('ניקיון'), ('היגיינה אישית'), ('אחר')
ON CONFLICT (name) DO NOTHING;
