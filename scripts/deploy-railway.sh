#!/bin/bash

################################################################################
# Railway Production Deployment Script
# 
# Safe, resilient deployment with:
# - Pre-flight checks
# - Database backup
# - Rollback capability
# - Dry-run mode
# - Comprehensive logging
# - Error handling
################################################################################

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="${PROJECT_ROOT}/deploy-$(date +%Y%m%d-%H%M%S).log"
BACKUP_FILE="${PROJECT_ROOT}/backup-$(date +%Y%m%d-%H%M%S).sql"

# Default values
DRY_RUN=false
SKIP_BACKUP=false
FORCE=false
SKIP_MIGRATION=false
SERVICE=""

################################################################################
# Helper Functions
################################################################################

log() {
  echo -e "${CYAN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $*" | tee -a "$LOG_FILE"
}

success() {
  echo -e "${GREEN}✅ $*${NC}" | tee -a "$LOG_FILE"
}

error() {
  echo -e "${RED}❌ ERROR: $*${NC}" | tee -a "$LOG_FILE"
}

warning() {
  echo -e "${YELLOW}⚠️  WARNING: $*${NC}" | tee -a "$LOG_FILE"
}

info() {
  echo -e "${BLUE}ℹ️  $*${NC}" | tee -a "$LOG_FILE"
}

prompt() {
  if [ "$FORCE" = true ]; then
    return 0
  fi
  
  echo -e "${YELLOW}$1${NC}"
  read -p "Continue? [y/N] " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    error "Deployment cancelled by user"
    exit 1
  fi
}

################################################################################
# Pre-flight Checks
################################################################################

preflight_checks() {
  log "Running pre-flight checks..."
  
  # Check if we're in the right directory
  if [ ! -f "$PROJECT_ROOT/package.json" ]; then
    error "Not in project root! Expected package.json"
    exit 1
  fi
  
  # Check if Railway CLI is installed
  if ! command -v railway &> /dev/null; then
    error "Railway CLI not installed. Install with: npm i -g @railway/cli"
    exit 1
  fi
  
  # Check if logged into Railway
  if ! railway whoami &> /dev/null; then
    error "Not logged into Railway. Run: railway login"
    exit 1
  fi
  
  # Check if on main branch
  CURRENT_BRANCH=$(git branch --show-current)
  if [ "$CURRENT_BRANCH" != "main" ]; then
    warning "Not on main branch (current: $CURRENT_BRANCH)"
    prompt "Deploy from non-main branch?"
  fi
  
  # Check if working directory is clean
  if ! git diff-index --quiet HEAD --; then
    warning "Working directory has uncommitted changes"
    git status --short
    prompt "Deploy with uncommitted changes?"
  fi
  
  # Check if latest commit is pushed
  LOCAL_COMMIT=$(git rev-parse HEAD)
  REMOTE_COMMIT=$(git rev-parse origin/main 2>/dev/null || echo "")
  
  if [ "$LOCAL_COMMIT" != "$REMOTE_COMMIT" ] && [ -n "$REMOTE_COMMIT" ]; then
    warning "Local commits not pushed to origin/main"
    prompt "Push and deploy?"
    
    if [ "$DRY_RUN" = false ]; then
      log "Pushing to origin/main..."
      git push origin main || {
        error "Failed to push to remote"
        exit 1
      }
    else
      info "[DRY RUN] Would push to origin/main"
    fi
  fi
  
  success "Pre-flight checks passed"
}

################################################################################
# Database Backup
################################################################################

backup_database() {
  if [ "$SKIP_BACKUP" = true ]; then
    warning "Skipping database backup (--skip-backup flag)"
    return 0
  fi
  
  log "Creating database backup..."
  
  if [ -z "${DATABASE_PUBLIC_URL:-}" ]; then
    error "DATABASE_PUBLIC_URL not set. Export it from Railway:"
    echo "  railway variables --service postgres"
    echo "  export DATABASE_PUBLIC_URL='postgresql://...'"
    exit 1
  fi
  
  if [ "$DRY_RUN" = true ]; then
    info "[DRY RUN] Would backup database to: $BACKUP_FILE"
    return 0
  fi
  
  # Create backup using pg_dump
  if command -v pg_dump &> /dev/null; then
    pg_dump "$DATABASE_PUBLIC_URL" > "$BACKUP_FILE" 2>> "$LOG_FILE" || {
      error "Database backup failed"
      exit 1
    }
    
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    success "Database backed up to $BACKUP_FILE ($BACKUP_SIZE)"
  else
    warning "pg_dump not found. Install PostgreSQL client tools or use --skip-backup"
    prompt "Continue without backup?"
  fi
}

