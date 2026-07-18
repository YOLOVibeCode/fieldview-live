/*
  Migration: Add Owner Account to DirectStream for Payment Routing
  
  Purpose:
  - Link DirectStream to OwnerAccount for paywall payment routing
  - Add directStreamId to Purchase for tracking DirectStream paywall purchases
  
  Steps:
  1. Add ownerAccountId column (nullable first)
  2. Backfill existing DirectStream records with first OwnerAccount
  3. Make ownerAccountId NOT NULL
  4. Add foreign key constraints
*/

-- Step 1: Add ownerAccountId as nullable
ALTER TABLE "DirectStream" ADD COLUMN "ownerAccountId" UUID;

-- Step 2: Backfill existing DirectStream records
-- Use the first OwnerAccount found (assumes at least one exists)
DO $$
DECLARE
  default_owner_id UUID;
BEGIN
  SELECT id INTO default_owner_id FROM "OwnerAccount" LIMIT 1;
  
  IF default_owner_id IS NOT NULL THEN
    UPDATE "DirectStream" SET "ownerAccountId" = default_owner_id WHERE "ownerAccountId" IS NULL;
  END IF;
END $$;

-- Step 3: Make ownerAccountId NOT NULL
ALTER TABLE "DirectStream" ALTER COLUMN "ownerAccountId" SET NOT NULL;

-- Step 4: Add directStreamId to Purchase (nullable, for new purchases)
ALTER TABLE "Purchase" ADD COLUMN "directStreamId" UUID;

-- Step 5: Create indexes for performance
CREATE INDEX "DirectStream_ownerAccountId_idx" ON "DirectStream"("ownerAccountId");
CREATE INDEX "Purchase_directStreamId_idx" ON "Purchase"("directStreamId");

-- Step 6: Add foreign key constraints
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_directStreamId_fkey" 
  FOREIGN KEY ("directStreamId") REFERENCES "DirectStream"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DirectStream" ADD CONSTRAINT "DirectStream_ownerAccountId_fkey" 
  FOREIGN KEY ("ownerAccountId") REFERENCES "OwnerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Note: GameScoreboard id default was automatically dropped (Prisma detected change)
ALTER TABLE "GameScoreboard" ALTER COLUMN "id" DROP DEFAULT;
