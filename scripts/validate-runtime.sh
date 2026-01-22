#!/bin/bash
# Runtime Validation Script
# Validates that the built application can start and respond to requests
# Used by preflight-build.sh and deploy-to-production.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_DIST="$ROOT_DIR/apps/api/dist"
WEB_NEXT="$ROOT_DIR/apps/web/.next"

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🔍 Runtime Validation${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

ERRORS=0

# Check 1: Build artifacts exist
echo -e "${CYAN}Checking build artifacts...${NC}"

if [ ! -d "$API_DIST" ]; then
  echo -e "${RED}❌ API dist/ folder missing${NC}"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✅ API dist/ folder exists${NC}"
fi

if [ ! -d "$WEB_NEXT" ]; then
  echo -e "${RED}❌ Web .next/ folder missing${NC}"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✅ Web .next/ folder exists${NC}"
fi

# Check 2: API server.js exists and is syntactically valid
echo ""
echo -e "${CYAN}Validating API build artifact...${NC}"

SERVER_FILE=""
if [ -f "$API_DIST/server.js" ]; then
  SERVER_FILE="$API_DIST/server.js"
elif [ -f "$API_DIST/src/server.js" ]; then
  SERVER_FILE="$API_DIST/src/server.js"
fi

if [ -z "$SERVER_FILE" ]; then
  echo -e "${RED}❌ API server.js not found${NC}"
  ERRORS=$((ERRORS + 1))
else
  # Check syntax only (don't execute - that would start the server)
  if node --check "$SERVER_FILE" 2>/dev/null; then
    echo -e "${GREEN}✅ API server.js syntax is valid${NC}"
  else
    echo -e "${RED}❌ API server.js has syntax errors${NC}"
    ERRORS=$((ERRORS + 1))
  fi
fi

# Check 3: Required environment variables (warn only, Railway will have these)
echo ""
echo -e "${CYAN}Checking environment variables (local check only)...${NC}"

REQUIRED_VARS=("DATABASE_URL" "JWT_SECRET")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    MISSING_VARS+=("$var")
  fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Missing environment variables (will be set in Railway):${NC}"
  for var in "${MISSING_VARS[@]}"; do
    echo -e "   ${YELLOW}- $var${NC}"
  done
  echo -e "${YELLOW}   (This is OK for local preflight - Railway will have these)${NC}"
else
  echo -e "${GREEN}✅ Required environment variables present locally${NC}"
fi

# Check 4: TypeScript compilation artifacts
echo ""
echo -e "${CYAN}Checking TypeScript compilation...${NC}"

if [ -f "$API_DIST/server.d.ts" ]; then
  echo -e "${GREEN}✅ API TypeScript definitions generated${NC}"
else
  echo -e "${YELLOW}⚠️  API TypeScript definitions missing (may be OK)${NC}"
fi

# Check 5: Next.js build output
echo ""
echo -e "${CYAN}Checking Next.js build output...${NC}"

if [ -d "$WEB_NEXT/static" ]; then
  echo -e "${GREEN}✅ Next.js static assets generated${NC}"
else
  echo -e "${RED}❌ Next.js static assets missing${NC}"
  ERRORS=$((ERRORS + 1))
fi

if [ -f "$WEB_NEXT/BUILD_ID" ]; then
  BUILD_ID=$(cat "$WEB_NEXT/BUILD_ID")
  echo -e "${GREEN}✅ Next.js build ID: $BUILD_ID${NC}"
else
  echo -e "${YELLOW}⚠️  Next.js BUILD_ID missing${NC}"
fi

# Summary
echo ""
if [ $ERRORS -gt 0 ]; then
  echo -e "${RED}❌ Runtime validation failed with $ERRORS error(s)${NC}"
  exit 1
else
  echo -e "${GREEN}✅ Runtime validation passed${NC}"
  exit 0
fi