################################################################################
# Run Migrations
################################################################################

run_migrations() {
  if [ "$SKIP_MIGRATION" = true ]; then
    warning "Skipping migrations (--skip-migration flag)"
    return 0
  fi
  
  log "Running database migrations..."
  
  if [ -z "${DATABASE_PUBLIC_URL:-}" ]; then
    error "DATABASE_PUBLIC_URL not set"
    exit 1
  fi
  
  export DATABASE_URL="$DATABASE_PUBLIC_URL"
  
  cd "$PROJECT_ROOT/packages/data-model"
  
  if [ "$DRY_RUN" = true ]; then
    info "[DRY RUN] Would generate Prisma client"
    info "[DRY RUN] Would run: prisma migrate deploy"
    cd "$PROJECT_ROOT"
    return 0
  fi
  
  # Generate Prisma client
  log "Generating Prisma client..."
  pnpm exec prisma generate >> "$LOG_FILE" 2>&1 || {
    error "Failed to generate Prisma client"
    cd "$PROJECT_ROOT"
    exit 1
  }
  
  # Check migration status
  log "Checking migration status..."
  pnpm exec prisma migrate status >> "$LOG_FILE" 2>&1 || true
  
  # Apply migrations
  log "Applying migrations..."
  pnpm exec prisma migrate deploy >> "$LOG_FILE" 2>&1 || {
    error "Migration failed! Check $LOG_FILE for details"
    warning "Database may be in inconsistent state"
    info "Restore from backup: psql \$DATABASE_PUBLIC_URL < $BACKUP_FILE"
    cd "$PROJECT_ROOT"
    exit 1
  }
  
  cd "$PROJECT_ROOT"
  success "Migrations applied successfully"
}

################################################################################
# Deploy to Railway
################################################################################

deploy_service() {
  local service=$1
  
  log "Deploying $service service..."
  
  if [ "$DRY_RUN" = true ]; then
    info "[DRY RUN] Would deploy $service service"
    return 0
  fi
  
  # Link to Railway project (if not already linked)
  if [ ! -f "$PROJECT_ROOT/.railway/config.json" ]; then
    log "Linking to Railway project..."
    railway link || {
      error "Failed to link Railway project"
      exit 1
    }
  fi
  
  # Trigger deployment
  log "Triggering $service deployment via Railway..."
  railway up --service "$service" --detach >> "$LOG_FILE" 2>&1 || {
    error "Failed to deploy $service"
    exit 1
  }
  
  success "$service deployment triggered"
}

wait_for_deployment() {
  local service=$1
  
  if [ "$DRY_RUN" = true ]; then
    info "[DRY RUN] Would wait for $service deployment"
    return 0
  fi
  
  log "Waiting for $service deployment to complete..."
  
  local max_wait=300  # 5 minutes
  local elapsed=0
  local interval=10
  
  while [ $elapsed -lt $max_wait ]; do
    # Check deployment status (Railway CLI doesn't have great status commands, so we poll)
    sleep $interval
    elapsed=$((elapsed + interval))
    
    # Try to get service status
    if railway status --service "$service" 2>&1 | grep -q "Active"; then
      success "$service deployment completed"
      return 0
    fi
    
    echo -n "." | tee -a "$LOG_FILE"
  done
  
  warning "$service deployment status unclear after ${max_wait}s"
  info "Check Railway dashboard: https://railway.app"
}

################################################################################
# Verification
################################################################################

