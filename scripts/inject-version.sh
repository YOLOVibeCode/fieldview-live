#!/bin/bash
# Inject version into Next.js build
# This script reads version from package.json and sets it as an environment variable

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_PKG="$ROOT_DIR/apps/web/package.json"

if [ ! -f "$WEB_PKG" ]; then
  echo "❌ package.json not found: $WEB_PKG"
  exit 1
fi

VERSION=$(jq -r '.version' "$WEB_PKG")
export NEXT_PUBLIC_APP_VERSION="$VERSION"

echo "✅ Version injected: $VERSION"
echo "NEXT_PUBLIC_APP_VERSION=$VERSION"
