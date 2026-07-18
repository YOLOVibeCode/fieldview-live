#!/usr/bin/env bash
# Check Current Deployment Status
# 
# Shows deployment status for API and Web services
# Uses Railway CLI or provides Railway MCP instructions
#
# Usage:
#   ./scripts/check-deployment-status.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
API_DIR="$REPO_ROOT/apps/api"
WEB_DIR="$REPO_ROOT/apps/web"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    📊 Deployment Status Check                         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Railway CLI is linked (uses subshell so cwd is unchanged)
check_railway_link() {
  local dir=$1
  (cd "$dir" && railway status) &>/dev/null
}

# Get deployment status via CLI (runs in subshell so cwd stays same)
get_deployment_status_cli() {
  local service=$1
  local dir=$2
  
  if check_railway_link "$dir"; then
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}${service}:${NC}"
    (cd "$dir" && railway deployment list --service "$service" 2>&1 | head -10)
    echo ""
    return 0
  else
    return 1
  fi
}

# Check API status
echo -e "${YELLOW}Checking API deployment status...${NC}"
if get_deployment_status_cli "api" "$API_DIR"; then
  echo -e "${GREEN}✅ API status retrieved${NC}"
else
  echo -e "${YELLOW}⚠️  API not linked - use Railway MCP or: cd apps/api && railway link${NC}"
fi
echo ""

# Check Web status
echo -e "${YELLOW}Checking Web deployment status...${NC}"
if get_deployment_status_cli "web" "$WEB_DIR"; then
  echo -e "${GREEN}✅ Web status retrieved${NC}"
else
  echo -e "${YELLOW}⚠️  Web not linked - use Railway MCP or: cd apps/web && railway link${NC}"
fi
echo ""

# Railway MCP instructions when CLI not linked
if ! check_railway_link "$API_DIR" || ! check_railway_link "$WEB_DIR"; then
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}💡 Use Railway MCP + Browser MCP for deployment status:${NC}"
  echo ""
  echo -e "${GREEN}1.${NC} Open Cursor Composer (${YELLOW}Cmd+I${NC})"
  echo ""
  echo -e "${BLUE}Railway MCP (Infrastructure):${NC}"
  echo -e "${GREEN}2a.${NC} Ask: ${YELLOW}\"What's the current deployment status for API and Web services on Railway?\"${NC}"
  echo -e "${GREEN}   ${NC} Or: ${YELLOW}\"Show me the latest deployments for API and Web\"${NC}"
  echo ""
  echo -e "${BLUE}Browser MCP (Visual Verification):${NC}"
  echo -e "${GREEN}2b.${NC} Ask: ${YELLOW}\"Navigate to https://railway.app and show me the deployment status for fieldview-live project\"${NC}"
  echo -e "${GREEN}   ${NC} Or: ${YELLOW}\"Go to https://fieldview.live and verify it's working, then check https://api.fieldview.live/health\"${NC}"
  echo ""
  echo -e "${BLUE}What you'll get:${NC}"
  echo -e "  ✅ Railway MCP: Deployment status instantly"
  echo -e "  ✅ Browser MCP: Visual verification of production site"
  echo -e "  ✅ Combined: Complete deployment visibility"
  echo ""
fi

# Summary
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📋 Quick Status Check:${NC}"
echo ""
echo -e "${YELLOW}To check deployment status:${NC}"
echo -e "  ${GREEN}•${NC} Use Railway MCP in Composer: ${YELLOW}\"Show deployment status\"${NC}"
echo -e "  ${GREEN}•${NC} Use Browser MCP in Composer: ${YELLOW}\"Navigate to Railway dashboard and show deployments\"${NC}"
echo -e "  ${GREEN}•${NC} Or link CLI: ${CYAN}cd apps/api && railway link${NC} (then ${CYAN}cd apps/web && railway link${NC})"
echo ""
echo -e "${YELLOW}To monitor deployments in real-time:${NC}"
echo -e "  ${GREEN}•${NC} ${CYAN}./scripts/monitor-deployments-realtime.sh both${NC}"
echo -e "  ${GREEN}•${NC} Browser MCP: ${YELLOW}\"Navigate to Railway and monitor deployments\"${NC}"
echo ""
