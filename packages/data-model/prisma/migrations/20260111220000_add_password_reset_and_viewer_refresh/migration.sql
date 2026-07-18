-- CreateTable: PasswordResetToken
CREATE TABLE "PasswordResetToken" (
    "id" UUID NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "userType" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ViewerRefreshToken
CREATE TABLE "ViewerRefreshToken" (
    "id" UUID NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "viewerIdentityId" UUID NOT NULL,
    "directStreamId" UUID,
    "gameId" UUID,
    "redirectUrl" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ViewerRefreshToken_pkey" PRIMARY KEY ("id")
);

-- AlterTable: OwnerUser - Add password reset tracking
ALTER TABLE "OwnerUser" ADD COLUMN "lastPasswordResetAt" TIMESTAMP(3);
ALTER TABLE "OwnerUser" ADD COLUMN "passwordResetCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: AdminAccount - Add password reset tracking and MFA reset flag
ALTER TABLE "AdminAccount" ADD COLUMN "lastPasswordResetAt" TIMESTAMP(3);
ALTER TABLE "AdminAccount" ADD COLUMN "passwordResetCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AdminAccount" ADD COLUMN "mfaResetRequired" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX "PasswordResetToken_tokenHash_idx" ON "PasswordResetToken"("tokenHash");
CREATE INDEX "PasswordResetToken_email_userType_idx" ON "PasswordResetToken"("email", "userType");
CREATE INDEX "PasswordResetToken_userId_userType_idx" ON "PasswordResetToken"("userId", "userType");
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ViewerRefreshToken_tokenHash_key" ON "ViewerRefreshToken"("tokenHash");
CREATE INDEX "ViewerRefreshToken_tokenHash_idx" ON "ViewerRefreshToken"("tokenHash");
CREATE INDEX "ViewerRefreshToken_viewerIdentityId_idx" ON "ViewerRefreshToken"("viewerIdentityId");
CREATE INDEX "ViewerRefreshToken_expiresAt_idx" ON "ViewerRefreshToken"("expiresAt");

-- AddForeignKey
ALTER TABLE "ViewerRefreshToken" ADD CONSTRAINT "ViewerRefreshToken_viewerIdentityId_fkey" FOREIGN KEY ("viewerIdentityId") REFERENCES "ViewerIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViewerRefreshToken" ADD CONSTRAINT "ViewerRefreshToken_directStreamId_fkey" FOREIGN KEY ("directStreamId") REFERENCES "DirectStream"("id") ON DELETE SET NULL ON UPDATE CASCADE;

