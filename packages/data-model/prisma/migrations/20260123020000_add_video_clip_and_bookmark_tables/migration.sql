-- CreateTable
CREATE TABLE "VideoClip" (
    "id" UUID NOT NULL,
    "gameId" UUID,
    "directStreamId" UUID,
    "directStreamSlug" TEXT,
    "providerName" TEXT NOT NULL,
    "providerClipId" TEXT NOT NULL,
    "providerRecordingId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTimeSeconds" INTEGER NOT NULL,
    "endTimeSeconds" INTEGER NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "playbackUrl" TEXT,
    "thumbnailUrl" TEXT,
    "status" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "shareCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" UUID,
    "createdByType" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoClip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoBookmark" (
    "id" UUID NOT NULL,
    "gameId" UUID,
    "directStreamId" UUID,
    "clipId" UUID,
    "viewerIdentityId" UUID NOT NULL,
    "timestampSeconds" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "notes" TEXT,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VideoClip_providerName_providerClipId_key" ON "VideoClip"("providerName", "providerClipId");

-- CreateIndex
CREATE INDEX "VideoClip_gameId_idx" ON "VideoClip"("gameId");

-- CreateIndex
CREATE INDEX "VideoClip_directStreamId_idx" ON "VideoClip"("directStreamId");

-- CreateIndex
CREATE INDEX "VideoClip_directStreamSlug_idx" ON "VideoClip"("directStreamSlug");

-- CreateIndex
CREATE INDEX "VideoClip_status_idx" ON "VideoClip"("status");

-- CreateIndex
CREATE INDEX "VideoClip_isPublic_idx" ON "VideoClip"("isPublic");

-- CreateIndex
CREATE INDEX "VideoClip_createdAt_idx" ON "VideoClip"("createdAt");

-- CreateIndex
CREATE INDEX "VideoClip_expiresAt_idx" ON "VideoClip"("expiresAt");

-- CreateIndex
CREATE INDEX "VideoBookmark_gameId_idx" ON "VideoBookmark"("gameId");

-- CreateIndex
CREATE INDEX "VideoBookmark_directStreamId_idx" ON "VideoBookmark"("directStreamId");

-- CreateIndex
CREATE INDEX "VideoBookmark_viewerIdentityId_idx" ON "VideoBookmark"("viewerIdentityId");

-- CreateIndex
CREATE INDEX "VideoBookmark_clipId_idx" ON "VideoBookmark"("clipId");

-- CreateIndex
CREATE INDEX "VideoBookmark_createdAt_idx" ON "VideoBookmark"("createdAt");

-- AddForeignKey
ALTER TABLE "VideoClip" ADD CONSTRAINT "VideoClip_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoClip" ADD CONSTRAINT "VideoClip_directStreamId_fkey" FOREIGN KEY ("directStreamId") REFERENCES "DirectStream"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoBookmark" ADD CONSTRAINT "VideoBookmark_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoBookmark" ADD CONSTRAINT "VideoBookmark_directStreamId_fkey" FOREIGN KEY ("directStreamId") REFERENCES "DirectStream"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoBookmark" ADD CONSTRAINT "VideoBookmark_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "VideoClip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoBookmark" ADD CONSTRAINT "VideoBookmark_viewerIdentityId_fkey" FOREIGN KEY ("viewerIdentityId") REFERENCES "ViewerIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
