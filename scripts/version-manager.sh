#!/bin/bash
# Version Manager for FieldView.Live
# Manages version numbers across API and Web services
# Usage: ./scripts/version-manager.sh [patch|minor|major|set VERSION]

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_PKG="$ROOT_DIR/apps/api/package.json"
WEB_PKG="$ROOT_DIR/apps/web/package.json"
ROOT_PKG="$ROOT_DIR/package.json"

# Get current version (should be same in all packages)
get_current_version() {
  jq -r '.version' "$API_PKG"
}

# Update version in all package.json files
update_version() {
  local new_version=$1
  echo "📦 Updating version to $new_version..."
  
  # Update API
  jq ".version = \"$new_version\"" "$API_PKG" > "$API_PKG.tmp" && mv "$API_PKG.tmp" "$API_PKG"
  
  # Update Web
  jq ".version = \"$new_version\"" "$WEB_PKG" > "$WEB_PKG.tmp" && mv "$WEB_PKG.tmp" "$WEB_PKG"
  
  # Update Root (optional, for consistency)
  jq ".version = \"$new_version\"" "$ROOT_PKG" > "$ROOT_PKG.tmp" && mv "$ROOT_PKG.tmp" "$ROOT_PKG"
  
  echo "✅ Version updated in all packages"
}

# Bump version
bump_version() {
  local current_version=$(get_current_version)
  local bump_type=$1
  
  # Parse version (supports both 1.2.3 and 1.2.3.005 format)
  IFS='.' read -ra VERSION_PARTS <<< "$current_version"
  local major=${VERSION_PARTS[0]}
  local minor=${VERSION_PARTS[1]}
  local patch=${VERSION_PARTS[2]}
  local build=${VERSION_PARTS[3]:-0}
  
  case $bump_type in
    patch)
      patch=$((patch + 1))
      build=0
      ;;
    minor)
      minor=$((minor + 1))
      patch=0
      build=0
      ;;
    major)
      major=$((major + 1))
      minor=0
      patch=0
      build=0
      ;;
    build)
      build=$((build + 1))
      ;;
    *)
      echo "❌ Invalid bump type: $bump_type (use: patch, minor, major, build)"
      exit 1
      ;;
  esac
  
  # Format new version
  if [ "$build" -gt 0 ]; then
    new_version="$major.$minor.$patch.$(printf "%03d" $build)"
  else
    new_version="$major.$minor.$patch"
  fi
  
  update_version "$new_version"
  echo "$new_version"
}

# Set version explicitly
set_version() {
  local version=$1
  if [[ ! $version =~ ^[0-9]+\.[0-9]+\.[0-9]+(\.[0-9]+)?$ ]]; then
    echo "❌ Invalid version format: $version (expected: X.Y.Z or X.Y.Z.BUILD)"
    exit 1
  fi
  update_version "$version"
  echo "$version"
}

# Main
case "${1:-}" in
  patch|minor|major|build)
    NEW_VERSION=$(bump_version "$1")
    echo "✅ Version bumped to: $NEW_VERSION"
    echo "$NEW_VERSION"
    ;;
  set)
    if [ -z "${2:-}" ]; then
      echo "❌ Usage: $0 set VERSION"
      exit 1
    fi
    NEW_VERSION=$(set_version "$2")
    echo "✅ Version set to: $NEW_VERSION"
    echo "$NEW_VERSION"
    ;;
  current|get)
    get_current_version
    ;;
  *)
    echo "Usage: $0 [patch|minor|major|build|set VERSION|current]"
    echo ""
    echo "Commands:"
    echo "  patch   - Bump patch version (1.2.3 -> 1.2.4)"
    echo "  minor   - Bump minor version (1.2.3 -> 1.3.0)"
    echo "  major   - Bump major version (1.2.3 -> 2.0.0)"
    echo "  build   - Bump build number (1.2.3.005 -> 1.2.3.006)"
    echo "  set     - Set version explicitly (1.2.3.005)"
    echo "  current - Show current version"
    exit 1
    ;;
esac
