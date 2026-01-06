#!/bin/bash
# Run E2E Chat Tests with Full Conversation Simulation
#
# This script:
# 1. Ensures services are running
# 2. Sets up test data
# 3. Runs Playwright E2E tests simulating real conversations
# 4. Cleans up test data

set -e

echo "🧪 Game Chat E2E Test Runner"
echo "============================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if services are running
echo "📡 Checking services..."

API_URL="${API_URL:-http://localhost:4301}"
WEB_URL="${WEB_URL:-http://localhost:4300}"

if ! curl -sf "$API_URL/health" > /dev/null 2>&1; then
  echo -e "${RED}✗ API server not running at $API_URL${NC}"
  echo "  Start it with: cd apps/api && pnpm dev"
  exit 1
fi
echo -e "${GREEN}✓ API server running${NC}"

if ! curl -sf "$WEB_URL" > /dev/null 2>&1; then
  echo -e "${RED}✗ Web server not running at $WEB_URL${NC}"
  echo "  Start it with: cd apps/web && pnpm dev"
  exit 1
fi
echo -e "${GREEN}✓ Web server running${NC}"

echo ""
echo "🎭 Installing Playwright browsers (if needed)..."
cd apps/web
npx playwright install chromium firefox webkit --with-deps

echo ""
echo "🚀 Running E2E tests..."
echo ""
echo -e "${YELLOW}Tests will simulate:${NC}"
echo "  - Two viewers having a conversation"
echo "  - Three-way chat"
echo "  - Late joiners seeing message history"
echo "  - Identity persistence across refreshes"
echo ""

# Run the tests
export WEB_URL="$WEB_URL"
export API_URL="$API_URL"

npx playwright test game-chat.spec.ts --reporter=list

TEST_EXIT_CODE=$?

echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✅ All E2E tests passed!${NC}"
  echo ""
  echo "Test results:"
  echo "  - Full conversation between viewers ✓"
  echo "  - Real-time message delivery ✓"
  echo "  - Message persistence ✓"
  echo "  - Character limits ✓"
  echo "  - Empty message prevention ✓"
  echo ""
  echo "View detailed report:"
  echo "  npx playwright show-report"
else
  echo -e "${RED}✗ Some E2E tests failed${NC}"
  echo ""
  echo "View test results:"
  echo "  cd apps/web"
  echo "  npx playwright show-report"
  exit 1
fi

