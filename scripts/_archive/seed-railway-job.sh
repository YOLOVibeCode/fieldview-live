#!/bin/bash
# Run seed script as Railway job (from within Railway environment)
#
# Usage: railway run bash scripts/seed-railway-job.sh

set -e

echo "🌱 Seeding DirectStreams via Railway Job..."
echo "Environment: Railway (internal network)"
echo ""

# Use the internal DATABASE_URL (available in Railway environment)
pnpm exec tsx scripts/seed-direct-streams.ts --production

echo ""
echo "✅ Railway seed job complete!"

