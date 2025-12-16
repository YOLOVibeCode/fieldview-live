#!/bin/bash
# Pre-Deployment Checklist for FieldView.live
# Run this before deploying to catch common issues

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}FieldView.live Pre-Deploy Check${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

ERRORS=0
WARNINGS=0

# Check Node version
echo -e "${BLUE}Checking Node.js version...${NC}"
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -ge 20 ]; then
  echo -e "${GREEN}✓${NC} Node.js version: $(node -v)"
else
  echo -e "${RED}✗${NC} Node.js version too old: $(node -v) (need >=20)"
  ((ERRORS++))
fi
echo ""

# Check pnpm
echo -e "${BLUE}Checking pnpm...${NC}"
if command -v pnpm &> /dev/null; then
  echo -e "${GREEN}✓${NC} pnpm installed: $(pnpm -v)"
else
  echo -e "${RED}✗${NC} pnpm not installed"
  ((ERRORS++))
fi
echo ""

# Check Railway CLI
echo -e "${BLUE}Checking Railway CLI...${NC}"
if command -v railway &> /dev/null; then
  echo -e "${GREEN}✓${NC} Railway CLI installed"
else
  echo -e "${YELLOW}⚠${NC} Railway CLI not installed (run: npm install -g @railway/cli)"
  ((WARNINGS++))
fi
echo ""

# Check if in git repo
echo -e "${BLUE}Checking git repository...${NC}"
if [ -d .git ]; then
  echo -e "${GREEN}✓${NC} Git repository initialized"
  
  # Check for uncommitted changes
  if [[ -n $(git status -s) ]]; then
    echo -e "${YELLOW}⚠${NC} You have uncommitted changes"
    ((WARNINGS++))
  else
    echo -e "${GREEN}✓${NC} No uncommitted changes"
  fi
  
  # Check current branch
  BRANCH=$(git branch --show-current)
  echo -e "  Current branch: ${BLUE}$BRANCH${NC}"
else
  echo -e "${RED}✗${NC} Not a git repository"
  ((ERRORS++))
fi
echo ""

# Check package.json exists
echo -e "${BLUE}Checking project structure...${NC}"
if [ -f "package.json" ]; then
  echo -e "${GREEN}✓${NC} Root package.json exists"
else
  echo -e "${RED}✗${NC} Root package.json not found"
  ((ERRORS++))
fi

if [ -f "apps/api/package.json" ]; then
  echo -e "${GREEN}✓${NC} API package.json exists"
else
  echo -e "${RED}✗${NC} API package.json not found"
  ((ERRORS++))
fi

if [ -f "apps/web/package.json" ]; then
  echo -e "${GREEN}✓${NC} Web package.json exists"
else
  echo -e "${RED}✗${NC} Web package.json not found"
  ((ERRORS++))
fi

if [ -f "packages/data-model/package.json" ]; then
  echo -e "${GREEN}✓${NC} Data model package.json exists"
else
  echo -e "${RED}✗${NC} Data model package.json not found"
  ((ERRORS++))
fi
echo ""

# Check Dockerfiles
echo -e "${BLUE}Checking Docker configuration...${NC}"
if [ -f "apps/api/Dockerfile" ]; then
  echo -e "${GREEN}✓${NC} API Dockerfile exists"
else
  echo -e "${RED}✗${NC} API Dockerfile not found"
  ((ERRORS++))
fi

if [ -f "apps/web/Dockerfile" ]; then
  echo -e "${GREEN}✓${NC} Web Dockerfile exists"
else
  echo -e "${RED}✗${NC} Web Dockerfile not found"
  ((ERRORS++))
fi
echo ""

# Check Railway configs
echo -e "${BLUE}Checking Railway configuration...${NC}"
if [ -f "railway.json" ]; then
  echo -e "${GREEN}✓${NC} railway.json exists"
else
  echo -e "${YELLOW}⚠${NC} railway.json not found (optional)"
  ((WARNINGS++))
fi

if [ -f "apps/api/railway.toml" ]; then
  echo -e "${GREEN}✓${NC} API railway.toml exists"
else
  echo -e "${YELLOW}⚠${NC} API railway.toml not found (optional)"
  ((WARNINGS++))
