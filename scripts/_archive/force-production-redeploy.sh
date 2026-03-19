#!/bin/bash
# Force clear cache and redeploy both API and Web services to Railway

set -e

echo "🚀 Force Redeploying Production Services..."
echo ""

# Step 1: Create an empty commit to trigger redeploy
echo "📝 Creating empty commit to trigger Railway redeploy..."
git commit --allow-empty -m "Force redeploy: Clear cache and deploy latest code

- Forces Next.js cache clear
- Redeploys both API and Web services
- Ensures production matches local working code"

# Step 2: Push to trigger deployment
echo ""
echo "📤 Pushing to trigger Railway deployment..."
git push origin main

echo ""
echo "✅ Deployment triggered!"
echo ""
echo "Next steps:"
echo "1. Monitor deployment at: https://railway.app"
echo "2. Wait 3-5 minutes for deployment to complete"
echo "3. Test at: https://fieldview.live/direct/tchs/soccer-20260122-jv2"
echo ""
echo "To force clear Next.js cache on Railway, the deployment will:"
echo "- Clean build artifacts"
echo "- Rebuild with fresh cache"
echo "- Deploy new code"