verify_deployment() {
  log "Verifying deployment..."
  
  if [ "$DRY_RUN" = true ]; then
    info "[DRY RUN] Would verify deployment"
    return 0
  fi
  
  # Wait a bit for services to start
  sleep 5
  
  # Check API health
  log "Checking API endpoint..."
  API_URL="https://api.fieldview.live"
  
  if curl -sf "$API_URL/api/direct/tchs/bootstrap" > /dev/null; then
    success "API is responding"
    
    # Check if new fields are present
    RESPONSE=$(curl -sf "$API_URL/api/direct/tchs/bootstrap")
    if echo "$RESPONSE" | grep -q "scoreboardEnabled"; then
      success "New scoreboard fields detected ✅"
    else
      warning "New scoreboard fields NOT detected - may need more time"
    fi
  else
    error "API not responding at $API_URL"
  fi
  
  # Check Web
  log "Checking Web endpoint..."
  WEB_URL="https://www.fieldview.live"
  
  if curl -sf "$WEB_URL" > /dev/null; then
    success "Web is responding"
  else
    error "Web not responding at $WEB_URL"
  fi
}

################################################################################
# Rollback
################################################################################

rollback() {
  error "Deployment failed!"
  
  if [ "$SKIP_BACKUP" = false ] && [ -f "$BACKUP_FILE" ]; then
    warning "To rollback database changes:"
    echo "  psql \$DATABASE_PUBLIC_URL < $BACKUP_FILE"
  fi
  
  warning "To rollback code deployment:"
  echo "  1. Revert commits: git revert HEAD"
  echo "  2. Push: git push origin main"
  echo "  3. Railway will auto-deploy previous version"
  
  exit 1
}

################################################################################
# Usage
################################################################################

usage() {
  cat << EOF
Usage: $0 [OPTIONS]

Safe and resilient Railway deployment script.

OPTIONS:
  --dry-run              Run without making changes
  --skip-backup          Skip database backup (not recommended)
  --skip-migration       Skip running database migrations
  --force                Skip all prompts
  --service <name>       Deploy specific service only (api|web|both)
  --help                 Show this help message

ENVIRONMENT VARIABLES:
  DATABASE_PUBLIC_URL    Production PostgreSQL connection string (required)

EXAMPLES:
  # Full deployment with prompts
  $0

  # Dry run (see what would happen)
  $0 --dry-run

  # Deploy without prompts
  $0 --force

  # Deploy only API service
  $0 --service api

  # Quick deploy (skip backup, no prompts)
  $0 --skip-backup --force

SAFETY FEATURES:
  ✅ Pre-flight checks (git status, Railway auth)
  ✅ Database backup before migrations
  ✅ Dry-run mode
  ✅ Rollback instructions on failure
  ✅ Deployment verification
  ✅ Comprehensive logging

REQUIREMENTS:
  - Railway CLI: npm i -g @railway/cli
  - PostgreSQL client: brew install postgresql
  - pnpm: npm i -g pnpm

EOF
}

################################################################################
# Parse Arguments
################################################################################

while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --skip-backup)
      SKIP_BACKUP=true
      shift
      ;;
    --skip-migration)
      SKIP_MIGRATION=true
      shift
      ;;
    --force)
      FORCE=true
      shift
      ;;
    --service)
      SERVICE="$2"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      error "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

################################################################################
# Main Execution
################################################################################

main() {
  log "🚀 Starting Railway deployment..."
  log "Log file: $LOG_FILE"
  
  if [ "$DRY_RUN" = true ]; then
    warning "DRY RUN MODE - No changes will be made"
  fi
  
  # Set trap for cleanup on error
  trap rollback ERR
  
  # Execute deployment steps
  preflight_checks
  backup_database
  run_migrations
  
  # Deploy services
  if [ -z "$SERVICE" ] || [ "$SERVICE" = "both" ]; then
    deploy_service "api"
    deploy_service "web"
    wait_for_deployment "api"
    wait_for_deployment "web"
  elif [ "$SERVICE" = "api" ] || [ "$SERVICE" = "web" ]; then
    deploy_service "$SERVICE"
    wait_for_deployment "$SERVICE"
  else
    error "Invalid service: $SERVICE (must be api|web|both)"
    exit 1
  fi
  
  verify_deployment
  
  # Success!
  echo ""
  success "🎉 Deployment complete!"
  echo ""
  info "📊 Check Railway dashboard: https://railway.app"
  info "📝 Deployment log: $LOG_FILE"
  
  if [ "$SKIP_BACKUP" = false ] && [ -f "$BACKUP_FILE" ]; then
    info "💾 Database backup: $BACKUP_FILE"
  fi
  
  echo ""
  log "✅ All systems operational"
}

# Run main
main

