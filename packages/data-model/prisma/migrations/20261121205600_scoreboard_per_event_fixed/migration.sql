-- A parent can have one board, and each game (DirectStreamEvent) can have its own.
--
-- Replaces 20261121205500_scoreboard_per_event, which never applied anywhere: its first line
-- dropped a CONSTRAINT named "GameScoreboard_directStreamId_key", but that name is a unique
-- INDEX (created in 20260109050000_add_social_producer_and_email_features), so Postgres
-- refused it (42704) and Prisma stopped (P3018).
--
-- Every statement is written to run safely on any database: one that never saw the old
-- migration, one where it was resolved as rolled back, and one where it was resolved as
-- applied without its SQL having run.

DROP INDEX IF EXISTS "GameScoreboard_directStreamId_key";

ALTER TABLE "GameScoreboard" ADD COLUMN IF NOT EXISTS "directStreamEventId" UUID;

CREATE UNIQUE INDEX IF NOT EXISTS "GameScoreboard_directStreamEventId_key" ON "GameScoreboard"("directStreamEventId");

CREATE UNIQUE INDEX IF NOT EXISTS "GameScoreboard_parent_board_key" ON "GameScoreboard"("directStreamId") WHERE "directStreamEventId" IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'GameScoreboard_directStreamEventId_fkey'
  ) THEN
    ALTER TABLE "GameScoreboard" ADD CONSTRAINT "GameScoreboard_directStreamEventId_fkey" FOREIGN KEY ("directStreamEventId") REFERENCES "DirectStreamEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
