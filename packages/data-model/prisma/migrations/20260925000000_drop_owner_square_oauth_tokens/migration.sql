-- Drop in-repo Square OAuth token storage (relay Connect Hub owns tokens).
ALTER TABLE "OwnerAccount" DROP COLUMN IF EXISTS "squareAccessTokenEncrypted";
ALTER TABLE "OwnerAccount" DROP COLUMN IF EXISTS "squareRefreshTokenEncrypted";
ALTER TABLE "OwnerAccount" DROP COLUMN IF EXISTS "squareTokenExpiresAt";
