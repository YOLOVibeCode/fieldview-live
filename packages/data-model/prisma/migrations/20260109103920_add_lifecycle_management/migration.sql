-- Add lifecycle management fields to DirectStream
ALTER TABLE "DirectStream" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "DirectStream" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP;
ALTER TABLE "DirectStream" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP;
ALTER TABLE "DirectStream" ADD COLUMN IF NOT EXISTS "autoPurgeAt" TIMESTAMP;

-- Add check constraint for status
DO $$ BEGIN
  ALTER TABLE "DirectStream" ADD CONSTRAINT "DirectStream_status_check" 
    CHECK ("status" IN ('active', 'archived', 'deleted'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add directStreamId to GameChatMessage for preservation
ALTER TABLE "GameChatMessage" ADD COLUMN IF NOT EXISTS "directStreamId" UUID;

-- Backfill existing chat messages with directStreamId
UPDATE "GameChatMessage" gcm
SET "directStreamId" = ds."id"
FROM "DirectStream" ds
WHERE gcm."gameId" = ds."gameId" 
  AND ds."gameId" IS NOT NULL
  AND gcm."directStreamId" IS NULL;

-- Add index for directStreamId
CREATE INDEX IF NOT EXISTS "GameChatMessage_directStreamId_idx" ON "GameChatMessage"("directStreamId");

-- Update DirectStream → Game foreign key to use SetNull on delete
DO $$ BEGIN
  -- Drop existing constraint
  ALTER TABLE "DirectStream" DROP CONSTRAINT IF EXISTS "DirectStream_gameId_fkey";
  
  -- Re-add with SetNull
  ALTER TABLE "DirectStream" ADD CONSTRAINT "DirectStream_gameId_fkey" 
    FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add foreign key for GameChatMessage → DirectStream with SetNull
DO $$ BEGIN
  ALTER TABLE "GameChatMessage" ADD CONSTRAINT "GameChatMessage_directStreamId_fkey"
    FOREIGN KEY ("directStreamId") REFERENCES "DirectStream"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
