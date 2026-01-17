#!/bin/bash
# Railway Job: Update Varsity Stream URL
# Run this as: railway run --service api bash scripts/update-varsity-railway-job.sh

set -e

echo "🔧 Updating Varsity Stream URL..."
echo "Running on Railway infrastructure..."
echo ""

# This runs on Railway, so DATABASE_URL is available
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not set!"
  exit 1
fi

echo "✅ DATABASE_URL found"
echo ""

# Install pg-promise if needed (Railway has npm)
npm list pg-promise >/dev/null 2>&1 || npm install pg-promise

# Run the update using node and pg-promise
node -e "
const pgp = require('pg-promise')();
const db = pgp(process.env.DATABASE_URL);

const newUrl = 'https://stream.mux.com/Be02yA6vRJb8fQ01U4yuj01C9KKPC02gHCdBX71J02McpZb4.m3u8';

async function update() {
  try {
    console.log('📊 Current state:');
    const current = await db.one(\`
      SELECT e.\"eventSlug\", e.\"streamUrl\", d.slug as parent_slug
      FROM \"DirectStreamEvent\" e
      JOIN \"DirectStream\" d ON e.\"directStreamId\" = d.id
      WHERE e.\"eventSlug\" = 'soccer-20260116-varsity' AND d.slug = 'tchs'
    \`);
    console.log('   Event:', current.eventSlug);
    console.log('   Current URL:', current.streamUrl || '(null)');
    console.log('');

    console.log('📝 Updating...');
    const result = await db.one(\`
      UPDATE \"DirectStreamEvent\"
      SET \"streamUrl\" = \$1, \"updatedAt\" = CURRENT_TIMESTAMP
      WHERE \"eventSlug\" = 'soccer-20260116-varsity'
        AND \"directStreamId\" IN (SELECT id FROM \"DirectStream\" WHERE slug = 'tchs')
      RETURNING \"eventSlug\", \"streamUrl\"
    \`, [newUrl]);
    
    console.log('✅ Updated!');
    console.log('   Event:', result.eventSlug);
    console.log('   New URL:', result.streamUrl);
    console.log('');
    console.log('✅ Done!');
    
    pgp.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    pgp.end();
    process.exit(1);
  }
}

update();
"
