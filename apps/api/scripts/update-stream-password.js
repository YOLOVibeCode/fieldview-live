/**
 * Update Stream Password - Production Safe
 * 
 * Updates a DirectStream's admin password (properly hashed with bcrypt)
 * 
 * Usage:
 *   RAILWAY_DATABASE_URL="postgres://..." node scripts/update-stream-password.js <slug> <new-password>
 * 
 * Example:
 *   RAILWAY_DATABASE_URL="postgres://..." node scripts/update-stream-password.js "tchs/soccer-20260122-jv2" "tchs2026"
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// Get arguments
const slug = process.argv[2];
const newPassword = process.argv[3];

if (!slug || !newPassword) {
  console.error('❌ Usage: node scripts/update-stream-password.js <slug> <new-password>');
  console.error('   Example: node scripts/update-stream-password.js "tchs/soccer-20260122-jv2" "tchs2026"');
  process.exit(1);
}

// Get DATABASE_URL from environment (Railway production)
const DATABASE_URL = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ No DATABASE_URL found');
  console.error('   Set RAILWAY_DATABASE_URL for production or DATABASE_URL for local');
  process.exit(1);
}

const isProduction = DATABASE_URL.includes('railway') || DATABASE_URL.includes('neon') || !DATABASE_URL.includes('localhost');
console.log(`\n🔧 Environment: ${isProduction ? 'PRODUCTION' : 'LOCAL'}\n`);

const prisma = new PrismaClient({
  datasources: {
    db: { url: DATABASE_URL }
  },
  log: ['error'],
});

async function main() {
  console.log(`🔑 Updating password for stream: ${slug}\n`);
  
  // Find the stream
  const stream = await prisma.directStream.findUnique({
    where: { slug: slug.toLowerCase() },
    select: { id: true, slug: true, title: true }
  });
  
  if (!stream) {
    console.error(`❌ Stream not found: ${slug}`);
    console.log('\n📋 Available streams:');
    const streams = await prisma.directStream.findMany({
      select: { slug: true, title: true },
      take: 10,
    });
    streams.forEach(s => console.log(`   • ${s.slug} - ${s.title}`));
    return;
  }
  
  console.log(`✅ Found stream: ${stream.title}`);
  
  // Hash the new password with bcrypt
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
  
  console.log(`🔐 Hashing password with bcrypt (${saltRounds} rounds)...`);
  
  // Update the stream
  await prisma.directStream.update({
    where: { slug: slug.toLowerCase() },
    data: { adminPassword: hashedPassword }
  });
  
  console.log(`\n✅ Password updated successfully!`);
  console.log(`\n📝 Stream: ${stream.slug}`);
  console.log(`   New password: ${newPassword}`);
  console.log(`   Hash: ${hashedPassword.substring(0, 20)}...`);
  
  // Verify the password works
  const verify = await bcrypt.compare(newPassword, hashedPassword);
  console.log(`\n🔍 Verification: ${verify ? '✅ Password hash is valid' : '❌ Hash verification failed'}`);
  
  if (isProduction) {
    console.log(`\n🌐 Test at: https://fieldview.live/direct/${stream.slug}`);
  } else {
    console.log(`\n🏠 Test at: http://localhost:4300/direct/${stream.slug}`);
  }
}

main()
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
