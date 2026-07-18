#!/bin/bash
# Set password script for Railway
# Usage: railway run --service api ./scripts/set-password-railway.sh stormfc@darkware.net SuperPassword

set -e

EMAIL="${1:-}"
PASSWORD="${2:-}"

if [ -z "$EMAIL" ] || [ -z "$PASSWORD" ]; then
  echo "Usage: $0 <email> <password>"
  exit 1
fi

# Use Node.js to set password (Railway has Node.js available)
node -e "
const { PrismaClient } = require('@prisma/client');
const bcryptjs = require('bcryptjs');

const prisma = new PrismaClient();

(async () => {
  try {
    const email = '${EMAIL}';
    const password = '${PASSWORD}';
    
    console.log(\`Setting password for \${email}...\`);
    
    // Try OwnerUser first
    const ownerUser = await prisma.ownerUser.findUnique({ where: { email } });
    if (ownerUser) {
      const hashedPassword = await bcryptjs.hash(password, 10);
      await prisma.ownerUser.update({
        where: { id: ownerUser.id },
        data: { passwordHash: hashedPassword }
      });
      console.log(\`✓ Password updated for OwnerUser: \${email}\`);
      process.exit(0);
    }
    
    // Try AdminAccount
    const adminAccount = await prisma.adminAccount.findUnique({ where: { email } });
    if (adminAccount) {
      const hashedPassword = await bcryptjs.hash(password, 10);
      await prisma.adminAccount.update({
        where: { id: adminAccount.id },
        data: { passwordHash: hashedPassword }
      });
      console.log(\`✓ Password updated for AdminAccount: \${email}\`);
      process.exit(0);
    }
    
    console.error(\`✗ User not found: \${email}\`);
    process.exit(1);
  } catch (error) {
    console.error('Error setting password:', error);
    process.exit(1);
  } finally {
    await prisma.\$disconnect();
  }
})();
"


