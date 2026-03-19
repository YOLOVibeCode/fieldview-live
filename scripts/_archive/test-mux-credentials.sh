#!/bin/bash
# Quick Mux Credentials Test Script
# Tests if your Mux API credentials work

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Mux Credentials Test${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Get credentials from user
read -p "Enter your MUX_TOKEN_ID: " MUX_TOKEN_ID
read -p "Enter your MUX_TOKEN_SECRET: " MUX_TOKEN_SECRET

echo ""
echo -e "${BLUE}Testing Mux API connection...${NC}"
echo ""

# Test API connection
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -u "${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}" \
  https://api.mux.com/video/v1/live-streams?limit=1)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ Success!${NC} Your Mux credentials are valid."
  echo ""
  echo -e "${GREEN}✓ You can connect to Mux API${NC}"
  echo -e "${GREEN}✓ Ready to create live streams${NC}"
  echo ""
  
  # Show existing streams if any
  STREAM_COUNT=$(echo "$BODY" | grep -o '"id"' | wc -l | tr -d ' ')
  if [ "$STREAM_COUNT" -gt 0 ]; then
    echo -e "${BLUE}You have $STREAM_COUNT existing live stream(s)${NC}"
  else
    echo -e "${BLUE}No existing live streams${NC}"
  fi
  
  echo ""
  echo -e "${GREEN}Your credentials are working! ✅${NC}"
  echo ""
  echo "You can use these in Railway:"
  echo "  MUX_TOKEN_ID=$MUX_TOKEN_ID"
  echo "  MUX_TOKEN_SECRET=$MUX_TOKEN_SECRET"
  
  exit 0
else
  echo -e "${RED}✗ Failed${NC} (HTTP $HTTP_CODE)"
  echo ""
  echo "Error details:"
  echo "$BODY" | grep -o '"error"[^}]*' || echo "$BODY"
  echo ""
  echo -e "${RED}Your Mux credentials appear to be invalid.${NC}"
  echo ""
  echo "Please check:"
  echo "  1. Token ID is correct"
  echo "  2. Token Secret is correct"
  echo "  3. Tokens are from the correct Mux environment"
  echo ""
  echo "Get your credentials from: https://dashboard.mux.com/settings/access-tokens"
  
  exit 1
fi

