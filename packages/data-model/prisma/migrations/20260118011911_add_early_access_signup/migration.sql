-- CreateTable
CREATE TABLE "EarlyAccessSignup" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "name" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EarlyAccessSignup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EarlyAccessSignup_email_key" ON "EarlyAccessSignup"("email");

-- CreateIndex
CREATE INDEX "EarlyAccessSignup_email_idx" ON "EarlyAccessSignup"("email");

-- CreateIndex
CREATE INDEX "EarlyAccessSignup_source_idx" ON "EarlyAccessSignup"("source");
