#!/bin/bash
# Fix Railway service linking for apps/web
# This script ensures apps/web is linked to the 'web' service, not 'api'

set -euo pipefail

echo "🔧 Fixing Railway service linking for apps/web..."
echo ""

# Check current status
echo "📋 Current service linking:"
cd apps/web
echo "  apps/web → $(railway status 2>&1 | grep -i 'service' || echo 'Not linked')"
cd ../..

echo ""
echo "🔗 Unlinking apps/web from current service..."
cd apps/web
railway unlink --yes 2>/dev/null || echo "  (No existing link to remove)"

echo ""
echo "🔗 Linking apps/web to 'web' service..."
echo "  Please select 'web' when prompted:"
railway link

echo ""
echo "✅ Verification:"
railway status

echo ""
echo "✅ Service linking fixed!"
echo ""
echo "📋 Summary:"
echo "  apps/api  → api service  (should remain unchanged)"
echo "  apps/web  → web service  (should now be correct)"
