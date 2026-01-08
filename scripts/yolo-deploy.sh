#!/usr/bin/env bash
set -euo pipefail

echo "🎯 YOLO Deploy - Quick Deploy Mode"
echo "========================================"

SERVICE="${1:-api}"  # Default to api, or pass 'web'

# Validate service name
if [[ "$SERVICE" != "api" && "$SERVICE" != "web" ]]; then
  echo "❌ Invalid service: $SERVICE"
  echo "Usage: ./scripts/yolo-deploy.sh [api|web]"
  exit 1
fi

# ONLY check if it compiles (30-60 seconds)
echo "→ Type checking ${SERVICE}..."
pnpm --filter ${SERVICE} type-check || { echo "❌ Type errors - fix before deploy"; exit 1; }

echo "→ Building ${SERVICE}..."
if [ "$SERVICE" = "api" ]; then
  pnpm --filter @fieldview/data-model build > /dev/null 2>&1
fi
pnpm --filter ${SERVICE} build > /dev/null 2>&1 || { echo "❌ Build failed"; exit 1; }

echo ""
echo "✅ ${SERVICE} builds successfully!"
echo ""
echo "🚀 Pushing to Railway..."
git add -A
git commit -m "fix: quick ${SERVICE} update" || git commit --amend --no-edit
git push origin main

echo ""
echo "=========================================="
echo "✅ DEPLOYED!"
echo "=========================================="
echo ""
echo "📊 Monitor deployment:"
echo "   railway logs --service ${SERVICE} --follow"
echo ""
echo "🔍 Quick health check:"
if [ "$SERVICE" = "api" ]; then
  echo "   curl https://api.fieldview.live/health"
else
  echo "   curl https://fieldview.live"
fi
echo ""
echo "🔄 Rollback if needed:"
echo "   railway rollback --service ${SERVICE}"
echo ""

