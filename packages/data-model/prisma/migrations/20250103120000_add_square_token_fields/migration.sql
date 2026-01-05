-- AlterTable
ALTER TABLE "OwnerAccount" ADD COLUMN "squareAccessTokenEncrypted" TEXT,
ADD COLUMN "squareRefreshTokenEncrypted" TEXT,
ADD COLUMN "squareTokenExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "OwnerAccount_payoutProviderRef_idx" ON "OwnerAccount"("payoutProviderRef");

