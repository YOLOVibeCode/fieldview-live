-- Coach text commands (apps/api/src/modules/coach-text), "Text commands" in the owner portal.
-- CoachTextLink: one phone linked to one owner login.
-- CoachTextCommand: audit of every text the coach bot looked at. No foreign keys on purpose.
-- Additive only: two new tables, nothing existing is altered.

-- CreateTable
CREATE TABLE "CoachTextLink" (
    "id" UUID NOT NULL,
    "ownerUserId" UUID NOT NULL,
    "phoneE164" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "lastCommandAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "pendingPhoneE164" TEXT,
    "codeHash" TEXT,
    "codeExpiresAt" TIMESTAMP(3),
    "codeAttempts" INTEGER NOT NULL DEFAULT 0,
    "timeZone" TEXT,
    "pendingId" UUID,
    "pendingQuestion" JSONB,
    "pendingExpiresAt" TIMESTAMP(3),
    "busyUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachTextLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachTextCommand" (
    "id" UUID NOT NULL,
    "messageSid" TEXT,
    "ownerUserId" UUID,
    "ownerAccountId" UUID,
    "phoneE164" TEXT NOT NULL,
    "twilioVerified" BOOLEAN NOT NULL,
    "body" TEXT NOT NULL,
    "interpreter" TEXT NOT NULL,
    "action" TEXT,
    "args" JSONB,
    "status" TEXT NOT NULL,
    "reason" TEXT,
    "targetEventId" UUID,
    "previousStreamUrl" TEXT,
    "previousPinnedAt" TIMESTAMP(3),
    "newStreamUrl" TEXT,
    "replyText" TEXT,
    "latencyMs" INTEGER,
    "model" TEXT,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachTextCommand_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoachTextLink_ownerUserId_key" ON "CoachTextLink"("ownerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "CoachTextLink_phoneE164_key" ON "CoachTextLink"("phoneE164");

-- CreateIndex
CREATE INDEX "CoachTextLink_pendingPhoneE164_idx" ON "CoachTextLink"("pendingPhoneE164");

-- CreateIndex
CREATE UNIQUE INDEX "CoachTextCommand_messageSid_key" ON "CoachTextCommand"("messageSid");

-- CreateIndex
CREATE INDEX "CoachTextCommand_ownerUserId_createdAt_idx" ON "CoachTextCommand"("ownerUserId", "createdAt");

-- CreateIndex
CREATE INDEX "CoachTextCommand_ownerAccountId_createdAt_idx" ON "CoachTextCommand"("ownerAccountId", "createdAt");

-- CreateIndex
CREATE INDEX "CoachTextCommand_phoneE164_createdAt_idx" ON "CoachTextCommand"("phoneE164", "createdAt");

-- AddForeignKey
ALTER TABLE "CoachTextLink" ADD CONSTRAINT "CoachTextLink_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "OwnerUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

