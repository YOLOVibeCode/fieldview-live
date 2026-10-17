#!/bin/bash
#
# DVR Test Runner - Local & Production
# 
# Usage:
#   ./scripts/test-dvr.sh           # Test against local environment
#   ./scripts/test-dvr.sh prod      # Test against production
#

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check environment argument
ENV=${1:-local}

if [ "$ENV" = "prod" ]; then
    echo -e "${BLUE}🧪 Testing DVR against PRODUCTION${NC}"
    # Credentials come from the environment, never from source.
    if [ -z "$DATABASE_URL" ]; then
        echo "DATABASE_URL is not set. Export it first (see 1Password / railway variables)."
        exit 1
    fi
else
    echo -e "${BLUE}🧪 Testing DVR against LOCAL${NC}"
    export DATABASE_URL="postgresql://fieldview:dev_password_change_in_production@localhost:4302/fieldview_dev"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  DVR Test Suite - $ENV${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Track results
PASSED=0
FAILED=0

run_test() {
    local test_name=$1
    local test_command=$2
    
    echo -e "${BLUE}→${NC} Running: $test_name"
    
    if eval "$test_command" > /tmp/test-output.log 2>&1; then
        echo -e "${GREEN}✓${NC} $test_name passed"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $test_name failed"
        echo "  See logs: /tmp/test-output.log"
        ((FAILED++))
    fi
}

# ========================================
# Test 1: Database Connection
# ========================================
echo -e "${YELLOW}Phase 1: Database Connection${NC}"
run_test "Database ping" "cd packages/data-model && pnpm exec prisma db execute --stdin <<< 'SELECT 1;' --schema=./prisma/schema.prisma"
echo ""

# ========================================
# Test 2: Build DVR Service
# ========================================
echo -e "${YELLOW}Phase 2: Build DVR Package${NC}"
run_test "Build DVR service" "cd packages/dvr-service && pnpm build"
echo ""

# ========================================
# Test 3: Unit Tests (Repositories)
# ========================================
echo -e "${YELLOW}Phase 3: Repository Tests${NC}"
run_test "ClipRepository (12 tests)" "cd apps/api && pnpm vitest run ClipRepository --reporter=verbose"
run_test "BookmarkRepository (13 tests)" "cd apps/api && pnpm vitest run BookmarkRepository --reporter=verbose"
echo ""

# ========================================
# Test 4: Service Layer Tests
# ========================================
echo -e "${YELLOW}Phase 4: Service Layer Tests${NC}"
run_test "DVRService (17 tests)" "cd apps/api && pnpm vitest run DVRService --reporter=verbose"
echo ""

# ========================================
# Test 5: API Integration Tests
# ========================================
echo -e "${YELLOW}Phase 5: API Route Tests${NC}"
run_test "DVR API routes (29 tests)" "cd apps/api && pnpm vitest run dvr.routes --reporter=verbose --testTimeout=30000"
echo ""

# ========================================
# Summary
# ========================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Test Results${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "Environment: ${YELLOW}$ENV${NC}"
echo -e "Passed:      ${GREEN}$PASSED${NC}"
echo -e "Failed:      ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✓ ALL TESTS PASSED! 🎉           ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════╝${NC}"
    exit 0
else
    echo -e "${RED}╔════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ✗ SOME TESTS FAILED               ║${NC}"
    echo -e "${RED}╚════════════════════════════════════╝${NC}"
    exit 1
fi

