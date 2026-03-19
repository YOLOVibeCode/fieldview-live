#!/bin/bash

###############################################################################
# Railway GraphQL API - Quick Test
# 
# Tests Railway GraphQL API connectivity and token validity
# No Railway CLI required - pure GraphQL approach
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Railway GraphQL API - Quick Connection Test                         ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check for token
if [ -z "$RAILWAY_API_TOKEN" ]; then
    echo -e "${RED}❌ RAILWAY_API_TOKEN not set${NC}"
    echo ""
    echo -e "${YELLOW}Setup:${NC}"
    echo "  1. Go to: https://railway.app/account/tokens"
    echo "  2. Create new token"
    echo "  3. Export: export RAILWAY_API_TOKEN='your_token_here'"
    echo ""
    exit 1
fi

echo -e "${CYAN}🔑 Token found (${#RAILWAY_API_TOKEN} chars)${NC}"
echo ""

# Test 1: Simple GraphQL query
echo -e "${CYAN}📡 Testing GraphQL API connectivity...${NC}"

# Get current user (simple auth check)
QUERY='{"query":"query { me { id email name } }"}'

RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $RAILWAY_API_TOKEN" \
  -d "$QUERY" \
  https://backboard.railway.app/graphql/v2)

# Check for errors
if echo "$RESPONSE" | grep -q "errors"; then
    echo -e "${RED}❌ GraphQL API Error:${NC}"
    echo "$RESPONSE" | jq '.'
    exit 1
fi

# Extract user info
USER_EMAIL=$(echo "$RESPONSE" | jq -r '.data.me.email // "N/A"')
USER_NAME=$(echo "$RESPONSE" | jq -r '.data.me.name // "N/A"')

if [ "$USER_EMAIL" != "N/A" ]; then
    echo -e "${GREEN}✅ Connected!${NC}"
    echo -e "${CYAN}   Email: ${USER_EMAIL}${NC}"
    echo -e "${CYAN}   Name: ${USER_NAME}${NC}"
else
    echo -e "${RED}❌ Failed to authenticate${NC}"
    exit 1
fi

echo ""

# Test 2: List projects (if PROJECT_ID is set)
if [ -n "$RAILWAY_PROJECT_ID" ]; then
    echo -e "${CYAN}📊 Fetching project info...${NC}"
    
    PROJECT_QUERY="{\"query\":\"query GetProject(\$projectId: String!) { project(id: \$projectId) { id name description } }\",\"variables\":{\"projectId\":\"$RAILWAY_PROJECT_ID\"}}"
    
    PROJECT_RESPONSE=$(curl -s -X POST \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $RAILWAY_API_TOKEN" \
      -d "$PROJECT_QUERY" \
      https://backboard.railway.app/graphql/v2)
    
    PROJECT_NAME=$(echo "$PROJECT_RESPONSE" | jq -r '.data.project.name // "N/A"')
    
    if [ "$PROJECT_NAME" != "N/A" ]; then
        echo -e "${GREEN}✅ Project: ${PROJECT_NAME}${NC}"
        echo -e "${CYAN}   ID: ${RAILWAY_PROJECT_ID}${NC}"
    else
        echo -e "${YELLOW}⚠️  Could not fetch project (check PROJECT_ID)${NC}"
    fi
else
    echo -e "${YELLOW}ℹ️  Set RAILWAY_PROJECT_ID to test project queries${NC}"
    echo -e "${CYAN}   Get it from: https://railway.app (project URL)${NC}"
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Railway GraphQL API is working!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo "  • Run full POC: node scripts/railway-logs-graphql.js"
echo "  • Read guide: scripts/RAILWAY_LOGS_POC.md"
echo ""

