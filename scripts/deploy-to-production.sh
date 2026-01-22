#!/bin/bash
# Deploy to Production with Version Management
# Automatically bumps version, creates git tag for significant changes, and deploys

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION_SCRIPT="$ROOT_DIR/scripts/version-manager.sh"
API_PKG="$ROOT_DIR/apps/api/package.json"

echo "🚀 Deploy to Production"
echo ""

# Get current version
CURRENT_VERSION=$(jq -r '.version' "$API_PKG")
echo "📦 Current version: $CURRENT_VERSION"
echo ""

# Ask if this is a significant change
read -p "Is this a significant change? (minor/major version bump) [y/N]: " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "Select version bump type:"
  echo "  1) Minor (1.2.3 -> 1.3.0) - New features, backward compatible"
  echo "  2) Major (1.2.3 -> 2.0.0) - Breaking changes"
  read -p "Choice [1/2]: " -n 1 -r
  echo ""
  
  if [[ $REPLY == "2" ]]; then
    BUMP_TYPE="major"
  else
    BUMP_TYPE="minor"
  fi
  
  # Bump version
  NEW_VERSION=$("$VERSION_SCRIPT" "$BUMP_TYPE")
  echo ""
  echo "✅ Version bumped to: $NEW_VERSION"
  
  # Create git tag
  echo ""
  echo "🏷️  Creating git tag: v$NEW_VERSION"
  git add apps/api/package.json apps/web/package.json package.json
  git commit -m "chore: bump version to $NEW_VERSION" || true
  git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"
  echo "✅ Git tag created: v$NEW_VERSION"
else
  # Regular build bump
  NEW_VERSION=$("$VERSION_SCRIPT" "build")
  echo ""
  echo "✅ Version bumped to: $NEW_VERSION"
  
  # Commit version change
  git add apps/api/package.json apps/web/package.json package.json
  git commit -m "chore: bump version to $NEW_VERSION" || true
fi

echo ""
echo "🔨 Running preflight build..."
"$ROOT_DIR/scripts/preflight-build.sh"

if [ $? -ne 0 ]; then
  echo "❌ Preflight build failed. Aborting deployment."
  exit 1
fi

echo ""
echo "🔍 Running additional runtime validation..."
if [ -f "$ROOT_DIR/scripts/validate-runtime.sh" ]; then
  "$ROOT_DIR/scripts/validate-runtime.sh"
  if [ $? -ne 0 ]; then
    echo "❌ Runtime validation failed. Aborting deployment."
    exit 1
  fi
else
  echo "⚠️  Runtime validation script not found (skipping)"
fi

echo ""
echo "📤 Pushing to Railway..."
git push origin main

# Push tags if created
if git rev-parse "v$NEW_VERSION" >/dev/null 2>&1; then
  git push origin "v$NEW_VERSION"
  echo "✅ Pushed tag: v$NEW_VERSION"
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Version Information:"
echo "   Current: $CURRENT_VERSION"
echo "   New:     $NEW_VERSION"
echo ""
echo "🔗 Monitor deployment: https://railway.app"
echo "🌐 Test at: https://fieldview.live"
