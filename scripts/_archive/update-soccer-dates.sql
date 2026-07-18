-- Update TCHS Soccer Event Dates from 20260712 to 20260113

-- Show events before update
SELECT 'BEFORE UPDATE:' as status;
SELECT "eventSlug", "title", "scheduledStartAt" 
FROM "DirectStreamEvent" 
WHERE "eventSlug" LIKE '%20260712%'
ORDER BY "scheduledStartAt";

-- Perform the update
UPDATE "DirectStreamEvent"
SET "eventSlug" = REPLACE("eventSlug", '20260712', '20260113')
WHERE "eventSlug" LIKE '%20260712%';

-- Show events after update
SELECT 'AFTER UPDATE:' as status;
SELECT "eventSlug", "title", "scheduledStartAt" 
FROM "DirectStreamEvent" 
WHERE "eventSlug" LIKE '%20260113%'
ORDER BY "scheduledStartAt";

