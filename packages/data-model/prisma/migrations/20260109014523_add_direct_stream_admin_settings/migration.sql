-- CreateTable
CREATE TABLE "DirectStream" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "streamUrl" TEXT,
    "paywallEnabled" BOOLEAN NOT NULL DEFAULT false,
    "priceInCents" INTEGER NOT NULL DEFAULT 0,
    "paywallMessage" VARCHAR(1000),
    "allowSavePayment" BOOLEAN NOT NULL DEFAULT false,
    "chatEnabled" BOOLEAN NOT NULL DEFAULT true,
    "gameId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DirectStream_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DirectStream_slug_key" ON "DirectStream"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "DirectStream_gameId_key" ON "DirectStream"("gameId");

-- CreateIndex
CREATE INDEX "DirectStream_slug_idx" ON "DirectStream"("slug");

-- AddForeignKey
ALTER TABLE "DirectStream" ADD CONSTRAINT "DirectStream_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;
