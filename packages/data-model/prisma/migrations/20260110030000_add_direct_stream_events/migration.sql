-- CreateTable: DirectStreamEvent
-- Sub-events under a DirectStream parent (e.g., /direct/tchs/soccer-varsity-2026-01-10)
CREATE TABLE "DirectStreamEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "directStreamId" UUID NOT NULL,
    "eventSlug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "streamUrl" TEXT,
    "scheduledStartAt" TIMESTAMP(3),
    "reminderSentAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    
    -- Feature flag overrides (NULL = inherit from parent)
    "chatEnabled" BOOLEAN,
    "scoreboardEnabled" BOOLEAN,
    "paywallEnabled" BOOLEAN,
    "priceInCents" INTEGER,
    "paywallMessage" TEXT,
    "allowAnonymousView" BOOLEAN,
    "requireEmailVerification" BOOLEAN,
    "listed" BOOLEAN,
    
    -- Scoreboard overrides (NULL = inherit from parent)
    "scoreboardHomeTeam" TEXT,
    "scoreboardAwayTeam" TEXT,
    "scoreboardHomeColor" TEXT,
    "scoreboardAwayColor" TEXT,
    
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DirectStreamEvent_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraint
ALTER TABLE "DirectStreamEvent" ADD CONSTRAINT "DirectStreamEvent_directStreamId_fkey" FOREIGN KEY ("directStreamId") REFERENCES "DirectStream"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create unique index for eventSlug per parent
CREATE UNIQUE INDEX "DirectStreamEvent_directStreamId_eventSlug_key" ON "DirectStreamEvent"("directStreamId", "eventSlug");

-- Create indexes for querying
CREATE INDEX "DirectStreamEvent_directStreamId_idx" ON "DirectStreamEvent"("directStreamId");
CREATE INDEX "DirectStreamEvent_scheduledStartAt_idx" ON "DirectStreamEvent"("scheduledStartAt");
CREATE INDEX "DirectStreamEvent_status_idx" ON "DirectStreamEvent"("status");

-- AlterTable: DirectStreamRegistration - Add event scoping
ALTER TABLE "DirectStreamRegistration" ADD COLUMN "directStreamEventId" UUID;
ALTER TABLE "DirectStreamRegistration" ADD CONSTRAINT "DirectStreamRegistration_directStreamEventId_fkey" FOREIGN KEY ("directStreamEventId") REFERENCES "DirectStreamEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "DirectStreamRegistration_directStreamEventId_idx" ON "DirectStreamRegistration"("directStreamEventId");

-- AlterTable: EmailVerificationToken - Add event scoping
ALTER TABLE "EmailVerificationToken" ADD COLUMN "directStreamEventId" UUID;
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_directStreamEventId_fkey" FOREIGN KEY ("directStreamEventId") REFERENCES "DirectStreamEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

