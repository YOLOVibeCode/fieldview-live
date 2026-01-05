-- CreateTable: Organization
CREATE TABLE "Organization" (
    "id" UUID NOT NULL,
    "ownerAccountId" UUID NOT NULL,
    "shortName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable: WatchChannel
CREATE TABLE "WatchChannel" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "teamSlug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "requireEventCode" BOOLEAN NOT NULL DEFAULT false,
    "accessMode" TEXT NOT NULL DEFAULT 'public_free',
    "priceCents" INTEGER,
    "currency" TEXT DEFAULT 'USD',
    "streamType" TEXT NOT NULL,
    "muxPlaybackId" TEXT,
    "hlsManifestUrl" TEXT,
    "externalEmbedUrl" TEXT,
    "externalProvider" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WatchChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable: WatchEventCode
CREATE TABLE "WatchEventCode" (
    "id" UUID NOT NULL,
    "channelId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "boundIpHash" TEXT,
    "boundAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WatchEventCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_shortName_key" ON "Organization"("shortName");

-- CreateIndex
CREATE INDEX "Organization_ownerAccountId_idx" ON "Organization"("ownerAccountId");

-- CreateIndex
CREATE INDEX "Organization_shortName_idx" ON "Organization"("shortName");

-- CreateIndex
CREATE UNIQUE INDEX "WatchChannel_organizationId_teamSlug_key" ON "WatchChannel"("organizationId", "teamSlug");

-- CreateIndex
CREATE INDEX "WatchChannel_organizationId_idx" ON "WatchChannel"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "WatchEventCode_channelId_code_key" ON "WatchEventCode"("channelId", "code");

-- CreateIndex
CREATE INDEX "WatchEventCode_channelId_idx" ON "WatchEventCode"("channelId");

-- CreateIndex
CREATE INDEX "WatchEventCode_code_idx" ON "WatchEventCode"("code");

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_ownerAccountId_fkey" FOREIGN KEY ("ownerAccountId") REFERENCES "OwnerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchChannel" ADD CONSTRAINT "WatchChannel_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchEventCode" ADD CONSTRAINT "WatchEventCode_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "WatchChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;


