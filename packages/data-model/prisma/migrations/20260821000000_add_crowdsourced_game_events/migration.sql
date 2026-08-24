-- Sport-aware scoreboard + crowdsourced game events

ALTER TABLE "DirectStream" ADD COLUMN "sport" TEXT NOT NULL DEFAULT 'generic';
ALTER TABLE "DirectStream" ADD COLUMN "allowViewerReporting" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DirectStream" ADD COLUMN "eventConfirmThreshold" INTEGER NOT NULL DEFAULT 2;

ALTER TABLE "GameScoreboard" ADD COLUMN "period" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "GameScoreboard" ADD COLUMN "periodDetail" TEXT;

ALTER TABLE "GameChatMessage" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'text';
ALTER TABLE "GameChatMessage" ADD COLUMN "metadata" JSONB;

ALTER TABLE "Subscription" ADD COLUMN "directStreamId" UUID;
CREATE INDEX "Subscription_directStreamId_idx" ON "Subscription"("directStreamId");
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_directStreamId_fkey" FOREIGN KEY ("directStreamId") REFERENCES "DirectStream"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "GameEvent" (
    "id" UUID NOT NULL,
    "directStreamId" UUID NOT NULL,
    "sport" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "team" TEXT,
    "pointsDelta" INTEGER NOT NULL DEFAULT 0,
    "period" INTEGER,
    "periodDetail" TEXT,
    "clockSeconds" INTEGER,
    "reportedByViewerId" UUID NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "resolvedBy" TEXT,
    "chatMessageId" UUID,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GameEventConfirmation" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "viewerId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameEventConfirmation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GameEvent_chatMessageId_key" ON "GameEvent"("chatMessageId");
CREATE INDEX "GameEvent_directStreamId_createdAt_idx" ON "GameEvent"("directStreamId", "createdAt");
CREATE INDEX "GameEvent_directStreamId_status_idx" ON "GameEvent"("directStreamId", "status");
CREATE INDEX "GameEvent_reportedByViewerId_idx" ON "GameEvent"("reportedByViewerId");

CREATE UNIQUE INDEX "GameEventConfirmation_eventId_viewerId_key" ON "GameEventConfirmation"("eventId", "viewerId");
CREATE INDEX "GameEventConfirmation_eventId_idx" ON "GameEventConfirmation"("eventId");
CREATE INDEX "GameEventConfirmation_viewerId_idx" ON "GameEventConfirmation"("viewerId");

ALTER TABLE "GameEvent" ADD CONSTRAINT "GameEvent_directStreamId_fkey" FOREIGN KEY ("directStreamId") REFERENCES "DirectStream"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameEvent" ADD CONSTRAINT "GameEvent_reportedByViewerId_fkey" FOREIGN KEY ("reportedByViewerId") REFERENCES "ViewerIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameEvent" ADD CONSTRAINT "GameEvent_chatMessageId_fkey" FOREIGN KEY ("chatMessageId") REFERENCES "GameChatMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GameEventConfirmation" ADD CONSTRAINT "GameEventConfirmation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "GameEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameEventConfirmation" ADD CONSTRAINT "GameEventConfirmation_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "ViewerIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
