-- Brand and category master tables for catalog management

CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(120) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(120) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brands_name ON brands(name);
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

-- Seed from existing item strings so lists are populated on upgrade
INSERT INTO brands (name)
SELECT DISTINCT TRIM(brand)
FROM items
WHERE brand IS NOT NULL AND TRIM(brand) <> ''
ON CONFLICT (name) DO NOTHING;

INSERT INTO categories (name)
SELECT DISTINCT TRIM(category)
FROM items
WHERE category IS NOT NULL AND TRIM(category) <> ''
ON CONFLICT (name) DO NOTHING;
