-- CreateTable
CREATE TABLE "VeoIntegration" (
    "id" UUID NOT NULL,
    "ownerAccountId" UUID NOT NULL,
    "veoEmail" TEXT NOT NULL,
    "veoPasswordEncrypted" TEXT NOT NULL,
    "veoDiagnosticsUrl" VARCHAR(2048) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VeoIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VeoIntegration_ownerAccountId_key" ON "VeoIntegration"("ownerAccountId");

-- CreateIndex
CREATE INDEX "VeoIntegration_ownerAccountId_idx" ON "VeoIntegration"("ownerAccountId");

-- AddForeignKey
ALTER TABLE "VeoIntegration" ADD CONSTRAINT "VeoIntegration_ownerAccountId_fkey" FOREIGN KEY ("ownerAccountId") REFERENCES "OwnerAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
