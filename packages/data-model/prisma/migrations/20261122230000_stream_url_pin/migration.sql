-- A stream URL chosen by a person (the admin panel, a coach text command) is pinned.
-- The camera poller never rewrites a pinned page. Existing pages start unpinned.

-- AlterTable
ALTER TABLE "DirectStreamEvent" ADD COLUMN     "streamUrlPinnedAt" TIMESTAMP(3);
