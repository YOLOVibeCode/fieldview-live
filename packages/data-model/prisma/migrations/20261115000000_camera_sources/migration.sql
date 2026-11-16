-- CameraSource: one generic "connected camera platform" record per provider per owner.
-- Replaces the Veo-only VeoIntegration table.

-- CreateTable
CREATE TABLE "CameraSource" (
    "id" UUID NOT NULL,
    "ownerAccountId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "secrets" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CameraSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CameraSource_ownerAccountId_provider_key" ON "CameraSource"("ownerAccountId", "provider");

-- AddForeignKey
ALTER TABLE "CameraSource" ADD CONSTRAINT "CameraSource_ownerAccountId_fkey" FOREIGN KEY ("ownerAccountId") REFERENCES "OwnerAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Carry existing Veo connections over. Encrypted values are copied as they are
-- (same key, same format), so this needs no encryption key. A row with no session
-- cookie cannot list streams without a browser, so it starts as 'needs_reconnect'.
-- Rows with an empty password were disabled on purpose by the prod→UAT clone
-- (scripts/clone-prod-to-uat.ts); they stay disabled by not being carried over.
INSERT INTO "CameraSource" ("id", "ownerAccountId", "provider", "config", "secrets", "status", "createdAt", "updatedAt")
SELECT
    "id",
    "ownerAccountId",
    'veo',
    jsonb_build_object('email', "veoEmail", 'clubUrl', "veoDiagnosticsUrl"),
    jsonb_strip_nulls(jsonb_build_object(
        'sessionCookie', NULLIF("veoSessionCookieEncrypted", ''),
        'password', NULLIF("veoPasswordEncrypted", '')
    )),
    CASE WHEN NULLIF("veoSessionCookieEncrypted", '') IS NULL THEN 'needs_reconnect' ELSE 'active' END,
    "createdAt",
    "updatedAt"
FROM "VeoIntegration"
WHERE "veoPasswordEncrypted" <> '';

-- DropForeignKey
ALTER TABLE "VeoIntegration" DROP CONSTRAINT "VeoIntegration_ownerAccountId_fkey";

-- DropTable
DROP TABLE "VeoIntegration";
