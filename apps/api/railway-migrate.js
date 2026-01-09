#!/usr/bin/env node

/**
 * Railway Migration Runner
 * Runs Prisma migrations on Railway production database
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚂 Railway Migration Runner');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Check DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment');
  process.exit(1);
}

const dbUrl = process.env.DATABASE_URL;
console.log(`✅ DATABASE_URL found: ${dbUrl.substring(0, 30)}...`);

// Change to data-model directory
const dataModelDir = path.join(__dirname, '../../packages/data-model');
process.chdir(dataModelDir);

console.log(`📂 Working directory: ${process.cwd()}`);
console.log('');
console.log('🔄 Running Prisma migrate deploy...');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

try {
  execSync('npx prisma migrate deploy --schema=./prisma/schema.prisma', {
    stdio: 'inherit',
    env: process.env
  });
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Migrations completed successfully!');
} catch (error) {
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('❌ Migration failed:', error.message);
  console.error('');
  console.error('⚠️  WARNING: Continuing server startup despite migration failure');
  console.error('    This allows the server to start so you can manually fix the database.');
  console.error('');
  // DON'T exit with error - let the server start so we can debug
}

console.log('✅ Migration runner completed (check logs above for any errors)');
process.exit(0);

