-- Enable chat and scoreboard for all active direct streams in production
-- Run: psql <PRODUCTION_DATABASE_URL> -f enable-features-production.sql

BEGIN;

-- Enable features for TCHS main stream
UPDATE "DirectStream"
SET 
  "chatEnabled" = true,
  "scoreboardEnabled" = true,
  "scoreboardHomeTeam" = 'Twin Cities',
  "scoreboardAwayTeam" = 'Opponent',
  "scoreboardHomeColor" = '#1E3A8A',
  "scoreboardAwayColor" = '#DC2626'
WHERE slug = 'tchs';

-- Enable features for StormFC main stream
UPDATE "DirectStream"
SET 
  "chatEnabled" = true,
  "scoreboardEnabled" = true,
  "scoreboardHomeTeam" = 'Storm FC',
  "scoreboardAwayTeam" = 'Opponent',
  "scoreboardHomeColor" = '#1E40AF',
  "scoreboardAwayColor" = '#DC2626'
WHERE slug = 'stormfc';

-- Enable features for TCHS soccer sub-events (January 12, 2026)
UPDATE "DirectStreamEvent"
SET 
  "chatEnabled" = true,
  "scoreboardEnabled" = true,
  "scoreboardHomeTeam" = 'TCHS',
  "scoreboardAwayTeam" = 'Opponent',
  "scoreboardHomeColor" = '#1E3A8A',
  "scoreboardAwayColor" = '#DC2626'
WHERE "eventSlug" IN ('soccer-20260112-jv2', 'soccer-20260112-jv', 'soccer-20260112-varsity');

-- Enable for any other active streams (catch-all)
UPDATE "DirectStream"
SET 
  "chatEnabled" = COALESCE("chatEnabled", true),
  "scoreboardEnabled" = COALESCE("scoreboardEnabled", true)
WHERE status = 'active' 
  AND ("chatEnabled" IS NULL OR "scoreboardEnabled" IS NULL);

COMMIT;

-- Verify the changes
SELECT slug, "chatEnabled", "scoreboardEnabled", "scoreboardHomeTeam", "scoreboardAwayTeam"
FROM "DirectStream"
WHERE slug IN ('tchs', 'stormfc')
ORDER BY slug;

