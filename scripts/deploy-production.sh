#!/bin/bash

# Production Deployment Script for Railway
# Runs migrations on production database

echo "🚂 Running production database migrations..."

# Get the production DATABASE_URL from Railway
# Note: This assumes DATABASE_URL is available in the environment
# or you need to export it from Railway dashboard first

if [ -z "$DATABASE_PUBLIC_URL" ]; then
  echo "❌ ERROR: DATABASE_PUBLIC_URL not set"
  echo "Please export it from Railway dashboard:"
  echo "  export DATABASE_PUBLIC_URL='postgresql://...'"
  exit 1
fi

# Set the DATABASE_URL for Prisma
export DATABASE_URL="$DATABASE_PUBLIC_URL"

echo "📦 Generating Prisma Client..."
cd packages/data-model
pnpm exec prisma generate

echo "🔄 Running migrations..."
pnpm exec prisma migrate deploy

echo "✅ Migrations complete!"
echo ""
echo "📊 Checking migration status..."
pnpm exec prisma migrate status

echo ""
echo "🎉 Production deployment complete!"

