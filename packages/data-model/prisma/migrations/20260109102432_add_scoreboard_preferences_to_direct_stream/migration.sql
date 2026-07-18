-- AddScoreboardPreferencesToDirectStream
ALTER TABLE "DirectStream" ADD COLUMN IF NOT EXISTS "scoreboardEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DirectStream" ADD COLUMN IF NOT EXISTS "scoreboardHomeTeam" TEXT;
ALTER TABLE "DirectStream" ADD COLUMN IF NOT EXISTS "scoreboardAwayTeam" TEXT;
ALTER TABLE "DirectStream" ADD COLUMN IF NOT EXISTS "scoreboardHomeColor" TEXT;
ALTER TABLE "DirectStream" ADD COLUMN IF NOT EXISTS "scoreboardAwayColor" TEXT;
