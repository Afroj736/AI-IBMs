-- Owner role: assigned to users who register a new company (business creator).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'owner'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'owner' AFTER 'admin';
  END IF;
END $$;
