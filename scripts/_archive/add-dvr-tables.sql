-- Migration: Add DVR Video Clips and Bookmarks
-- Description: Adds VideoClip and VideoBookmark models for DVR functionality
-- Date: 2026-01-15

-- Create VideoClip table
CREATE TABLE "VideoClip" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
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

-- Create VideoBookmark table
CREATE TABLE "VideoBookmark" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
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

-- Create unique constraint for VideoClip
CREATE UNIQUE INDEX "VideoClip_providerName_providerClipId_key" ON "VideoClip"("providerName", "providerClipId");

-- Create indexes for VideoClip
CREATE INDEX "VideoClip_gameId_idx" ON "VideoClip"("gameId");
CREATE INDEX "VideoClip_directStreamId_idx" ON "VideoClip"("directStreamId");
CREATE INDEX "VideoClip_directStreamSlug_idx" ON "VideoClip"("directStreamSlug");
CREATE INDEX "VideoClip_status_idx" ON "VideoClip"("status");
CREATE INDEX "VideoClip_isPublic_idx" ON "VideoClip"("isPublic");
CREATE INDEX "VideoClip_createdAt_idx" ON "VideoClip"("createdAt");
CREATE INDEX "VideoClip_expiresAt_idx" ON "VideoClip"("expiresAt");

-- Create indexes for VideoBookmark
CREATE INDEX "VideoBookmark_gameId_idx" ON "VideoBookmark"("gameId");
CREATE INDEX "VideoBookmark_directStreamId_idx" ON "VideoBookmark"("directStreamId");
CREATE INDEX "VideoBookmark_viewerIdentityId_idx" ON "VideoBookmark"("viewerIdentityId");
CREATE INDEX "VideoBookmark_clipId_idx" ON "VideoBookmark"("clipId");
CREATE INDEX "VideoBookmark_createdAt_idx" ON "VideoBookmark"("createdAt");

-- Add foreign key constraints for VideoClip
ALTER TABLE "VideoClip" ADD CONSTRAINT "VideoClip_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VideoClip" ADD CONSTRAINT "VideoClip_directStreamId_fkey" FOREIGN KEY ("directStreamId") REFERENCES "DirectStream"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add foreign key constraints for VideoBookmark
ALTER TABLE "VideoBookmark" ADD CONSTRAINT "VideoBookmark_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VideoBookmark" ADD CONSTRAINT "VideoBookmark_directStreamId_fkey" FOREIGN KEY ("directStreamId") REFERENCES "DirectStream"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VideoBookmark" ADD CONSTRAINT "VideoBookmark_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "VideoClip"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VideoBookmark" ADD CONSTRAINT "VideoBookmark_viewerIdentityId_fkey" FOREIGN KEY ("viewerIdentityId") REFERENCES "ViewerIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

