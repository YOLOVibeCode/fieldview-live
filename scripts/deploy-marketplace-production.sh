#!/bin/bash
# Deployment script for Marketplace Model A (Railway production)

set -e

echo "🚀 Deploying Marketplace Model A to Railway..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
  echo "❌ Railway CLI is not installed."
  echo "Install with: npm i -g @railway/cli"
  exit 1
fi

# Check if logged in
if ! railway whoami &> /dev/null; then
  echo "❌ Not logged in to Railway. Run: railway login"
  exit 1
fi

# Generate ENCRYPTION_KEY if not provided
if [ -z "$ENCRYPTION_KEY" ]; then
  ENCRYPTION_KEY=$(openssl rand -base64 32)
  echo "🔑 Generated ENCRYPTION_KEY: $ENCRYPTION_KEY"
  echo ""
  echo "⚠️  IMPORTANT: Add this to Railway environment variables:"
  echo "ENCRYPTION_KEY=$ENCRYPTION_KEY"
  echo ""
  read -p "Press Enter after adding ENCRYPTION_KEY to Railway..."
fi

# Run migration
echo "📊 Running database migration..."
cd "$(dirname "$0")/.."
railway run --service api pnpm --filter=data-model exec prisma migrate deploy

echo ""
echo "✅ Migration complete!"
echo ""
echo "Next steps:"
echo "1. Verify ENCRYPTION_KEY is set in Railway"
echo "2. Update Square webhook URL to: https://api.fieldview.live/api/webhooks/square"
echo "3. Test Square Connect flow in production"
echo "4. Monitor logs: railway logs --service api"

