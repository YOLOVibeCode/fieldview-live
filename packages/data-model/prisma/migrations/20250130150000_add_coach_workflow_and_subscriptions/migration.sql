-- CreateTable: OrganizationMember
CREATE TABLE "OrganizationMember" (
    "id" UUID NOT NULL,
    "ownerUserId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Event
CREATE TABLE "Event" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "channelId" UUID NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "urlKey" TEXT NOT NULL,
    "canonicalPath" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'scheduled',
    "streamType" TEXT,
    "muxPlaybackId" TEXT,
    "hlsManifestUrl" TEXT,
    "externalEmbedUrl" TEXT,
    "externalProvider" TEXT,
    "accessMode" TEXT,
    "priceCents" INTEGER,
    "currency" TEXT DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "wentLiveAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Subscription
CREATE TABLE "Subscription" (
    "id" UUID NOT NULL,
    "viewerId" UUID NOT NULL,
    "organizationId" UUID,
    "channelId" UUID,
    "eventId" UUID,
    "preference" TEXT NOT NULL DEFAULT 'email',
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "unsubscribedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Purchase - Add recipient tracking fields and eventId
ALTER TABLE "Purchase" ADD COLUMN "recipientOwnerAccountId" UUID;
ALTER TABLE "Purchase" ADD COLUMN "recipientType" TEXT;
ALTER TABLE "Purchase" ADD COLUMN "recipientOrganizationId" UUID;
ALTER TABLE "Purchase" ADD COLUMN "eventId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMember_ownerUserId_organizationId_key" ON "OrganizationMember"("ownerUserId", "organizationId");

-- CreateIndex
CREATE INDEX "OrganizationMember_ownerUserId_idx" ON "OrganizationMember"("ownerUserId");

-- CreateIndex
CREATE INDEX "OrganizationMember_organizationId_idx" ON "OrganizationMember"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationMember_role_idx" ON "OrganizationMember"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Event_canonicalPath_key" ON "Event"("canonicalPath");

-- CreateIndex
CREATE UNIQUE INDEX "Event_channelId_urlKey_key" ON "Event"("channelId", "urlKey");

-- CreateIndex
CREATE INDEX "Event_organizationId_idx" ON "Event"("organizationId");

-- CreateIndex
CREATE INDEX "Event_channelId_idx" ON "Event"("channelId");

-- CreateIndex
CREATE INDEX "Event_canonicalPath_idx" ON "Event"("canonicalPath");

-- CreateIndex
CREATE INDEX "Event_state_idx" ON "Event"("state");

-- CreateIndex
CREATE INDEX "Event_startsAt_idx" ON "Event"("startsAt");

-- CreateIndex
CREATE INDEX "Subscription_viewerId_idx" ON "Subscription"("viewerId");

-- CreateIndex
CREATE INDEX "Subscription_organizationId_idx" ON "Subscription"("organizationId");

-- CreateIndex
CREATE INDEX "Subscription_channelId_idx" ON "Subscription"("channelId");

-- CreateIndex
CREATE INDEX "Subscription_eventId_idx" ON "Subscription"("eventId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE INDEX "Subscription_confirmed_idx" ON "Subscription"("confirmed");

-- CreateIndex
CREATE INDEX "Purchase_recipientOwnerAccountId_idx" ON "Purchase"("recipientOwnerAccountId");

-- CreateIndex
CREATE INDEX "Purchase_recipientType_idx" ON "Purchase"("recipientType");

-- CreateIndex
CREATE INDEX "Purchase_eventId_idx" ON "Purchase"("eventId");

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "OwnerUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "WatchChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "ViewerIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "WatchChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_recipientOwnerAccountId_fkey" FOREIGN KEY ("recipientOwnerAccountId") REFERENCES "OwnerAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_recipientOrganizationId_fkey" FOREIGN KEY ("recipientOrganizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
