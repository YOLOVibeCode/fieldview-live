-- DropForeignKey
ALTER TABLE "Purchase" DROP CONSTRAINT "Purchase_gameId_fkey";

-- DropForeignKey
ALTER TABLE "Purchase" DROP CONSTRAINT "Purchase_recipientOrganizationId_fkey";

-- DropForeignKey
ALTER TABLE "Purchase" DROP CONSTRAINT "Purchase_recipientOwnerAccountId_fkey";

-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN     "channelId" UUID,
ALTER COLUMN "gameId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ViewerIdentity" ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT;

-- CreateTable
CREATE TABLE "GameChatMessage" (
    "id" UUID NOT NULL,
    "gameId" UUID NOT NULL,
    "viewerId" UUID NOT NULL,
    "displayName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GameChatMessage_gameId_createdAt_idx" ON "GameChatMessage"("gameId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "GameChatMessage_viewerId_createdAt_idx" ON "GameChatMessage"("viewerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Purchase_channelId_idx" ON "Purchase"("channelId");

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "WatchChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameChatMessage" ADD CONSTRAINT "GameChatMessage_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameChatMessage" ADD CONSTRAINT "GameChatMessage_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "ViewerIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
