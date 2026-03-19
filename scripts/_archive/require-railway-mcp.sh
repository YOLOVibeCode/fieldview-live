#!/usr/bin/env bash
# Require Railway MCP Verification Before CLI Access
# This script enforces MCP-first approach - CLI is only available if MCP fails
#
# Usage:
#   source ./scripts/require-railway-mcp.sh
#   # Or use as a check:
#   ./scripts/require-railway-mcp.sh && railway logs --service api

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if Railway MCP is available
check_railway_mcp() {
  local mcp_available=false
  
  # Check 1: Railway CLI installed
  if ! command -v railway &> /dev/null; then
    return 1
  fi
  
  # Check 2: Railway CLI authenticated
  if ! railway whoami &> /dev/null; then
    return 1
  fi
  
  # Check 3: Railway MCP package available
  if ! npm view @railway/mcp-server version &> /dev/null; then
    return 1
  fi
  
  # Check 4: MCP configured in Cursor
  if [ -f ~/.cursor/mcp.json ]; then
    if grep -q "railway" ~/.cursor/mcp.json && grep -q "@railway/mcp-server" ~/.cursor/mcp.json; then
      mcp_available=true
    fi
  fi
  
  # Check 5: MCP configured in Claude Desktop
  if [ -f ~/Library/Application\ Support/Claude/claude_desktop_config.json ]; then
    if grep -q "railway" ~/Library/Application\ Support/Claude/claude_desktop_config.json && \
       grep -q "@railway/mcp-server" ~/Library/Application\ Support/Claude/claude_desktop_config.json; then
      mcp_available=true
    fi
  fi
  
  if [ "$mcp_available" = true ]; then
    return 0
  else
    return 1
  fi
}

# Main function
require_railway_mcp() {
  if check_railway_mcp; then
    echo -e "${GREEN}✅ Railway MCP is available${NC}"
    echo -e "${YELLOW}⚠️  You should use Railway MCP instead of CLI${NC}"
    echo ""
    echo -e "${BLUE}To use Railway MCP:${NC}"
    echo -e "  ${GREEN}1.${NC} Open Cursor Composer (${YELLOW}Cmd+I${NC})"
    echo -e "  ${GREEN}2.${NC} Ask: ${YELLOW}\"Get Railway API logs\"${NC}"
    echo ""
    echo -e "${YELLOW}CLI access is blocked. Use Railway MCP via Composer.${NC}"
    return 1  # Block CLI access
  else
    echo -e "${RED}❌ Railway MCP is not available${NC}"
    echo -e "${YELLOW}⚠️  CLI fallback allowed (MCP not configured)${NC}"
    echo ""
    echo -e "${BLUE}To enable Railway MCP:${NC}"
    echo -e "  ${GREEN}1.${NC} Run: ${YELLOW}./scripts/test-railway-mcp.sh${NC}"
    echo -e "  ${GREEN}2.${NC} Fix any issues shown"
    echo -e "  ${GREEN}3.${NC} Restart Cursor/Claude Desktop"
    echo ""
    return 0  # Allow CLI fallback only if MCP unavailable
  fi
}

# If run as script (not sourced), execute check
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
  if require_railway_mcp; then
    exit 0  # MCP not available, CLI allowed
  else
    exit 1  # MCP available, CLI blocked
  fi
fi
