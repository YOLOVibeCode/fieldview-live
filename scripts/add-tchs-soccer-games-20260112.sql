-- Add TCHS Soccer Games for January 12, 2026
-- Run this in both local and production databases

-- First, get the parent stream ID
-- DO $$
-- DECLARE
--   parent_stream_id UUID;
-- BEGIN

-- Find TCHS parent stream
WITH parent AS (
  SELECT id FROM "DirectStream" WHERE slug = 'tchs' LIMIT 1
)
-- Insert JV2 game
INSERT INTO "DirectStreamEvent" (
  id,
  "directStreamId",
  "eventSlug",
  title,
  "scheduledStartAt",
  status,
  "chatEnabled",
  "scoreboardEnabled",
  "requireEmailVerification",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid(),
  parent.id,
  'soccer-20260112-jv2',
  'TCHS Soccer - JV2 vs TBA',
  '2026-01-12 14:00:00-08'::timestamptz,
  'active',
  true,
  true,
  true,
  NOW(),
  NOW()
FROM parent
ON CONFLICT ("directStreamId", "eventSlug") 
DO UPDATE SET
  title = EXCLUDED.title,
  "scheduledStartAt" = EXCLUDED."scheduledStartAt",
  status = 'active',
  "updatedAt" = NOW();

-- Insert JV game
INSERT INTO "DirectStreamEvent" (
  id,
  "directStreamId",
  "eventSlug",
  title,
  "scheduledStartAt",
  status,
  "chatEnabled",
  "scoreboardEnabled",
  "requireEmailVerification",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid(),
  parent.id,
  'soccer-20260112-jv',
  'TCHS Soccer - JV vs TBA',
  '2026-01-12 15:30:00-08'::timestamptz,
  'active',
  true,
  true,
  true,
  NOW(),
  NOW()
FROM (SELECT id FROM "DirectStream" WHERE slug = 'tchs' LIMIT 1) parent
ON CONFLICT ("directStreamId", "eventSlug") 
DO UPDATE SET
  title = EXCLUDED.title,
  "scheduledStartAt" = EXCLUDED."scheduledStartAt",
  status = 'active',
  "updatedAt" = NOW();

-- Insert Varsity game
INSERT INTO "DirectStreamEvent" (
  id,
  "directStreamId",
  "eventSlug",
  title,
  "scheduledStartAt",
  status,
  "chatEnabled",
  "scoreboardEnabled",
  "requireEmailVerification",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid(),
  parent.id,
  'soccer-20260112-varsity',
  'TCHS Soccer - Varsity vs TBA',
  '2026-01-12 17:00:00-08'::timestamptz,
  'active',
  true,
  true,
  true,
  NOW(),
  NOW()
FROM (SELECT id FROM "DirectStream" WHERE slug = 'tchs' LIMIT 1) parent
ON CONFLICT ("directStreamId", "eventSlug") 
DO UPDATE SET
  title = EXCLUDED.title,
  "scheduledStartAt" = EXCLUDED."scheduledStartAt",
  status = 'active',
  "updatedAt" = NOW();

-- Verify the games were added
SELECT 
  ds.slug as parent_slug,
  dse."eventSlug",
  dse.title,
  dse."scheduledStartAt",
  dse.status
FROM "DirectStreamEvent" dse
JOIN "DirectStream" ds ON ds.id = dse."directStreamId"
WHERE ds.slug = 'tchs'
  AND dse."eventSlug" IN ('soccer-20260112-jv2', 'soccer-20260112-jv', 'soccer-20260112-varsity')
ORDER BY dse."scheduledStartAt";

