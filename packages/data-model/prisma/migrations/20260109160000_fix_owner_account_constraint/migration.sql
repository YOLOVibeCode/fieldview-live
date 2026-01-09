/*
  Migration: Fix OwnerAccount Constraint for DirectStream
  
  This migration ensures we have a default OwnerAccount before enforcing NOT NULL constraint.
  It's safe to run even if the previous migration partially succeeded.
*/

-- Step 1: Create a default OwnerAccount if none exists
DO $$
DECLARE
  owner_count INTEGER;
  new_owner_id UUID;
BEGIN
  SELECT COUNT(*) INTO owner_count FROM "OwnerAccount";
  
  IF owner_count = 0 THEN
    INSERT INTO "OwnerAccount" (
      id,
      name,
      email,
      "createdAt",
      "updatedAt"
    ) VALUES (
      gen_random_uuid(),
      'FieldView Live',
      'admin@fieldview.live',
      NOW(),
      NOW()
    ) RETURNING id INTO new_owner_id;
    
    RAISE NOTICE 'Created default OwnerAccount with id: %', new_owner_id;
  END IF;
END $$;

-- Step 2: Add ownerAccountId column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'DirectStream' AND column_name = 'ownerAccountId'
  ) THEN
    ALTER TABLE "DirectStream" ADD COLUMN "ownerAccountId" UUID;
  END IF;
END $$;

-- Step 3: Backfill all DirectStream records with the first OwnerAccount
DO $$
DECLARE
  default_owner_id UUID;
BEGIN
  SELECT id INTO default_owner_id FROM "OwnerAccount" LIMIT 1;
  
  IF default_owner_id IS NOT NULL THEN
    UPDATE "DirectStream" 
    SET "ownerAccountId" = default_owner_id 
    WHERE "ownerAccountId" IS NULL;
  END IF;
END $$;

-- Step 4: Make ownerAccountId NOT NULL (only if all records have values)
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count FROM "DirectStream" WHERE "ownerAccountId" IS NULL;
  
  IF null_count = 0 THEN
    ALTER TABLE "DirectStream" ALTER COLUMN "ownerAccountId" SET NOT NULL;
  ELSE
    RAISE EXCEPTION 'Cannot set ownerAccountId to NOT NULL: % DirectStream records have NULL values', null_count;
  END IF;
END $$;

-- Step 5: Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'DirectStream_ownerAccountId_fkey'
  ) THEN
    ALTER TABLE "DirectStream" ADD CONSTRAINT "DirectStream_ownerAccountId_fkey" 
      FOREIGN KEY ("ownerAccountId") REFERENCES "OwnerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- Step 6: Add index if it doesn't exist
CREATE INDEX IF NOT EXISTS "DirectStream_ownerAccountId_idx" ON "DirectStream"("ownerAccountId");

