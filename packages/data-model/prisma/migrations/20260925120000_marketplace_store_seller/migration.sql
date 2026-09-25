-- Marketplace store migration: drop legacy Square + Connect Hub columns; add store seller key.

ALTER TABLE "OwnerAccount" DROP COLUMN IF EXISTS "squareAccessTokenEncrypted";
ALTER TABLE "OwnerAccount" DROP COLUMN IF EXISTS "squareRefreshTokenEncrypted";
ALTER TABLE "OwnerAccount" DROP COLUMN IF EXISTS "squareTokenExpiresAt";
ALTER TABLE "OwnerAccount" DROP COLUMN IF EXISTS "squareLocationId";
ALTER TABLE "OwnerAccount" DROP COLUMN IF EXISTS "relayRecipientKey";
ALTER TABLE "OwnerAccount" DROP COLUMN IF EXISTS "agreementAcceptedVersion";

ALTER TABLE "OwnerAccount" ADD COLUMN IF NOT EXISTS "marketplaceSellerKey" TEXT;

CREATE INDEX IF NOT EXISTS "OwnerAccount_marketplaceSellerKey_idx" ON "OwnerAccount"("marketplaceSellerKey");

DROP INDEX IF EXISTS "OwnerAccount_squareLocationId_idx";
DROP INDEX IF EXISTS "OwnerAccount_relayRecipientKey_idx";

ALTER TABLE "Purchase" DROP COLUMN IF EXISTS "squareCardId";

DROP TABLE IF EXISTS "ViewerSquareCustomer";
