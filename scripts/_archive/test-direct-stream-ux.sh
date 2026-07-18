#!/bin/bash
#
# Direct Stream UX Test Execution Script
# Prepares environment, seeds data, and runs tests
#

set -e  # Exit on error

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   Direct Stream Complete UX Test Execution                    ║"
echo "║   Test Scenario: Friday Night Varsity Basketball Game         ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if services are running
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Pre-Flight Checks"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check Docker services
echo -ne "🐳 Checking Docker services... "
if docker compose ps | grep -q "fieldview-postgres.*Up"; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${RED}✗${NC}"
  echo -e "${YELLOW}Starting Docker services...${NC}"
  docker compose up -d postgres redis mailpit
  sleep 5
fi

# Check API service
echo -ne "🚀 Checking API service (localhost:4301)... "
if curl -s http://localhost:4301/health > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${RED}✗${NC}"
  echo -e "${YELLOW}API not running. Please start with: cd apps/api && pnpm dev${NC}"
  exit 1
fi

# Check Web service
echo -ne "🌐 Checking Web service (localhost:4300)... "
if curl -s http://localhost:4300 > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${RED}✗${NC}"
  echo -e "${YELLOW}Web not running. Please start with: cd apps/web && pnpm dev${NC}"
  exit 1
fi

# Check Mailpit
echo -ne "📧 Checking Mailpit (localhost:4304)... "
if curl -s http://localhost:4304 > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${YELLOW}⚠${NC} Mailpit not accessible (email tests may fail)"
fi

echo ""

# Clean previous test data
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧹 Cleaning Previous Test Data"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Deleting previous test streams..."
docker exec fieldview-postgres psql -U fieldview -d fieldview_dev -c "
DELETE FROM \"GameChatMessage\" 
WHERE \"gameId\" IN (
  SELECT \"gameId\" FROM \"DirectStream\" WHERE slug LIKE 'tchs-basketball%'
);

DELETE FROM \"DirectStreamRegistration\" 
WHERE \"directStreamId\" IN (
  SELECT id FROM \"DirectStream\" WHERE slug LIKE 'tchs-basketball%'
);

DELETE FROM \"Game\" 
WHERE id IN (
  SELECT \"gameId\" FROM \"DirectStream\" WHERE slug LIKE 'tchs-basketball%'
);

DELETE FROM \"DirectStream\" WHERE slug LIKE 'tchs-basketball%';
" > /dev/null 2>&1

echo -e "${GREEN}✓${NC} Previous test data cleaned"
echo ""

# Clear Mailpit inbox
echo "Clearing Mailpit inbox..."
if curl -s -X DELETE http://localhost:4304/api/v1/messages > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} Mailpit inbox cleared"
else
  echo -e "${YELLOW}⚠${NC} Could not clear Mailpit inbox"
fi

echo ""

# Seed test data
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌱 Seeding Test Data"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

pnpm tsx scripts/seed-test-stream.ts

echo ""

# Test execution options
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Test Execution Options"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Choose test type:"
echo "  1) Run automated E2E tests (Playwright)"
echo "  2) Run manual test (open browsers for manual testing)"
echo "  3) Run both (E2E first, then manual)"
echo "  4) Skip tests (just seed data)"
echo ""
read -p "Enter choice [1-4]: " choice

case $choice in
  1)
    echo ""
    echo "Running Playwright E2E tests..."
    pnpm playwright test tests/e2e/direct-stream-complete-ux.spec.ts --reporter=html
    echo ""
    echo -e "${GREEN}✓${NC} E2E tests complete. View report: pnpm playwright show-report"
    ;;
  2)
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📝 Manual Test Instructions"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Follow the manual test script:"
    echo "  ${BLUE}MANUAL_TEST_SCRIPT_DIRECT_STREAM_UX.md${NC}"
    echo ""
    echo "Test URLs:"
    echo "  Stream: ${BLUE}http://localhost:4300/direct/tchs-basketball-20260110${NC}"
    echo "  Admin:  ${BLUE}http://localhost:4300/admin/direct-streams${NC}"
    echo "  Mailpit: ${BLUE}http://localhost:4304${NC}"
    echo ""
    echo "Opening browsers..."
    
    # Open URLs in browser
    if command -v open > /dev/null; then
      # macOS
      open "http://localhost:4300/direct/tchs-basketball-20260110"
      open "http://localhost:4304"
    elif command -v xdg-open > /dev/null; then
      # Linux
      xdg-open "http://localhost:4300/direct/tchs-basketball-20260110"
      xdg-open "http://localhost:4304"
    else
      echo "Please manually open the URLs above"
    fi
    
    echo ""
    echo "Press any key when manual testing is complete..."
    read -n 1
    ;;
  3)
    echo ""
    echo "Running E2E tests first..."
    pnpm playwright test tests/e2e/direct-stream-complete-ux.spec.ts --reporter=html
    echo ""
    echo -e "${GREEN}✓${NC} E2E tests complete"
    echo ""
    echo "Now opening browsers for manual testing..."
    
    if command -v open > /dev/null; then
      open "http://localhost:4300/direct/tchs-basketball-20260110"
      open "http://localhost:4304"
    fi
    
    echo ""
    echo "Follow manual test script: MANUAL_TEST_SCRIPT_DIRECT_STREAM_UX.md"
    echo "Press any key when complete..."
    read -n 1
    ;;
  4)
    echo ""
    echo "Test data seeded. Ready for manual testing."
    ;;
  *)
    echo "Invalid choice. Exiting."
    exit 1
    ;;
esac

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Test Execution Complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next Steps:"
echo "  - Review test results"
echo "  - Check Mailpit for emails: http://localhost:4304"
echo "  - Verify data in database"
echo "  - File issues for any bugs found"
echo ""
echo "Useful Commands:"
echo "  pnpm playwright show-report     # View E2E test report"
echo "  docker compose logs -f postgres # View database logs"
echo "  docker compose logs -f mailpit  # View email logs"
echo ""
echo "Test stream URL: ${BLUE}http://localhost:4300/direct/tchs-basketball-20260110${NC}"
echo ""

