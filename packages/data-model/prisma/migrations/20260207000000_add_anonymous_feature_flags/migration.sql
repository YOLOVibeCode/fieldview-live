-- AlterTable
ALTER TABLE "DirectStream" ADD COLUMN "allowAnonymousChat" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DirectStream" ADD COLUMN "allowAnonymousScoreEdit" BOOLEAN NOT NULL DEFAULT false;
