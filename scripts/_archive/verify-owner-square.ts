/**
 * Verify OwnerAccount Square Connection
 * 
 * Checks if an OwnerAccount has valid Square OAuth credentials
 * for processing DirectStream paywall payments.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyOwnerSquare() {
  try {
    console.log('🔍 Searching for OwnerAccount...\n');

    // Find the first owner account (adjust query as needed)
    const ownerAccount = await prisma.ownerAccount.findFirst({
      where: { type: 'owner' },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        contactEmail: true,
        payoutProviderRef: true,
        squareAccessTokenEncrypted: true,
        squareRefreshTokenEncrypted: true,
        squareTokenExpiresAt: true,
        squareLocationId: true,
      },
    });

    if (!ownerAccount) {
      console.error('❌ No OwnerAccount found');
      console.error('   Create one first or check your database');
      process.exit(1);
    }

    console.log('✅ OwnerAccount found:', ownerAccount.id);
    console.log('   Name:', ownerAccount.name);
    console.log('   Email:', ownerAccount.contactEmail);
    console.log('   Type:', ownerAccount.type);
    console.log('   Status:', ownerAccount.status);
    console.log('   Square Merchant ID:', ownerAccount.payoutProviderRef || '❌ NOT SET');
    console.log('   Square Location ID:', ownerAccount.squareLocationId || '❌ NOT SET');
    console.log('   Access Token:', ownerAccount.squareAccessTokenEncrypted ? '✅ ENCRYPTED' : '❌ NOT SET');
    console.log('   Refresh Token:', ownerAccount.squareRefreshTokenEncrypted ? '✅ ENCRYPTED' : '❌ NOT SET');
    
    if (ownerAccount.squareTokenExpiresAt) {
      const isExpired = new Date(ownerAccount.squareTokenExpiresAt) < new Date();
      console.log('   Token Expires:', ownerAccount.squareTokenExpiresAt.toISOString());
      console.log('   Token Status:', isExpired ? '❌ EXPIRED' : '✅ VALID');
    } else {
      console.log('   Token Expires: ❌ NOT SET');
    }

    // Check if ALL required fields are present
    const isReady = 
      ownerAccount.squareAccessTokenEncrypted &&
      ownerAccount.squareLocationId &&
      ownerAccount.squareTokenExpiresAt &&
      new Date(ownerAccount.squareTokenExpiresAt) > new Date();

    console.log('\n🎯 Payment Processing Ready:', isReady ? '✅ YES' : '❌ NO');
    
    if (isReady) {
      console.log('\n💰 YOUR OwnerAccount ID (save this):\n');
      console.log('   ' + ownerAccount.id);
      console.log('\n   Use this ID for DirectStream.ownerAccountId');
      console.log('   Copy to clipboard or save to .env as OWNER_ACCOUNT_ID');
    } else {
      console.log('\n⚠️  ACTION REQUIRED:');
      console.log('   Square OAuth not connected. You need to:');
      console.log('   1. Start the web app: pnpm --filter web dev');
      console.log('   2. Login as owner');
      console.log('   3. Navigate to Square Connect page');
      console.log('   4. Complete OAuth flow');
      console.log('\n   OR for testing: manually set Square credentials in OwnerAccount');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyOwnerSquare();

