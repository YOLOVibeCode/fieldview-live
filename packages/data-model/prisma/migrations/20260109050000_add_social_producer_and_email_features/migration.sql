-- Add email notification preferences to ViewerIdentity
ALTER TABLE "ViewerIdentity" ADD COLUMN "wantsReminders" BOOLEAN NOT NULL DEFAULT true;

-- Add index for active viewer queries
CREATE INDEX "ViewerIdentity_lastSeenAt_idx" ON "ViewerIdentity"("lastSeenAt");

-- Add saved payment fields to Purchase
ALTER TABLE "Purchase" ADD COLUMN "savePaymentMethod" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Purchase" ADD COLUMN "squareCardId" TEXT;
ALTER TABLE "Purchase" ADD COLUMN "cardLastFour" TEXT;
ALTER TABLE "Purchase" ADD COLUMN "cardBrand" TEXT;

-- Add scheduling and email reminder fields to DirectStream
ALTER TABLE "DirectStream" ADD COLUMN "scheduledStartAt" TIMESTAMP(3);
ALTER TABLE "DirectStream" ADD COLUMN "reminderSentAt" TIMESTAMP(3);
ALTER TABLE "DirectStream" ADD COLUMN "sendReminders" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "DirectStream" ADD COLUMN "reminderMinutes" INTEGER NOT NULL DEFAULT 5;

-- Add index for email reminder cron jobs
CREATE INDEX "DirectStream_scheduledStartAt_idx" ON "DirectStream"("scheduledStartAt");

-- Create GameScoreboard table for Social Producer Panel
CREATE TABLE "GameScoreboard" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "directStreamId" UUID NOT NULL,
    "homeTeamName" TEXT NOT NULL DEFAULT 'Home',
    "awayTeamName" TEXT NOT NULL DEFAULT 'Away',
    "homeJerseyColor" TEXT NOT NULL DEFAULT '#1E40AF',
    "awayJerseyColor" TEXT NOT NULL DEFAULT '#DC2626',
    "homeScore" INTEGER NOT NULL DEFAULT 0,
    "awayScore" INTEGER NOT NULL DEFAULT 0,
    "clockMode" TEXT NOT NULL DEFAULT 'stopped',
    "clockSeconds" INTEGER NOT NULL DEFAULT 0,
    "clockStartedAt" TIMESTAMP(3),
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "position" TEXT NOT NULL DEFAULT 'top-left',
    "producerPassword" TEXT,
    "lastEditedBy" TEXT,
    "lastEditedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameScoreboard_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint and foreign key for GameScoreboard
CREATE UNIQUE INDEX "GameScoreboard_directStreamId_key" ON "GameScoreboard"("directStreamId");
CREATE INDEX "GameScoreboard_directStreamId_idx" ON "GameScoreboard"("directStreamId");

ALTER TABLE "GameScoreboard" ADD CONSTRAINT "GameScoreboard_directStreamId_fkey" 
    FOREIGN KEY ("directStreamId") REFERENCES "DirectStream"("id") ON DELETE CASCADE ON UPDATE CASCADE;

