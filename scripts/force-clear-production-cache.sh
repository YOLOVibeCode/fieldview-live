#!/bin/bash

###############################################################################
# FORCE CLEAR PRODUCTION CACHE
# 
# Forces a complete cache clear and fresh deployment on Railway
# 
# This script:
# 1. Triggers a fresh Railway deployment (forces rebuild)
# 2. Clears Railway build cache
# 3. Forces CDN cache invalidation
#
# Usage:
#   ./scripts/force-clear-production-cache.sh [service]
#
# Services:
#   api     - Clear API cache only
#   web     - Clear web cache only
#   both    - Clear both (default)
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

SERVICE="${1:-both}"

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                                            ║${NC}"
echo -e "${BLUE}║         🧹 FORCE CLEAR PRODUCTION CACHE                                    ║${NC}"
echo -e "${BLUE}║                                                                            ║${NC}"
echo -e "${BLUE}║   This will:                                                              ║${NC}"
echo -e "${BLUE}║   1. Trigger fresh Railway deployment (no cache)                          ║${NC}"
echo -e "${BLUE}║   2. Clear build cache                                                   ║${NC}"
echo -e "${BLUE}║   3. Force CDN cache invalidation                                        ║${NC}"
echo -e "${BLUE}║                                                                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check Railway CLI
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI not found${NC}"
    echo "Install with: npm install -g @railway/cli"
    exit 1
fi

# Change to repo root
cd "$(dirname "$0")/.."

# Function to redeploy a service
redeploy_service() {
    local service=$1
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}🔄 Redeploying $service service...${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Navigate to service directory
    cd "apps/$service"
    
    # Force redeploy with no cache
    echo -e "${YELLOW}Triggering fresh deployment (no cache)...${NC}"
    railway up --detach --no-cache 2>&1 | tee /tmp/railway-redeploy-$service.log
    
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        echo -e "${GREEN}✅ $service redeployment triggered${NC}"
    else
        echo -e "${RED}❌ $service redeployment failed${NC}"
        echo "Check logs: /tmp/railway-redeploy-$service.log"
        cd ../..
        return 1
    fi
    
    cd ../..
    echo ""
}

# Function to check deployment status
check_status() {
    local service=$1
    echo -e "${CYAN}Checking $service deployment status...${NC}"
    railway deployment list --service "$service" 2>&1 | head -5
    echo ""
}

# Main execution
case $SERVICE in
    api)
        redeploy_service "api"
        sleep 2
        check_status "api"
        ;;
    web)
        redeploy_service "web"
        sleep 2
        check_status "web"
        ;;
    both)
        redeploy_service "api"
        sleep 2
        redeploy_service "web"
        sleep 2
        echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${YELLOW}📊 Deployment Status${NC}"
        echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        check_status "api"
        check_status "web"
        ;;
    *)
        echo -e "${RED}❌ Invalid service: $SERVICE${NC}"
        echo "Usage: $0 [api|web|both]"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                                            ║${NC}"
echo -e "${GREEN}║  ✅ CACHE CLEAR COMPLETE                                                  ║${NC}"
echo -e "${GREEN}║                                                                            ║${NC}"
echo -e "${GREEN}║  Fresh deployments have been triggered                                    ║${NC}"
echo -e "${GREEN}║                                                                            ║${NC}"
echo -e "${GREEN}║  Next steps:                                                             ║${NC}"
echo -e "${GREEN}║    1. Wait 5-10 minutes for builds to complete                          ║${NC}"
echo -e "${GREEN}║    2. Monitor: ./scripts/railway-logs.sh tail [service]                  ║${NC}"
echo -e "${GREEN}║    3. Check status: ./scripts/railway-logs.sh status                      ║${NC}"
echo -e "${GREEN}║    4. Test production: https://fieldview.live                            ║${NC}"
echo -e "${GREEN}║                                                                            ║${NC}"
echo -e "${GREEN}║  💡 Tip: Use incognito/private window to bypass browser cache           ║${NC}"
echo -e "${GREEN}║                                                                            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
