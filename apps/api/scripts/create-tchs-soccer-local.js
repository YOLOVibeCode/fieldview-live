const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function createTCHSSoccerStreams() {
  console.log('🏃 Creating TCHS Soccer streams...\n');

  try {
    // Read and execute the SQL file
    const sql = fs.readFileSync('/tmp/create-tchs-soccer-streams.sql', 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.toLowerCase().includes('select')) {
        // For SELECT statements, show results
        const results = await prisma.$queryRawUnsafe(statement);
        console.log('\n✅ Created streams:');
        console.table(results);
      } else {
        // For INSERT/UPDATE statements
        await prisma.$executeRawUnsafe(statement);
      }
    }

    console.log('\n✅ All TCHS Soccer streams created successfully!\n');
    console.log('📍 Access your streams at:');
    console.log('   - http://localhost:4300/direct/tchs/soccer-20260120-jv2');
    console.log('   - http://localhost:4300/direct/tchs/soccer-20260120-jv');
    console.log('   - http://localhost:4300/direct/tchs/soccer-20260120-varsity\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createTCHSSoccerStreams();
