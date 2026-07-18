-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN     "couponCodeId" UUID,
ADD COLUMN     "discountCents" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CouponCode" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "discountType" TEXT NOT NULL,
    "discountValue" INTEGER NOT NULL,
    "ownerAccountId" UUID,
    "gameId" UUID,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "maxUsesPerViewer" INTEGER NOT NULL DEFAULT 1,
    "minPurchaseCents" INTEGER,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByAdminId" UUID NOT NULL,

    CONSTRAINT "CouponCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponRedemption" (
    "id" UUID NOT NULL,
    "couponId" UUID NOT NULL,
    "purchaseId" UUID NOT NULL,
    "viewerId" UUID NOT NULL,
    "discountCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CouponCode_code_key" ON "CouponCode"("code");

-- CreateIndex
CREATE INDEX "CouponCode_code_idx" ON "CouponCode"("code");

-- CreateIndex
CREATE INDEX "CouponCode_status_idx" ON "CouponCode"("status");

-- CreateIndex
CREATE INDEX "CouponCode_ownerAccountId_idx" ON "CouponCode"("ownerAccountId");

-- CreateIndex
CREATE INDEX "CouponRedemption_couponId_idx" ON "CouponRedemption"("couponId");

-- CreateIndex
CREATE INDEX "CouponRedemption_viewerId_idx" ON "CouponRedemption"("viewerId");

-- CreateIndex
CREATE UNIQUE INDEX "CouponRedemption_couponId_purchaseId_key" ON "CouponRedemption"("couponId", "purchaseId");

-- CreateIndex
CREATE INDEX "Purchase_couponCodeId_idx" ON "Purchase"("couponCodeId");

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_couponCodeId_fkey" FOREIGN KEY ("couponCodeId") REFERENCES "CouponCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "CouponCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
