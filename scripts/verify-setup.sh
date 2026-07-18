#!/bin/bash
# Verification script for Marketplace Model A setup

set -e

echo "🔍 Verifying Marketplace Model A Setup..."
echo ""

# Check database
echo "1. Checking database connection..."
export DATABASE_URL="postgresql://fieldview:dev_password_change_in_production@localhost:4302/fieldview_dev?schema=public"
if docker-compose exec -T postgres psql -U fieldview -d fieldview_dev -c "SELECT 1" > /dev/null 2>&1; then
  echo "   ✅ Database connected"
else
  echo "   ❌ Database not connected - start with: docker-compose up -d postgres"
  exit 1
fi

# Check migration
echo "2. Checking migration..."
if docker-compose exec -T postgres psql -U fieldview -d fieldview_dev -c "\d \"OwnerAccount\"" 2>&1 | grep -q "squareAccessTokenEncrypted"; then
  echo "   ✅ Migration applied"
else
  echo "   ⚠️  Migration not applied - run: pnpm --filter=data-model exec prisma migrate deploy"
fi

# Check Prisma client
echo "3. Checking Prisma client..."
if [ -d "node_modules/.prisma/client" ] || [ -d "packages/data-model/node_modules/.prisma/client" ]; then
  echo "   ✅ Prisma client generated"
else
  echo "   ⚠️  Prisma client not generated - run: pnpm --filter=data-model exec prisma generate"
fi

# Check ENCRYPTION_KEY
echo "4. Checking ENCRYPTION_KEY..."
if [ -f "apps/api/.env" ] && grep -q "ENCRYPTION_KEY" apps/api/.env; then
  echo "   ✅ ENCRYPTION_KEY found in .env"
else
  echo "   ⚠️  ENCRYPTION_KEY missing - add to apps/api/.env"
fi

# Check TypeScript compilation
echo "5. Checking TypeScript compilation..."
if pnpm --filter=api exec tsc --noEmit 2>&1 | grep -q "error TS"; then
  echo "   ⚠️  TypeScript errors found - check output above"
else
  echo "   ✅ No TypeScript errors"
fi

echo ""
echo "✅ Setup verification complete!"
echo ""
echo "To start the API:"
echo "  cd apps/api && pnpm dev"

