-- Text commands: several phones per login, and one phone on several logins (accounts).
-- A link becomes one row per (login, phone) with the person's name. The open question and the
-- lease move to a per-phone table, and the time zone to a per-login table.
-- The feature has been switched off since it shipped, so these tables are expected to be empty.
-- The data steps still keep anything stored before the one-phone columns are dropped.

-- 1. Settings per login, starting from the time zones stored on links.
CREATE TABLE "CoachTextSettings" (
    "ownerUserId" UUID NOT NULL,
    "timeZone" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachTextSettings_pkey" PRIMARY KEY ("ownerUserId")
);

INSERT INTO "CoachTextSettings" ("ownerUserId", "timeZone", "updatedAt")
SELECT "ownerUserId", "timeZone", CURRENT_TIMESTAMP
FROM "CoachTextLink"
WHERE "timeZone" IS NOT NULL;

ALTER TABLE "CoachTextSettings" ADD CONSTRAINT "CoachTextSettings_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "OwnerUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. One login may now hold several rows, and one phone may sit on several logins.
DROP INDEX "CoachTextLink_ownerUserId_key";
DROP INDEX "CoachTextLink_phoneE164_key";
DROP INDEX "CoachTextLink_pendingPhoneE164_idx";

ALTER TABLE "CoachTextLink" ADD COLUMN "label" TEXT;

-- 3. A login waiting on a new number while another one is linked: the linked phone moves to a
--    new row, and the original row (whose id salts the waiting code's hash) becomes the waiting
--    number, so the code it already showed still works.
INSERT INTO "CoachTextLink" ("id", "ownerUserId", "phoneE164", "label", "verifiedAt", "lastCommandAt", "pausedAt", "codeAttempts", "createdAt", "updatedAt")
SELECT gen_random_uuid(), "ownerUserId", "phoneE164", 'Phone', "verifiedAt", "lastCommandAt", "pausedAt", 0, "createdAt", CURRENT_TIMESTAMP
FROM "CoachTextLink"
WHERE "phoneE164" IS NOT NULL
  AND "pendingPhoneE164" IS NOT NULL
  AND "pendingPhoneE164" <> "phoneE164";

UPDATE "CoachTextLink"
SET "phoneE164" = "pendingPhoneE164",
    "verifiedAt" = NULL,
    "lastCommandAt" = NULL,
    "pausedAt" = NULL
WHERE "phoneE164" IS NOT NULL
  AND "pendingPhoneE164" IS NOT NULL
  AND "pendingPhoneE164" <> "phoneE164";

-- 4. A row waiting on its first number: the number moves into phoneE164.
UPDATE "CoachTextLink"
SET "phoneE164" = "pendingPhoneE164"
WHERE "phoneE164" IS NULL
  AND "pendingPhoneE164" IS NOT NULL;

-- 5. A row with no number held only a time zone, which step 1 kept.
DELETE FROM "CoachTextLink" WHERE "phoneE164" IS NULL;

-- 6. Rows made before names existed.
UPDATE "CoachTextLink" SET "label" = 'Phone' WHERE "label" IS NULL;

ALTER TABLE "CoachTextLink" ALTER COLUMN "label" SET NOT NULL,
ALTER COLUMN "phoneE164" SET NOT NULL;

-- 7. The one-phone columns go: the question and the lease now live on CoachTextPhone.
ALTER TABLE "CoachTextLink" DROP COLUMN "busyUntil",
DROP COLUMN "pendingExpiresAt",
DROP COLUMN "pendingId",
DROP COLUMN "pendingPhoneE164",
DROP COLUMN "pendingQuestion",
DROP COLUMN "timeZone";

CREATE INDEX "CoachTextLink_phoneE164_idx" ON "CoachTextLink"("phoneE164");

CREATE UNIQUE INDEX "CoachTextLink_ownerUserId_phoneE164_key" ON "CoachTextLink"("ownerUserId", "phoneE164");

-- 8. Per-phone conversation state, and the sending phone's name on each history row.
CREATE TABLE "CoachTextPhone" (
    "phoneE164" TEXT NOT NULL,
    "chosenLinkId" UUID,
    "chosenUntil" TIMESTAMP(3),
    "pendingId" UUID,
    "pendingQuestion" JSONB,
    "pendingExpiresAt" TIMESTAMP(3),
    "busyUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachTextPhone_pkey" PRIMARY KEY ("phoneE164")
);

ALTER TABLE "CoachTextCommand" ADD COLUMN "phoneLabel" TEXT;
