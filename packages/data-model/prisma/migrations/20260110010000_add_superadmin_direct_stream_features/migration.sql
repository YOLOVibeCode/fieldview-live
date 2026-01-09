-- Super Admin Direct Streams Features Migration
-- Adds email verification, registration tracking, and access control

-- Step 1: Add email verification to ViewerIdentity
ALTER TABLE "ViewerIdentity" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);
CREATE INDEX "ViewerIdentity_emailVerifiedAt_idx" ON "ViewerIdentity"("emailVerifiedAt");

-- Step 2: Add access control fields to DirectStream
ALTER TABLE "DirectStream" ADD COLUMN "allowAnonymousView" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "DirectStream" ADD COLUMN "requireEmailVerification" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "DirectStream" ADD COLUMN "listed" BOOLEAN NOT NULL DEFAULT true;

-- Step 3: Create DirectStreamRegistration table
CREATE TABLE "DirectStreamRegistration" (
    "id" UUID NOT NULL,
    "directStreamId" UUID NOT NULL,
    "viewerIdentityId" UUID NOT NULL,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),
    "wantsReminders" BOOLEAN NOT NULL DEFAULT false,
    "lastSeenAt" TIMESTAMP(3),

    CONSTRAINT "DirectStreamRegistration_pkey" PRIMARY KEY ("id")
);

-- Step 4: Create EmailVerificationToken table
CREATE TABLE "EmailVerificationToken" (
    "id" UUID NOT NULL,
    "viewerIdentityId" UUID NOT NULL,
    "directStreamId" UUID,
    "tokenHash" VARCHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- Step 5: Add unique constraints
ALTER TABLE "DirectStreamRegistration" ADD CONSTRAINT "DirectStreamRegistration_directStreamId_viewerIdentityId_key" UNIQUE ("directStreamId", "viewerIdentityId");
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_tokenHash_key" UNIQUE ("tokenHash");

-- Step 6: Create indexes for performance
CREATE INDEX "DirectStreamRegistration_directStreamId_idx" ON "DirectStreamRegistration"("directStreamId");
CREATE INDEX "DirectStreamRegistration_viewerIdentityId_idx" ON "DirectStreamRegistration"("viewerIdentityId");
CREATE INDEX "DirectStreamRegistration_verifiedAt_idx" ON "DirectStreamRegistration"("verifiedAt");

CREATE INDEX "EmailVerificationToken_viewerIdentityId_expiresAt_idx" ON "EmailVerificationToken"("viewerIdentityId", "expiresAt");
CREATE INDEX "EmailVerificationToken_tokenHash_idx" ON "EmailVerificationToken"("tokenHash");

-- Step 7: Add foreign key constraints
ALTER TABLE "DirectStreamRegistration" ADD CONSTRAINT "DirectStreamRegistration_directStreamId_fkey" FOREIGN KEY ("directStreamId") REFERENCES "DirectStream"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DirectStreamRegistration" ADD CONSTRAINT "DirectStreamRegistration_viewerIdentityId_fkey" FOREIGN KEY ("viewerIdentityId") REFERENCES "ViewerIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_viewerIdentityId_fkey" FOREIGN KEY ("viewerIdentityId") REFERENCES "ViewerIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_directStreamId_fkey" FOREIGN KEY ("directStreamId") REFERENCES "DirectStream"("id") ON DELETE CASCADE ON UPDATE CASCADE;

