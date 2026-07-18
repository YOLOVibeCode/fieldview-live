#!/bin/bash

# ============================================
# Veo Discovery E2E Test Runner
# ============================================
#
# Runs the complete Veo Discovery E2E test suite
# with various configurations and generates reports.
#
# Usage:
#   ./scripts/test-veo-discovery-e2e.sh             # Run all scenarios
#   ./scripts/test-veo-discovery-e2e.sh --headed    # Run with visible browser
#   ./scripts/test-veo-discovery-e2e.sh --scenario1 # Run only Scenario 1
#   ./scripts/test-veo-discovery-e2e.sh --ci        # CI mode (no video)
#
# Prerequisites:
#   - API running on http://localhost:4301
#   - Web running on http://localhost:4300
#   - Database migrated with freemium/abuse tables
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:4301}"
WEB_URL="${WEB_URL:-http://localhost:4300}"
TEST_FILE="tests/e2e/veo-discovery-complete-flow.spec.ts"
REPORT_DIR="test-results/veo-discovery"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Veo Discovery E2E Test Suite${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "API URL: ${GREEN}${API_URL}${NC}"
echo -e "WEB URL: ${GREEN}${WEB_URL}${NC}"
echo ""

# Parse arguments
HEADED=""
GREP=""
CI_MODE=""
DEBUG=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --headed)
      HEADED="--headed"
      shift
      ;;
    --scenario1)
      GREP="--grep 'Scenario 1'"
      shift
      ;;
    --scenario2)
      GREP="--grep 'Scenario 2'"
      shift
      ;;
    --scenario3)
      GREP="--grep 'Scenario 3'"
      shift
      ;;
    --scenario4)
      GREP="--grep 'Scenario 4'"
      shift
      ;;
    --scenario5)
      GREP="--grep 'Scenario 5'"
      shift
      ;;
    --scenario6)
      GREP="--grep 'Scenario 6'"
      shift
      ;;
    --ci)
      CI_MODE="--reporter=github"
      shift
      ;;
    --debug)
      DEBUG="--debug"
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Check if services are running
echo -e "${YELLOW}Checking services...${NC}"

check_service() {
  local url=$1
  local name=$2
  
  if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "2[0-9][0-9]\|404"; then
    echo -e "  ✅ ${name} is running"
    return 0
  else
    echo -e "  ❌ ${name} is NOT running at ${url}"
    return 1
  fi
}

API_RUNNING=true
WEB_RUNNING=true

check_service "${API_URL}/health" "API" || API_RUNNING=false
check_service "${WEB_URL}" "Web" || WEB_RUNNING=false

echo ""

if [ "$API_RUNNING" = false ] || [ "$WEB_RUNNING" = false ]; then
  echo -e "${YELLOW}Starting services...${NC}"
  echo ""
  echo -e "  Run in separate terminals:"
  echo -e "    ${GREEN}cd apps/api && pnpm dev${NC}"
  echo -e "    ${GREEN}cd apps/web && pnpm dev${NC}"
  echo ""
  echo -e "  Or let Playwright start them (slower):"
  echo -e "    ${GREEN}The test will attempt to start services automatically${NC}"
  echo ""
fi

# Create report directory
mkdir -p "$REPORT_DIR"

# Run tests
echo -e "${YELLOW}Running E2E tests...${NC}"
echo ""

# Export env vars
export NEXT_PUBLIC_API_URL="$API_URL"
export WEB_URL="$WEB_URL"

# Build command
CMD="pnpm --filter web exec playwright test ${TEST_FILE} ${HEADED} ${GREP} ${CI_MODE} ${DEBUG}"

echo -e "${BLUE}Command: ${CMD}${NC}"
echo ""

# Run Playwright
if eval $CMD; then
  echo ""
  echo -e "${GREEN}========================================${NC}"
  echo -e "${GREEN}   ALL TESTS PASSED! ✅${NC}"
  echo -e "${GREEN}========================================${NC}"
  
  # Show report location
  echo ""
  echo -e "View HTML report: ${BLUE}npx playwright show-report${NC}"
else
  echo ""
  echo -e "${RED}========================================${NC}"
  echo -e "${RED}   SOME TESTS FAILED ❌${NC}"
  echo -e "${RED}========================================${NC}"
  
  echo ""
  echo -e "View HTML report: ${BLUE}npx playwright show-report${NC}"
  echo -e "View trace: ${BLUE}npx playwright show-trace test-results/trace.zip${NC}"
  
  exit 1
fi

# ============================================
# TEST SCENARIOS COVERED
# ============================================
#
# SCENARIO 1: Free Stream Flow (Coach Trial)
#   ✓ Welcome modal via ?ref=veo
#   ✓ Owner registration
#   ✓ Free game creation (no paywall)
#   ✓ Freemium counter tracking
#   ✓ Viewer free access
#
# SCENARIO 2: Paid Stream Flow (Monetization)
#   ✓ Paid game creation (with paywall)
#   ✓ Paywall modal display
#   ✓ Payment flow (Square)
#   ✓ Entitlement delivery
#
# SCENARIO 3: Abuse Detection Flow
#   ✓ Fingerprint tracking
#   ✓ First warning message
#   ✓ Abuse detection modal
#   ✓ One-time pass acceptance
#   ✓ Final block enforcement
#
# SCENARIO 4: Freemium Limit Enforcement
#   ✓ 5 free game limit
#   ✓ Limit reached message
#   ✓ Options after limit
#   ✓ Paid games still allowed
#
# SCENARIO 5: IP-Lock Enforcement
#   ✓ First access IP lock
#   ✓ Different IP blocked
#   ✓ Grace period for network switch
#
# SCENARIO 6: Welcome Modal Configurations
#   ✓ First visit auto-show
#   ✓ "Don't show again" persistence
#   ✓ ?ref=veo override
#
