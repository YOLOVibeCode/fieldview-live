-- CreateTable
CREATE TABLE "SmsConsent" (
    "id" UUID NOT NULL,
    "phoneE164" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "consentTextVersion" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "consentedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "pendingConfirmation" BOOLEAN NOT NULL DEFAULT false,
    "addedByLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsConsent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SmsConsent_phoneE164_idx" ON "SmsConsent"("phoneE164");

-- CreateIndex
CREATE UNIQUE INDEX "SmsConsent_phoneE164_purpose_key" ON "SmsConsent"("phoneE164", "purpose");

-- CreateIndex
CREATE INDEX "SMSMessage_providerMessageId_idx" ON "SMSMessage"("providerMessageId");
