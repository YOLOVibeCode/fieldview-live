#!/bin/bash
# Fix Stream URL Typo (run as Railway job)
#
# Usage: railway run bash scripts/fix-streamurl-typo-job.sh

set -e

echo "🔧 Fixing Stream URL Typo (ahttps:// → https://)..."
echo "Environment: Railway (internal network)"
echo ""

# Use the internal DATABASE_URL (available in Railway environment)
pnpm exec tsx scripts/fix-streamurl-typo.ts

echo ""
echo "✅ Fix complete!"
