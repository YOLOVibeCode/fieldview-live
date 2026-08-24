-- Change default sport from 'generic' to 'soccer' for new DirectStream rows.
-- Existing rows keep their stored value (no data migration needed).
ALTER TABLE "DirectStream" ALTER COLUMN "sport" SET DEFAULT 'soccer';
