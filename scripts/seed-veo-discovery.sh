#!/bin/bash
#
# Veo Discovery Test Data Seeder
# 
# Usage:
#   ./scripts/seed-veo-discovery.sh          # Seed LOCAL
#   ./scripts/seed-veo-discovery.sh prod     # Seed PRODUCTION
#   ./scripts/seed-veo-discovery.sh cleanup  # Cleanup LOCAL
#   ./scripts/seed-veo-discovery.sh cleanup-prod  # Cleanup PRODUCTION
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# Get production DATABASE_URL dynamically from Railway
get_prod_db_url() {
  # Use railway run to get the env var directly from the Postgres service
  railway run --service Postgres printenv DATABASE_PUBLIC_URL 2>/dev/null
}

case "${1:-local}" in
  prod|production)
    echo "🚀 Seeding PRODUCTION..."
    PROD_DB_URL=$(get_prod_db_url)
    if [ -z "$PROD_DB_URL" ]; then
      echo "❌ Failed to get DATABASE_URL from Railway. Make sure you're logged in: railway login"
      exit 1
    fi
    DATABASE_URL="$PROD_DB_URL" npx tsx scripts/seed-veo-discovery-data.ts --production
    ;;
  cleanup-prod|cleanup-production)
    echo "🧹 Cleaning up PRODUCTION..."
    PROD_DB_URL=$(get_prod_db_url)
    if [ -z "$PROD_DB_URL" ]; then
      echo "❌ Failed to get DATABASE_URL from Railway. Make sure you're logged in: railway login"
      exit 1
    fi
    DATABASE_URL="$PROD_DB_URL" npx tsx scripts/seed-veo-discovery-data.ts --production --cleanup
    ;;
  cleanup)
    echo "🧹 Cleaning up LOCAL..."
    npx tsx scripts/seed-veo-discovery-data.ts --cleanup
    ;;
  dry-run)
    echo "👀 Dry run LOCAL..."
    npx tsx scripts/seed-veo-discovery-data.ts --dry-run
    ;;
  *)
    echo "💻 Seeding LOCAL..."
    npx tsx scripts/seed-veo-discovery-data.ts
    ;;
esac
