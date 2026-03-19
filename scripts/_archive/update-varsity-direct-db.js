#!/usr/bin/env node
/**
 * Update Varsity Stream URL - Direct Database Access
 * 
 * This script connects to Railway's production database directly
 */

const { Client } = require('pg');

async function main() {
  // Get DATABASE_URL from Railway environment
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable not set');
    console.error('Run this with: railway run --service postgres -- node scripts/update-varsity-direct-db.js');
    process.exit(1);
  }

  console.log('🔧 Connecting to production database...\n');

  const client = new Client({ connectionString: databaseUrl });
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    const newStreamUrl = 'https://stream.mux.com/Be02yA6vRJb8fQ01U4yuj01C9KKPC02gHCdBX71J02McpZb4.m3u8';

    // Show current state
    console.log('📊 Current state:');
    const currentResult = await client.query(`
      SELECT e."eventSlug", e."streamUrl", d.slug as parent_slug
      FROM "DirectStreamEvent" e
      JOIN "DirectStream" d ON e."directStreamId" = d.id
      WHERE e."eventSlug" = 'soccer-20260116-varsity' AND d.slug = 'tchs'
    `);
    
    if (currentResult.rows.length === 0) {
      console.error('❌ Event not found!');
      process.exit(1);
    }
    
    console.log(`   Event: ${currentResult.rows[0].eventSlug}`);
    console.log(`   Current URL: ${currentResult.rows[0].streamUrl || '(null)'}\n`);

    // Update
    console.log('📝 Updating stream URL...');
    const updateResult = await client.query(`
      UPDATE "DirectStreamEvent"
      SET "streamUrl" = $1
      WHERE "eventSlug" = 'soccer-20260116-varsity'
        AND "directStreamId" IN (SELECT id FROM "DirectStream" WHERE slug = 'tchs')
      RETURNING "eventSlug", "streamUrl"
    `, [newStreamUrl]);

    if (updateResult.rowCount === 0) {
      console.error('❌ No rows updated!');
      process.exit(1);
    }

    console.log(`✅ Updated ${updateResult.rowCount} row(s)\n`);

    // Verify
    console.log('🔍 Verification:');
    const verifyResult = await client.query(`
      SELECT e."eventSlug", e."streamUrl"
      FROM "DirectStreamEvent" e
      JOIN "DirectStream" d ON e."directStreamId" = d.id
      WHERE e."eventSlug" = 'soccer-20260116-varsity' AND d.slug = 'tchs'
    `);
    
    console.log(`   Event: ${verifyResult.rows[0].eventSlug}`);
    console.log(`   New URL: ${verifyResult.rows[0].streamUrl}\n`);

    console.log('✅ Database update complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
