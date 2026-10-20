-- Keep the earliest party per GSTIN; clear GSTIN on later duplicates before unique index.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY upper(trim(gstin))
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM parties
  WHERE gstin IS NOT NULL AND trim(gstin) <> ''
)
UPDATE parties
SET gstin = NULL
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS idx_parties_gstin_unique
  ON parties ((upper(trim(gstin))))
  WHERE gstin IS NOT NULL AND trim(gstin) <> '';
