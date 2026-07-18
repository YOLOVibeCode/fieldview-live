-- Add viewer scoreboard editing permissions to DirectStream and DirectStreamEvent
-- Migration: add_viewer_scoreboard_edit_permissions

-- Add to DirectStream table
ALTER TABLE "DirectStream"
ADD COLUMN "allowViewerScoreEdit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "allowViewerNameEdit" BOOLEAN NOT NULL DEFAULT false;

-- Add to DirectStreamEvent table (nullable overrides)
ALTER TABLE "DirectStreamEvent"
ADD COLUMN "allowViewerScoreEdit" BOOLEAN,
ADD COLUMN "allowViewerNameEdit" BOOLEAN;

-- Add comments for documentation
COMMENT ON COLUMN "DirectStream"."allowViewerScoreEdit" IS 'Allow registered viewers to edit scores';
COMMENT ON COLUMN "DirectStream"."allowViewerNameEdit" IS 'Allow registered viewers to edit team names';
COMMENT ON COLUMN "DirectStreamEvent"."allowViewerScoreEdit" IS 'Override parent: Allow viewers to edit scores (NULL = inherit)';
COMMENT ON COLUMN "DirectStreamEvent"."allowViewerNameEdit" IS 'Override parent: Allow viewers to edit team names (NULL = inherit)';
