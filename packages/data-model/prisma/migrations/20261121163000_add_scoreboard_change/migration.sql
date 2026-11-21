-- CreateTable
CREATE TABLE "ScoreboardChange" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "gameScoreboardId" UUID NOT NULL,
    "field" TEXT NOT NULL,
    "fromValue" TEXT NOT NULL,
    "toValue" TEXT NOT NULL,
    "matchClockLabel" TEXT NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "editedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreboardChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScoreboardChange_gameScoreboardId_createdAt_idx" ON "ScoreboardChange"("gameScoreboardId", "createdAt");

-- AddForeignKey
ALTER TABLE "ScoreboardChange" ADD CONSTRAINT "ScoreboardChange_gameScoreboardId_fkey" FOREIGN KEY ("gameScoreboardId") REFERENCES "GameScoreboard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
