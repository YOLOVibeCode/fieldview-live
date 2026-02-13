-- AlterTable: Make VideoBookmark.viewerIdentityId nullable (bookmarks are stream-owned)
-- When a ViewerIdentity is deleted, bookmarks survive with viewerIdentityId set to NULL
ALTER TABLE "VideoBookmark" ALTER COLUMN "viewerIdentityId" DROP NOT NULL;

-- Drop the existing CASCADE foreign key constraint
ALTER TABLE "VideoBookmark" DROP CONSTRAINT IF EXISTS "VideoBookmark_viewerIdentityId_fkey";

-- Re-create with SET NULL behavior
ALTER TABLE "VideoBookmark"
  ADD CONSTRAINT "VideoBookmark_viewerIdentityId_fkey"
  FOREIGN KEY ("viewerIdentityId") REFERENCES "ViewerIdentity"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
