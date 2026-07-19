-- Migration: add_relay_recipient_fields
-- Description: Noctusoft Relay Connect Hub — per-owner recipient key + payments connection state.
--              Supersedes the in-repo Square OAuth token fields (removed in a later cleanup slice).
-- Date: 2026-07-19

ALTER TABLE "OwnerAccount"
ADD COLUMN IF NOT EXISTS "relayRecipientKey" TEXT,
ADD COLUMN IF NOT EXISTS "paymentsConnectedAt" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "agreementAcceptedVersion" TEXT;

CREATE INDEX IF NOT EXISTS "OwnerAccount_relayRecipientKey_idx" ON "OwnerAccount"("relayRecipientKey");
