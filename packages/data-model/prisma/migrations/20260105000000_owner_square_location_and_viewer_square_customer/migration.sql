-- AlterTable
ALTER TABLE "OwnerAccount" ADD COLUMN "squareLocationId" TEXT;

-- CreateTable
CREATE TABLE "ViewerSquareCustomer" (
    "id" UUID NOT NULL,
    "ownerAccountId" UUID NOT NULL,
    "viewerId" UUID NOT NULL,
    "squareCustomerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ViewerSquareCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ViewerSquareCustomer_ownerAccountId_viewerId_key" ON "ViewerSquareCustomer"("ownerAccountId", "viewerId");

-- CreateIndex
CREATE INDEX "ViewerSquareCustomer_ownerAccountId_idx" ON "ViewerSquareCustomer"("ownerAccountId");

-- CreateIndex
CREATE INDEX "ViewerSquareCustomer_viewerId_idx" ON "ViewerSquareCustomer"("viewerId");

-- CreateIndex
CREATE INDEX "ViewerSquareCustomer_squareCustomerId_idx" ON "ViewerSquareCustomer"("squareCustomerId");

-- CreateIndex
CREATE INDEX "OwnerAccount_squareLocationId_idx" ON "OwnerAccount"("squareLocationId");

-- AddForeignKey
ALTER TABLE "ViewerSquareCustomer" ADD CONSTRAINT "ViewerSquareCustomer_ownerAccountId_fkey"
FOREIGN KEY ("ownerAccountId") REFERENCES "OwnerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViewerSquareCustomer" ADD CONSTRAINT "ViewerSquareCustomer_viewerId_fkey"
FOREIGN KEY ("viewerId") REFERENCES "ViewerIdentity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


