-- Emergency Database Fix for Production
-- Run this directly in Railway PostgreSQL database
-- This will add the missing ownerAccountId column and create a default OwnerAccount

-- Step 1: Create default OwnerAccount if none exists
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
    
    RAISE NOTICE 'Created default OwnerAccount: %', new_owner_id;
  ELSE
    RAISE NOTICE 'OwnerAccount already exists, skipping creation';
  END IF;
END $$;

-- Step 2: Add ownerAccountId column to DirectStream (if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'DirectStream' AND column_name = 'ownerAccountId'
  ) THEN
    ALTER TABLE "DirectStream" ADD COLUMN "ownerAccountId" UUID;
    RAISE NOTICE 'Added ownerAccountId column to DirectStream';
  ELSE
    RAISE NOTICE 'ownerAccountId column already exists';
  END IF;
END $$;

-- Step 3: Backfill DirectStream records
DO $$
DECLARE
  default_owner_id UUID;
  updated_count INTEGER;
BEGIN
  SELECT id INTO default_owner_id FROM "OwnerAccount" LIMIT 1;
  
  UPDATE "DirectStream" 
  SET "ownerAccountId" = default_owner_id 
  WHERE "ownerAccountId" IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % DirectStream records with ownerAccountId', updated_count;
END $$;

-- Step 4: Make ownerAccountId NOT NULL
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count FROM "DirectStream" WHERE "ownerAccountId" IS NULL;
  
  IF null_count = 0 THEN
    ALTER TABLE "DirectStream" ALTER COLUMN "ownerAccountId" SET NOT NULL;
    RAISE NOTICE 'Set ownerAccountId to NOT NULL';
  ELSE
    RAISE WARNING 'Cannot set NOT NULL: % DirectStream records still have NULL ownerAccountId', null_count;
  END IF;
END $$;

-- Step 5: Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'DirectStream_ownerAccountId_fkey'
  ) THEN
    ALTER TABLE "DirectStream" ADD CONSTRAINT "DirectStream_ownerAccountId_fkey" 
      FOREIGN KEY ("ownerAccountId") REFERENCES "OwnerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    RAISE NOTICE 'Added foreign key constraint';
  ELSE
    RAISE NOTICE 'Foreign key constraint already exists';
  END IF;
END $$;

-- Step 6: Add index
CREATE INDEX IF NOT EXISTS "DirectStream_ownerAccountId_idx" ON "DirectStream"("ownerAccountId");

-- Step 7: Add directStreamId to Purchase (if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Purchase' AND column_name = 'directStreamId'
  ) THEN
    ALTER TABLE "Purchase" ADD COLUMN "directStreamId" UUID;
    RAISE NOTICE 'Added directStreamId column to Purchase';
  END IF;
END $$;

-- Step 8: Add Purchase foreign key and index
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'Purchase_directStreamId_fkey'
  ) THEN
    ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_directStreamId_fkey" 
      FOREIGN KEY ("directStreamId") REFERENCES "DirectStream"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Purchase_directStreamId_idx" ON "Purchase"("directStreamId");

-- Verification queries
SELECT 'OwnerAccount count:' as info, COUNT(*) as count FROM "OwnerAccount"
UNION ALL
SELECT 'DirectStream count:', COUNT(*) FROM "DirectStream"
UNION ALL  
SELECT 'DirectStream with ownerAccountId:', COUNT(*) FROM "DirectStream" WHERE "ownerAccountId" IS NOT NULL
UNION ALL
SELECT 'DirectStream without ownerAccountId:', COUNT(*) FROM "DirectStream" WHERE "ownerAccountId" IS NULL;

