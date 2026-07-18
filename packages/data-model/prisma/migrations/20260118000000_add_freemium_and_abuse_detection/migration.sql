-- Migration: add_freemium_and_abuse_detection
-- Description: Adds freemium tracking, device fingerprinting, and IP locking
-- Date: 2026-01-18

-- ===========================================
-- 1. Add freemium fields to OwnerAccount
-- ===========================================
ALTER TABLE "OwnerAccount" 
ADD COLUMN IF NOT EXISTS "freeGamesUsed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "subscriptionTier" TEXT,
ADD COLUMN IF NOT EXISTS "subscriptionEndsAt" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "abuseWarnings" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "isSuspended" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "suspendedReason" TEXT;

-- ===========================================
-- 2. Add IP locking fields to Purchase
-- ===========================================
ALTER TABLE "Purchase"
ADD COLUMN IF NOT EXISTS "lockedIpAddress" TEXT,
ADD COLUMN IF NOT EXISTS "lockedAt" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "lastAccessedAt" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "lastAccessedIp" TEXT;

-- ===========================================
-- 3. Create DeviceFingerprint table
-- ===========================================
CREATE TABLE IF NOT EXISTS "DeviceFingerprint" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "fingerprintHash" TEXT NOT NULL UNIQUE,
  "ipAddresses" TEXT[] NOT NULL DEFAULT '{}',
  "abuseScore" INTEGER NOT NULL DEFAULT 0,
  "warningsShown" INTEGER NOT NULL DEFAULT 0,
  "oneTimePassUsed" BOOLEAN NOT NULL DEFAULT false,
  "flaggedAt" TIMESTAMP,
  "flagReason" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "lastSeenAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "DeviceFingerprint_fingerprintHash_idx" 
ON "DeviceFingerprint"("fingerprintHash");

-- ===========================================
-- 4. Create OwnerAccountFingerprint junction table
-- ===========================================
CREATE TABLE IF NOT EXISTS "OwnerAccountFingerprint" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "ownerAccountId" UUID NOT NULL REFERENCES "OwnerAccount"("id") ON DELETE CASCADE,
  "deviceFingerprintId" UUID NOT NULL REFERENCES "DeviceFingerprint"("id") ON DELETE CASCADE,
  "registeredAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "registrationIp" TEXT NOT NULL,
  UNIQUE("ownerAccountId", "deviceFingerprintId")
);

CREATE INDEX IF NOT EXISTS "OwnerAccountFingerprint_deviceFingerprintId_idx"
ON "OwnerAccountFingerprint"("deviceFingerprintId");

CREATE INDEX IF NOT EXISTS "OwnerAccountFingerprint_ownerAccountId_idx"
ON "OwnerAccountFingerprint"("ownerAccountId");
