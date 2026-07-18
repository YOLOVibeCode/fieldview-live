#!/bin/bash
###############################################################################
# Railway MCP Test Script
# 
# Quick verification that Railway MCP is working before using it for logs/errors
#
# Usage:
#   ./scripts/test-railway-mcp.sh
#
# Exit codes:
#   0 = Railway MCP is working
#   1 = Railway MCP not working or not configured
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                                            ║${NC}"
echo -e "${BLUE}║              🚂 Railway MCP Connection Test                               ║${NC}"
echo -e "${BLUE}║                                                                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

ERRORS=0

# Check 1: Railway CLI installed
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Step 1/5: Checking Railway CLI...${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if command -v railway &> /dev/null; then
    RAILWAY_VERSION=$(railway --version 2>&1 | head -1)
    echo -e "${GREEN}✅ Railway CLI installed: $RAILWAY_VERSION${NC}"
else
    echo -e "${RED}❌ Railway CLI not found${NC}"
    echo -e "${YELLOW}   Install with: npm install -g @railway/cli${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check 2: Railway CLI authenticated
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Step 2/5: Checking Railway authentication...${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if railway whoami &> /dev/null; then
    RAILWAY_USER=$(railway whoami 2>&1 | grep -o "Logged in as [^👋]*" | sed 's/Logged in as //' || echo "authenticated")
    echo -e "${GREEN}✅ Railway CLI authenticated: $RAILWAY_USER${NC}"
else
    echo -e "${RED}❌ Railway CLI not authenticated${NC}"
    echo -e "${YELLOW}   Run: railway login${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check 3: Railway MCP package available
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Step 3/5: Checking Railway MCP package...${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

MCP_VERSION=$(npm view @railway/mcp-server version 2>/dev/null || echo "")
if [ -n "$MCP_VERSION" ]; then
    echo -e "${GREEN}✅ Railway MCP package available: v$MCP_VERSION${NC}"
else
    echo -e "${RED}❌ Railway MCP package not found${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check 4: Railway MCP processes running
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Step 4/5: Checking Railway MCP processes...${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

MCP_PROCESSES=$(ps aux | grep -c "railway-mcp-server" | grep -v grep || echo "0")
if [ "$MCP_PROCESSES" -gt 0 ]; then
    echo -e "${GREEN}✅ Railway MCP processes running: $MCP_PROCESSES active${NC}"
else
    echo -e "${YELLOW}⚠️  No Railway MCP processes found${NC}"
    echo -e "${YELLOW}   This is OK if Cursor hasn't started the MCP server yet${NC}"
    echo -e "${YELLOW}   MCP will start automatically when you use Cursor Composer${NC}"
fi
echo ""

# Check 5: Cursor MCP configuration
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Step 5/5: Checking Cursor MCP configuration...${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ -f ~/.cursor/mcp.json ]; then
    if grep -q "railway" ~/.cursor/mcp.json && grep -q "@railway/mcp-server" ~/.cursor/mcp.json; then
        echo -e "${GREEN}✅ Railway MCP configured in Cursor${NC}"
        
        # Check if using full path
        if grep -q "/opt/homebrew/bin/npx" ~/.cursor/mcp.json || grep -q "/usr/local/bin/npx" ~/.cursor/mcp.json; then
            echo -e "${GREEN}✅ Using full path (recommended)${NC}"
        else
            echo -e "${YELLOW}⚠️  Using relative path (may need full path)${NC}"
        fi
    else
        echo -e "${RED}❌ Railway MCP not found in Cursor config${NC}"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${RED}❌ Cursor MCP config file not found${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Summary
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                                            ║${NC}"
    echo -e "${GREEN}║  ✅ Railway MCP is Ready!                                                 ║${NC}"
    echo -e "${GREEN}║                                                                            ║${NC}"
    echo -e "${GREEN}║  To use Railway MCP:                                                       ║${NC}"
    echo -e "${GREEN}║    1. Open Cursor Composer (Cmd+I)                                       ║${NC}"
    echo -e "${GREEN}║    2. Ask: \"Get the latest API logs from Railway\"                        ║${NC}"
    echo -e "${GREEN}║    3. Or: \"Show me errors from the web service\"                          ║${NC}"
    echo -e "${GREEN}║                                                                            ║${NC}"
    echo -e "${GREEN}║  Quick Commands:                                                          ║${NC}"
    echo -e "${GREEN}║    • \"Get latest API logs\"                                               ║${NC}"
    echo -e "${GREEN}║    • \"Show deployment status\"                                            ║${NC}"
    echo -e "${GREEN}║    • \"Get errors from last hour\"                                         ║${NC}"
    echo -e "${GREEN}║                                                                            ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════════════════╝${NC}"
    exit 0
else
    echo -e "${RED}╔════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                                                                            ║${NC}"
    echo -e "${RED}║  ❌ Railway MCP Not Ready ($ERRORS issue(s) found)                        ║${NC}"
    echo -e "${RED}║                                                                            ║${NC}"
    echo -e "${RED}║  Fix the issues above, then run this script again                         ║${NC}"
    echo -e "${RED}║                                                                            ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════════════════════╝${NC}"
    exit 1
fi
