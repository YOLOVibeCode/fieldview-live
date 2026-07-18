#!/bin/bash
# Setup script for Marketplace Model A (local)

set -e

echo "🚀 Setting up Marketplace Model A locally..."

# Check if Docker is running
if ! docker ps > /dev/null 2>&1; then
  echo "❌ Docker is not running. Please start Docker and try again."
  exit 1
fi

# Start services
echo "📦 Starting Docker services..."
docker-compose up -d postgres redis mailpit

# Wait for postgres to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  export DATABASE_URL="postgresql://fieldview:dev_password_change_in_production@localhost:4302/fieldview_dev?schema=public"
  echo "✅ Using default DATABASE_URL"
fi

# Generate ENCRYPTION_KEY if not set
if [ -z "$ENCRYPTION_KEY" ]; then
  ENCRYPTION_KEY=$(openssl rand -base64 32)
  echo "🔑 Generated ENCRYPTION_KEY: $ENCRYPTION_KEY"
  echo ""
  echo "⚠️  Add this to your apps/api/.env file:"
  echo "ENCRYPTION_KEY=\"$ENCRYPTION_KEY\""
  echo ""
fi

# Run migration
echo "📊 Running database migration..."
cd "$(dirname "$0")/.."
pnpm --filter=data-model exec prisma migrate deploy

echo ""
echo "✅ Local setup complete!"
echo ""
echo "Next steps:"
echo "1. Add ENCRYPTION_KEY to apps/api/.env (see above)"
echo "2. Ensure all Square credentials are set in apps/api/.env"
echo "3. Start API server: cd apps/api && pnpm dev"
echo "4. Test Square Connect flow: POST /api/owners/square/connect"

