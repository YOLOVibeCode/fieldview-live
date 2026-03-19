#!/bin/bash

###############################################################################
# DEBUG RAILWAY BUILD
# 
# Complete debugging workflow for Railway deployment failures
# Fetches Railway logs and compares with local build
#
# Usage:
#   ./scripts/debug-railway-build.sh
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Change to repo root
cd "$(dirname "$0")/.."

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    🔍 RAILWAY BUILD DEBUGGER                               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

###############################################################################
# Step 1: Check Railway CLI
###############################################################################
echo -e "${CYAN}━━━ Step 1: Checking Railway CLI ━━━${NC}"

if command -v railway &> /dev/null; then
    if railway whoami &>/dev/null; then
        RAILWAY_USER=$(railway whoami 2>/dev/null)
        echo -e "${GREEN}✅ Railway CLI logged in as: $RAILWAY_USER${NC}"
        RAILWAY_AVAILABLE=true
    else
        echo -e "${YELLOW}⚠️  Railway CLI not logged in. Run: railway login${NC}"
        RAILWAY_AVAILABLE=false
    fi
else
    echo -e "${YELLOW}⚠️  Railway CLI not installed. Install with: npm install -g @railway/cli${NC}"
    RAILWAY_AVAILABLE=false
fi
echo ""

###############################################################################
# Step 2: Fetch Railway errors (if available)
###############################################################################
echo -e "${CYAN}━━━ Step 2: Fetching Railway Build Errors ━━━${NC}"

if [ "$RAILWAY_AVAILABLE" = true ]; then
    echo -e "${YELLOW}📥 Fetching API build logs...${NC}"
    
    # Get API errors
    railway logs --service api 2>&1 | grep -i "error TS\|error:\|failed\|Error:" | head -30 > /tmp/railway-api-errors.txt 2>/dev/null || true
    
    API_ERROR_COUNT=$(wc -l < /tmp/railway-api-errors.txt | tr -d ' ')
    
    if [ "$API_ERROR_COUNT" -gt 0 ]; then
        echo -e "${RED}Found $API_ERROR_COUNT error lines in Railway API logs:${NC}"
        echo ""
        cat /tmp/railway-api-errors.txt | head -20
        if [ "$API_ERROR_COUNT" -gt 20 ]; then
            echo -e "${YELLOW}... and $((API_ERROR_COUNT - 20)) more errors${NC}"
        fi
    else
        echo -e "${GREEN}✅ No TypeScript errors in recent Railway API logs${NC}"
    fi
    
    echo ""
    echo -e "${YELLOW}📥 Fetching Web build logs...${NC}"
    
    # Get Web errors
    railway logs --service web 2>&1 | grep -i "error\|failed" | head -20 > /tmp/railway-web-errors.txt 2>/dev/null || true
    
    WEB_ERROR_COUNT=$(wc -l < /tmp/railway-web-errors.txt | tr -d ' ')
    
    if [ "$WEB_ERROR_COUNT" -gt 0 ]; then
        echo -e "${RED}Found $WEB_ERROR_COUNT error lines in Railway Web logs:${NC}"
        cat /tmp/railway-web-errors.txt | head -10
    else
        echo -e "${GREEN}✅ No errors in recent Railway Web logs${NC}"
    fi
else
    echo -e "${YELLOW}Skipping Railway log fetch (CLI not available)${NC}"
fi
echo ""

###############################################################################
# Step 3: Run local type check
###############################################################################
echo -e "${CYAN}━━━ Step 3: Running Local Type Check ━━━${NC}"

echo -e "${YELLOW}⚙️  Generating Prisma Client...${NC}"
pnpm --filter @fieldview/data-model exec prisma generate --schema=./prisma/schema.prisma 2>/dev/null

echo -e "${YELLOW}🏗️  Building data-model...${NC}"
pnpm --filter @fieldview/data-model build 2>/dev/null

echo -e "${YELLOW}🔍 Running type-check on API...${NC}"
pnpm --filter api type-check 2>&1 | tee /tmp/local-api-errors.txt || true

LOCAL_ERROR_COUNT=$(grep -c "error TS" /tmp/local-api-errors.txt 2>/dev/null || echo "0")

echo ""
if [ "$LOCAL_ERROR_COUNT" -gt 0 ]; then
    echo -e "${RED}━━━ Found $LOCAL_ERROR_COUNT TypeScript errors locally ━━━${NC}"
    echo ""
    grep "error TS" /tmp/local-api-errors.txt | head -15
    if [ "$LOCAL_ERROR_COUNT" -gt 15 ]; then
        echo -e "${YELLOW}... and $((LOCAL_ERROR_COUNT - 15)) more errors${NC}"
    fi
else
    echo -e "${GREEN}✅ No TypeScript errors locally!${NC}"
fi
echo ""

###############################################################################
# Step 4: Summary and recommendations
###############################################################################
echo -e "${CYAN}━━━ Step 4: Summary & Recommendations ━━━${NC}"
echo ""

if [ "$LOCAL_ERROR_COUNT" -gt 0 ]; then
    echo -e "${RED}╔════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ❌ BUILD WILL FAIL ON RAILWAY                                            ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}📝 Errors by file:${NC}"
    grep "error TS" /tmp/local-api-errors.txt | cut -d'(' -f1 | sort | uniq -c | sort -rn | head -10
    echo ""
    echo -e "${YELLOW}📝 Errors by type:${NC}"
    grep "error TS" /tmp/local-api-errors.txt | grep -oE "TS[0-9]+" | sort | uniq -c | sort -rn | head -5
    echo ""
    echo -e "${CYAN}💡 Next steps:${NC}"
    echo "   1. Fix each TypeScript error above"
    echo "   2. Re-run: pnpm --filter api type-check"
    echo "   3. When clean, run: ./scripts/preflight-build.sh"
    echo "   4. Then push: git push origin main"
else
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✅ LOCAL BUILD LOOKS GOOD                                                ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}💡 If Railway is still failing:${NC}"
    echo "   1. Run full preflight: ./scripts/preflight-build.sh"
    echo "   2. Check Railway logs manually: railway logs --service api"
    echo "   3. The issue may be environment-specific (check Railway vars)"
fi

echo ""
echo -e "${CYAN}━━━ Useful Commands ━━━${NC}"
echo ""
echo "  # See all API errors"
echo "  pnpm --filter api type-check"
echo ""
echo "  # Full preflight build"
echo "  ./scripts/preflight-build.sh"
echo ""
echo "  # Get Railway logs"
echo "  railway logs --service api | grep 'error TS'"
echo ""

