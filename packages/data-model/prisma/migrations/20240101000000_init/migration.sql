-- CreateTable
CREATE TABLE "OwnerAccount" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "payoutProviderRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OwnerAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnerUser" (
    "id" UUID NOT NULL,
    "ownerAccountId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "OwnerUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" UUID NOT NULL,
    "ownerAccountId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "homeTeam" TEXT NOT NULL,
    "awayTeam" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "state" TEXT NOT NULL DEFAULT 'draft',
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "keywordCode" TEXT NOT NULL,
    "keywordStatus" TEXT NOT NULL DEFAULT 'active',
    "qrUrl" TEXT NOT NULL,
    "streamSourceId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreamSource" (
    "id" UUID NOT NULL,
    "gameId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "protectionLevel" TEXT NOT NULL,
    "muxAssetId" TEXT,
    "muxPlaybackId" TEXT,
    "hlsManifestUrl" TEXT,
    "rtmpPublishUrl" TEXT,
    "rtmpStreamKey" TEXT,
    "externalEmbedUrl" TEXT,
    "externalProvider" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StreamSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ViewerIdentity" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "phoneE164" TEXT,
    "smsOptOut" BOOLEAN NOT NULL DEFAULT false,
    "optOutAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3),

    CONSTRAINT "ViewerIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" UUID NOT NULL,
    "gameId" UUID NOT NULL,
    "viewerId" UUID NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "platformFeeCents" INTEGER NOT NULL,
    "processorFeeCents" INTEGER NOT NULL,
    "ownerNetCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "paymentProviderPaymentId" TEXT,
    "paymentProviderCustomerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entitlement" (
    "id" UUID NOT NULL,
    "purchaseId" UUID NOT NULL,
    "tokenId" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "Entitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaybackSession" (
    "id" UUID NOT NULL,
    "entitlementId" UUID NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "deviceHash" TEXT,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "state" TEXT NOT NULL DEFAULT 'started',
    "totalWatchMs" INTEGER NOT NULL DEFAULT 0,
    "totalBufferMs" INTEGER NOT NULL DEFAULT 0,
    "bufferEvents" INTEGER NOT NULL DEFAULT 0,
    "fatalErrors" INTEGER NOT NULL DEFAULT 0,
    "startupLatencyMs" INTEGER,

    CONSTRAINT "PlaybackSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" UUID NOT NULL,
    "purchaseId" UUID NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "reasonCode" TEXT NOT NULL,
    "issuedBy" TEXT NOT NULL,
    "ruleVersion" TEXT NOT NULL,
    "telemetrySummary" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" UUID NOT NULL,
    "ownerAccountId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "referenceType" TEXT NOT NULL,
    "referenceId" TEXT,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" UUID NOT NULL,
    "ownerAccountId" UUID NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL,
    "payoutProviderRef" TEXT,
    "ledgerEntryIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SMSMessage" (
    "id" UUID NOT NULL,
    "direction" TEXT NOT NULL,
    "phoneE164" TEXT NOT NULL,
    "keywordCode" TEXT,
    "gameId" UUID,
    "messageBody" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "SMSMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAccount" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "AdminAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" UUID NOT NULL,
    "adminUserId" UUID NOT NULL,
    "actionType" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "reason" TEXT,
    "requestMetadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAttempt" (
    "id" UUID NOT NULL,
    "purchaseId" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "failureReason" TEXT,
    "providerResponse" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OwnerAccount_status_idx" ON "OwnerAccount"("status");

-- CreateIndex
CREATE INDEX "OwnerUser_ownerAccountId_idx" ON "OwnerUser"("ownerAccountId");

-- CreateIndex
CREATE INDEX "OwnerUser_email_idx" ON "OwnerUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "OwnerUser_email_key" ON "OwnerUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Game_keywordCode_key" ON "Game"("keywordCode");

-- CreateIndex
CREATE INDEX "Game_ownerAccountId_idx" ON "Game"("ownerAccountId");

-- CreateIndex
CREATE INDEX "Game_keywordCode_idx" ON "Game"("keywordCode");

-- CreateIndex
CREATE INDEX "Game_state_idx" ON "Game"("state");

-- CreateIndex
CREATE UNIQUE INDEX "StreamSource_gameId_key" ON "StreamSource"("gameId");

-- CreateIndex
CREATE INDEX "StreamSource_gameId_idx" ON "StreamSource"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "ViewerIdentity_email_key" ON "ViewerIdentity"("email");

-- CreateIndex
CREATE INDEX "ViewerIdentity_email_idx" ON "ViewerIdentity"("email");

-- CreateIndex
CREATE INDEX "ViewerIdentity_phoneE164_idx" ON "ViewerIdentity"("phoneE164");

-- CreateIndex
CREATE INDEX "Purchase_gameId_idx" ON "Purchase"("gameId");

-- CreateIndex
CREATE INDEX "Purchase_viewerId_idx" ON "Purchase"("viewerId");

-- CreateIndex
CREATE INDEX "Purchase_status_idx" ON "Purchase"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Entitlement_purchaseId_key" ON "Entitlement"("purchaseId");

-- CreateIndex
CREATE UNIQUE INDEX "Entitlement_tokenId_key" ON "Entitlement"("tokenId");

-- CreateIndex
CREATE INDEX "Entitlement_purchaseId_idx" ON "Entitlement"("purchaseId");

-- CreateIndex
CREATE INDEX "Entitlement_tokenId_idx" ON "Entitlement"("tokenId");

-- CreateIndex
CREATE INDEX "PlaybackSession_entitlementId_idx" ON "PlaybackSession"("entitlementId");

-- CreateIndex
CREATE INDEX "Refund_purchaseId_idx" ON "Refund"("purchaseId");

-- CreateIndex
CREATE INDEX "LedgerEntry_ownerAccountId_idx" ON "LedgerEntry"("ownerAccountId");

-- CreateIndex
CREATE INDEX "LedgerEntry_referenceType_referenceId_idx" ON "LedgerEntry"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "Payout_ownerAccountId_idx" ON "Payout"("ownerAccountId");

-- CreateIndex
CREATE INDEX "Payout_status_idx" ON "Payout"("status");

-- CreateIndex
CREATE INDEX "SMSMessage_phoneE164_idx" ON "SMSMessage"("phoneE164");

-- CreateIndex
CREATE INDEX "SMSMessage_keywordCode_idx" ON "SMSMessage"("keywordCode");

-- CreateIndex
CREATE UNIQUE INDEX "AdminAccount_email_key" ON "AdminAccount"("email");

-- CreateIndex
CREATE INDEX "AdminAccount_email_idx" ON "AdminAccount"("email");

-- CreateIndex
CREATE INDEX "AdminAccount_status_idx" ON "AdminAccount"("status");

-- CreateIndex
CREATE INDEX "AdminAuditLog_adminUserId_idx" ON "AdminAuditLog"("adminUserId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_targetType_targetId_idx" ON "AdminAuditLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "PaymentAttempt_purchaseId_idx" ON "PaymentAttempt"("purchaseId");

-- AddForeignKey
ALTER TABLE "OwnerUser" ADD CONSTRAINT "OwnerUser_ownerAccountId_fkey" FOREIGN KEY ("ownerAccountId") REFERENCES "OwnerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_ownerAccountId_fkey" FOREIGN KEY ("ownerAccountId") REFERENCES "OwnerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamSource" ADD CONSTRAINT "StreamSource_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "ViewerIdentity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entitlement" ADD CONSTRAINT "Entitlement_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaybackSession" ADD CONSTRAINT "PlaybackSession_entitlementId_fkey" FOREIGN KEY ("entitlementId") REFERENCES "Entitlement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_ownerAccountId_fkey" FOREIGN KEY ("ownerAccountId") REFERENCES "OwnerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_ownerAccountId_fkey" FOREIGN KEY ("ownerAccountId") REFERENCES "OwnerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