fi

if [ -f "apps/web/railway.toml" ]; then
  echo -e "${GREEN}✓${NC} Web railway.toml exists"
else
  echo -e "${YELLOW}⚠${NC} Web railway.toml not found (optional)"
  ((WARNINGS++))
fi
echo ""

# Check for sensitive files that shouldn't be committed
echo -e "${BLUE}Checking for sensitive files...${NC}"
SENSITIVE_FILES=(".env" "apps/api/.env" "apps/web/.env" ".env.local" ".env.production")
FOUND_SENSITIVE=false
for file in "${SENSITIVE_FILES[@]}"; do
  if [ -f "$file" ] && git ls-files --error-unmatch "$file" &> /dev/null; then
    echo -e "${RED}✗${NC} Sensitive file tracked in git: $file"
    ((ERRORS++))
    FOUND_SENSITIVE=true
  fi
done

if [ "$FOUND_SENSITIVE" = false ]; then
  echo -e "${GREEN}✓${NC} No sensitive files tracked in git"
fi
echo ""

# Check dependencies can install
echo -e "${BLUE}Checking dependencies...${NC}"
echo "Installing dependencies (this may take a moment)..."
if pnpm install --frozen-lockfile &> /dev/null; then
  echo -e "${GREEN}✓${NC} Dependencies install successfully"
else
  echo -e "${RED}✗${NC} Failed to install dependencies"
  ((ERRORS++))
fi
echo ""

# Check if project builds
echo -e "${BLUE}Checking if project builds...${NC}"
echo "Building project (this may take a moment)..."
if pnpm build &> /dev/null; then
  echo -e "${GREEN}✓${NC} Project builds successfully"
else
  echo -e "${RED}✗${NC} Build failed"
  echo "Run 'pnpm build' to see detailed errors"
  ((ERRORS++))
fi
echo ""

# Check TypeScript
echo -e "${BLUE}Checking TypeScript...${NC}"
if pnpm type-check &> /dev/null; then
  echo -e "${GREEN}✓${NC} No TypeScript errors"
else
  echo -e "${YELLOW}⚠${NC} TypeScript errors found (run 'pnpm type-check')"
  ((WARNINGS++))
fi
echo ""

# Check linting
echo -e "${BLUE}Checking linting...${NC}"
if pnpm lint &> /dev/null; then
  echo -e "${GREEN}✓${NC} No linting errors"
else
  echo -e "${YELLOW}⚠${NC} Linting errors found (run 'pnpm lint')"
  ((WARNINGS++))
fi
echo ""

# Environment variables reminder
echo -e "${BLUE}Environment Variables Checklist:${NC}"
echo "Make sure you have these ready for Railway:"
echo ""
echo "Required:"
echo "  • MUX_TOKEN_ID"
echo "  • MUX_TOKEN_SECRET"
echo "  • SQUARE_ACCESS_TOKEN"
echo "  • SQUARE_LOCATION_ID"
echo "  • TWILIO_ACCOUNT_SID"
echo "  • TWILIO_AUTH_TOKEN"
echo "  • JWT_SECRET (generate: openssl rand -base64 32)"
echo "  • NEXTAUTH_SECRET (generate: openssl rand -base64 32)"
echo ""
echo "Auto-configured by Railway:"
echo "  • DATABASE_URL"
echo "  • REDIS_URL"
echo "  • PORT"
echo "  • CORS_ORIGIN"
echo ""

# Summary
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Summary${NC}"
echo -e "${BLUE}================================${NC}"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}✓ All checks passed!${NC}"
  echo ""
  echo -e "${GREEN}You're ready to deploy to Railway!${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. railway login"
  echo "  2. railway init"
  echo "  3. Follow DEPLOY_TO_RAILWAY.md"
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo -e "${YELLOW}⚠ $WARNINGS warning(s)${NC}"
  echo ""
  echo -e "${YELLOW}You can deploy, but consider fixing warnings first.${NC}"
  exit 0
else
  echo -e "${RED}✗ $ERRORS error(s), $WARNINGS warning(s)${NC}"
  echo ""
  echo -e "${RED}Please fix errors before deploying.${NC}"
  exit 1
fi
