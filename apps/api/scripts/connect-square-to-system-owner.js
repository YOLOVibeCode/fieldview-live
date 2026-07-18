/**
 * Connect Square Credentials to System Owner
 * 
 * This script connects the Square sandbox credentials from .env
 * to the System Owner account so paywall testing can work.
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

// Get encryption key from env
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY) {
  console.error('❌ ENCRYPTION_KEY not set in .env');
  process.exit(1);
}

// Encrypt function (AES-256-GCM)
function encrypt(text) {
  const algorithm = 'aes-256-gcm';
  const keyBuffer = Buffer.from(ENCRYPTION_KEY, 'base64');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, keyBuffer, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

async function main() {
  console.log('🔐 Connecting Square Credentials to System Owner\n');

  // Get Square credentials from env
  const squareAccessToken = process.env.SQUARE_ACCESS_TOKEN;
  const squareLocationId = process.env.SQUARE_LOCATION_ID;
  const squareRefreshToken = process.env.SQUARE_REFRESH_TOKEN || null; // Optional
  
  if (!squareAccessToken || !squareLocationId) {
    console.error('❌ SQUARE_ACCESS_TOKEN or SQUARE_LOCATION_ID not set');
    console.error('📖 See: docs/SQUARE-LOCAL-SETUP.md');
    process.exit(1);
  }

  console.log('✅ Found Square credentials in .env:');
  console.log('   Access Token:', squareAccessToken.substring(0, 10) + '...');
  console.log('   Location ID:', squareLocationId);
  console.log('');

  // Encrypt the access token
  const encryptedToken = encrypt(squareAccessToken);
  const encryptedRefreshToken = squareRefreshToken ? encrypt(squareRefreshToken) : null;

  // Find System Owner
  const systemOwner = await prisma.ownerAccount.findFirst({
    where: { contactEmail: 'owner@fieldview.live' },
  });

  if (!systemOwner) {
    console.error('❌ System Owner not found');
    process.exit(1);
  }

  console.log('✅ Found System Owner:', systemOwner.name);
  console.log('   ID:', systemOwner.id);
  console.log('');

  // Update with Square credentials
  await prisma.ownerAccount.update({
    where: { id: systemOwner.id },
    data: {
      squareAccessTokenEncrypted: encryptedToken,
      squareRefreshTokenEncrypted: encryptedRefreshToken,
      squareLocationId: squareLocationId,
      squareTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  });

  console.log('✅ Square credentials connected to System Owner!');
  console.log('');
  console.log('🎬 Ready for paywall testing!');
  console.log('');
  console.log('🧪 Test checkout:');
  console.log('   curl -X POST http://localhost:4301/api/direct/tchs/checkout \\');
  console.log('     -H "Content-Type: application/json" \\');
  console.log('     -d \'{"email":"test@example.com","firstName":"Test","lastName":"User"}\'');
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
