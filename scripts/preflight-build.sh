#!/bin/bash

###############################################################################
# PREFLIGHT BUILD - Railway Build Simulator
# 
# Replicates EXACTLY what Railway does during deployment
# Run this BEFORE every push to catch errors locally
#
# Usage:
#   ./scripts/preflight-build.sh
#
# Exit codes:
#   0 = Success (safe to deploy)
#   1 = Build failed (fix errors before pushing)
###############################################################################

set -e  # Exit on any error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script start time
START_TIME=$(date +%s)

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                                            ║${NC}"
echo -e "${BLUE}║              🚀 PREFLIGHT BUILD - Railway Simulator                        ║${NC}"
echo -e "${BLUE}║                                                                            ║${NC}"
echo -e "${BLUE}║   This replicates EXACTLY what Railway does during deployment             ║${NC}"
echo -e "${BLUE}║   If this passes, Railway will pass                                        ║${NC}"
echo -e "${BLUE}║                                                                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Change to repo root
cd "$(dirname "$0")/.."

###############################################################################
# Step 1: Clean (simulate fresh Railway environment)
###############################################################################
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📦 Step 1/6: Cleaning build artifacts...${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

rm -rf apps/api/dist 2>/dev/null || true
rm -rf apps/web/.next 2>/dev/null || true
rm -rf packages/data-model/dist 2>/dev/null || true
echo -e "${GREEN}✅ Cleaned build artifacts${NC}"
echo ""

###############################################################################
# Step 2: Install dependencies (like Railway does)
###############################################################################
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📦 Step 2/6: Installing dependencies (frozen lockfile)...${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

pnpm install --frozen-lockfile
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

###############################################################################
# Step 3: Generate Prisma Client (CRITICAL - most common failure point)
###############################################################################
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}⚙️  Step 3/6: Generating Prisma Client...${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

pnpm --filter @fieldview/data-model exec prisma generate --schema=./prisma/schema.prisma
echo -e "${GREEN}✅ Prisma Client generated${NC}"
echo ""

###############################################################################
# Step 4: Build data-model package (required for API/Web)
###############################################################################
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🏗️  Step 4/6: Building data-model package...${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

pnpm --filter @fieldview/data-model build
echo -e "${GREEN}✅ data-model built${NC}"
echo ""

###############################################################################
# Step 5: Build API (where most TypeScript errors occur)
###############################################################################
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🏗️  Step 5/6: Building API...${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if pnpm --filter api build; then
    echo -e "${GREEN}✅ API built successfully${NC}"
else
    echo ""
    echo -e "${RED}╔════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ❌ API BUILD FAILED                                                       ║${NC}"
    echo -e "${RED}║                                                                            ║${NC}"
    echo -e "${RED}║  Fix the TypeScript errors above before pushing to Railway               ║${NC}"
    echo -e "${RED}║                                                                            ║${NC}"
    echo -e "${RED}║  Quick fix:                                                               ║${NC}"
    echo -e "${RED}║    pnpm --filter api type-check   # See all errors                        ║${NC}"
    echo -e "${RED}║    Fix each error, then re-run this script                                ║${NC}"
    echo -e "${RED}║                                                                            ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════════════════════╝${NC}"
    exit 1
fi
echo ""

###############################################################################
# Step 6: Build Web (usually passes, but check anyway)
###############################################################################
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🏗️  Step 6/6: Building Web...${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if pnpm --filter web build; then
    echo -e "${GREEN}✅ Web built successfully${NC}"
else
    echo ""
    echo -e "${RED}╔════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ❌ WEB BUILD FAILED                                                       ║${NC}"
    echo -e "${RED}║                                                                            ║${NC}"
    echo -e "${RED}║  Fix the errors above before pushing to Railway                           ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════════════════════╝${NC}"
    exit 1
fi
echo ""

###############################################################################
# Success!
###############################################################################
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo -e "${GREEN}╔════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                                            ║${NC}"
echo -e "${GREEN}║  ✅ PREFLIGHT BUILD SUCCESSFUL!                                           ║${NC}"
echo -e "${GREEN}║                                                                            ║${NC}"
echo -e "${GREEN}║  All builds passed in ${DURATION} seconds                                        ║${NC}"
echo -e "${GREEN}║                                                                            ║${NC}"
echo -e "${GREEN}║  ✅ Prisma Client: Generated                                              ║${NC}"
echo -e "${GREEN}║  ✅ data-model:    Built                                                  ║${NC}"
echo -e "${GREEN}║  ✅ API:           Built                                                  ║${NC}"
echo -e "${GREEN}║  ✅ Web:           Built                                                  ║${NC}"
echo -e "${GREEN}║                                                                            ║${NC}"
echo -e "${GREEN}║  🚀 SAFE TO DEPLOY TO RAILWAY                                             ║${NC}"
echo -e "${GREEN}║                                                                            ║${NC}"
echo -e "${GREEN}║  Next steps:                                                              ║${NC}"
echo -e "${GREEN}║    git add -A && git commit -m \"your message\" && git push origin main    ║${NC}"
echo -e "${GREEN}║                                                                            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

