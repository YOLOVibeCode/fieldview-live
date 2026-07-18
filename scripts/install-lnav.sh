#!/usr/bin/env bash
# Install lnav (Log Navigator) for powerful log analysis
#
# Usage:
#   ./scripts/install-lnav.sh

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Installing lnav (Log Navigator)...${NC}"
echo ""

# Detect OS
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  if command -v brew &> /dev/null; then
    echo -e "${GREEN}Installing via Homebrew...${NC}"
    brew install lnav
  else
    echo -e "${YELLOW}Homebrew not found. Install manually:${NC}"
    echo "  brew install lnav"
    exit 1
  fi
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  # Linux
  if command -v apt-get &> /dev/null; then
    echo -e "${GREEN}Installing via apt...${NC}"
    sudo apt-get update
    sudo apt-get install -y lnav
  elif command -v yum &> /dev/null; then
    echo -e "${GREEN}Installing via yum...${NC}"
    sudo yum install -y lnav
  else
    echo -e "${YELLOW}Package manager not found. Install manually:${NC}"
    echo "  apt-get install lnav  # Debian/Ubuntu"
    echo "  yum install lnav       # RHEL/CentOS"
    exit 1
  fi
else
  echo -e "${YELLOW}Unsupported OS: $OSTYPE${NC}"
  echo "Install lnav manually from: https://lnav.org/"
  exit 1
fi

echo ""
echo -e "${GREEN}✅ lnav installed successfully!${NC}"
echo ""
echo -e "${BLUE}Test installation:${NC}"
lnav --version
echo ""
echo -e "${BLUE}Usage:${NC}"
echo "  ./scripts/debug-railway-logs.sh api 1000"
