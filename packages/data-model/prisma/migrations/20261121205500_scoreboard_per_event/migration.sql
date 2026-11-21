-- A parent can have one board, and each game (DirectStreamEvent) can have its own.
ALTER TABLE "GameScoreboard" DROP CONSTRAINT "GameScoreboard_directStreamId_key";

ALTER TABLE "GameScoreboard" ADD COLUMN "directStreamEventId" UUID;

CREATE UNIQUE INDEX "GameScoreboard_directStreamEventId_key" ON "GameScoreboard"("directStreamEventId");

CREATE UNIQUE INDEX "GameScoreboard_parent_board_key" ON "GameScoreboard"("directStreamId") WHERE "directStreamEventId" IS NULL;

ALTER TABLE "GameScoreboard" ADD CONSTRAINT "GameScoreboard_directStreamEventId_fkey" FOREIGN KEY ("directStreamEventId") REFERENCES "DirectStreamEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
