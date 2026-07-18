-- Fix Stream URL Typo (ahttps:// → https://)
--
-- This fixes the typo in streamUrl fields where "ahttps://" was incorrectly entered

-- Show affected DirectStreams
SELECT 
  id, 
  slug, 
  streamUrl as current_url,
  REPLACE(streamUrl, 'ahttps://', 'https://') as fixed_url
FROM "DirectStream"
WHERE streamUrl LIKE 'ahttps://%';

-- Show affected DirectStreamEvents
SELECT 
  e.id,
  d.slug as parent_slug,
  e.eventSlug,
  e.streamUrl as current_url,
  REPLACE(e.streamUrl, 'ahttps://', 'https://') as fixed_url
FROM "DirectStreamEvent" e
JOIN "DirectStream" d ON e.directStreamId = d.id
WHERE e.streamUrl LIKE 'ahttps://%';

-- Fix DirectStreams
UPDATE "DirectStream"
SET streamUrl = REPLACE(streamUrl, 'ahttps://', 'https://')
WHERE streamUrl LIKE 'ahttps://%';

-- Fix DirectStreamEvents  
UPDATE "DirectStreamEvent"
SET streamUrl = REPLACE(streamUrl, 'ahttps://', 'https://')
WHERE streamUrl LIKE 'ahttps://%';

-- Verify fix
SELECT COUNT(*) as remaining_typos
FROM "DirectStream"
WHERE streamUrl LIKE 'ahttps://%'
UNION ALL
SELECT COUNT(*) 
FROM "DirectStreamEvent"
WHERE streamUrl LIKE 'ahttps://%';
