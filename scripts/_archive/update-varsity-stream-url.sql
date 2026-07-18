-- Update Varsity Stream URL to Live Stream
-- 
-- Updates soccer-20260116-varsity with the correct live Mux stream URL

-- Show current state
SELECT 
  e.id,
  e."eventSlug",
  e."streamUrl" as current_url,
  d.slug as parent_slug
FROM "DirectStreamEvent" e
JOIN "DirectStream" d ON e."directStreamId" = d.id
WHERE e."eventSlug" = 'soccer-20260116-varsity'
  AND d.slug = 'tchs';

-- Update to new live stream URL
UPDATE "DirectStreamEvent"
SET "streamUrl" = 'https://stream.mux.com/Be02yA6vRJb8fQ01U4yuj01C9KKPC02gHCdBX71J02McpZb4.m3u8'
WHERE "eventSlug" = 'soccer-20260116-varsity'
  AND "directStreamId" IN (
    SELECT id FROM "DirectStream" WHERE slug = 'tchs'
  );

-- Verify the update
SELECT 
  e.id,
  e."eventSlug",
  e."streamUrl" as updated_url,
  d.slug as parent_slug
FROM "DirectStreamEvent" e
JOIN "DirectStream" d ON e."directStreamId" = d.id
WHERE e."eventSlug" = 'soccer-20260116-varsity'
  AND d.slug = 'tchs';
