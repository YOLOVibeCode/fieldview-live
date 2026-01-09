#!/bin/bash
# Seed DirectStreams to Production Database
#
# Usage: ./scripts/seed-production-streams.sh
#
# IMPORTANT: Set DATABASE_PUBLIC_URL environment variable first!
#
# Example:
#   export DATABASE_PUBLIC_URL='postgresql://postgres:password@host:5432/railway'
#   ./scripts/seed-production-streams.sh

set -e

echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                            ║"
echo "║              🌱 SEED PRODUCTION DIRECTSTREAMS                              ║"
echo "║                                                                            ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Check if DATABASE_PUBLIC_URL is set
if [ -z "$DATABASE_PUBLIC_URL" ]; then
  echo "❌ Error: DATABASE_PUBLIC_URL is not set"
  echo ""
  echo "Please set it first:"
  echo "  export DATABASE_PUBLIC_URL='postgresql://postgres:password@host:5432/railway'"
  echo ""
  echo "Or run:"
  echo "  DATABASE_PUBLIC_URL='...' ./scripts/seed-production-streams.sh"
  echo ""
  exit 1
fi

# Confirm production operation
echo "⚠️  WARNING: You are about to seed the PRODUCTION database!"
echo ""
echo "Database: $(echo $DATABASE_PUBLIC_URL | sed -E 's/(.*@)/***@/')"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "❌ Seed cancelled"
  exit 0
fi

echo ""
echo "🚀 Running seed script on PRODUCTION..."
echo ""

# Run seed script with production flag
DATABASE_URL="$DATABASE_PUBLIC_URL" pnpm exec tsx scripts/seed-direct-streams.ts --production

echo ""
echo "✅ Production seed complete!"
echo ""
echo "You can now view the streams in the Super Admin console:"
echo "  https://fieldview.live/superadmin/direct-streams"
echo ""

