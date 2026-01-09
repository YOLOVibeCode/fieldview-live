#!/usr/bin/env node

/**
 * Manual Migration Runner
 * Use this to run migrations manually after server is running
 * 
 * Usage: node manual-migrate.js
 */

const { PrismaClient } = require('@prisma/client');

async function main() {
  console.log('🔧 Manual Migration Runner');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const prisma = new PrismaClient();

  try {
    // Step 1: Check if OwnerAccount exists
    console.log('\n📊 Step 1: Checking for OwnerAccount...');
    const ownerCount = await prisma.ownerAccount.count();
    console.log(`   Found ${ownerCount} OwnerAccount(s)`);

    if (ownerCount === 0) {
      console.log('   ⚠️  No OwnerAccount found. Creating default...');
      const owner = await prisma.ownerAccount.create({
        data: {
          name: 'FieldView Live',
          email: 'admin@fieldview.live',
        },
      });
      console.log(`   ✅ Created OwnerAccount: ${owner.id}`);
    }

    // Step 2: Check DirectStream schema
    console.log('\n📊 Step 2: Checking DirectStream records...');
    try {
      const streamCount = await prisma.directStream.count();
      console.log(`   Found ${streamCount} DirectStream(s)`);
      
      // Try to query with ownerAccountId to see if column exists
      const streams = await prisma.directStream.findMany({
        select: { id: true, slug: true, ownerAccountId: true },
      });
      console.log(`   ✅ ownerAccountId column exists`);
      
      const withoutOwner = streams.filter(s => !s.ownerAccountId);
      if (withoutOwner.length > 0) {
        console.log(`   ⚠️  ${withoutOwner.length} DirectStream(s) without ownerAccountId`);
      }
    } catch (error) {
      if (error.message.includes('column') || error.message.includes('ownerAccountId')) {
        console.log(`   ❌ ownerAccountId column missing - migration needs to run!`);
      } else {
        throw error;
      }
    }

    // Step 3: Test database connection
    console.log('\n📊 Step 3: Testing database connection...');
    await prisma.$queryRaw`SELECT 1`;
    console.log('   ✅ Database connection OK');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Diagnostic complete!');
    console.log('\nNext steps:');
    console.log('  1. If ownerAccountId column is missing, run: npx prisma migrate deploy');
    console.log('  2. If column exists but has NULLs, backfill them manually');

  } catch (error) {
    console.error('\n❌ Error during diagnostic:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

