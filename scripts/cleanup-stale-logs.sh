#!/usr/bin/env bash
# Cleanup Stale Railway Debug Logs
# 
# Removes old log files to keep disk space manageable
# Keeps recent logs (last 7 days by default)
#
# Usage:
#   ./scripts/cleanup-stale-logs.sh [days]
#
# Examples:
#   ./scripts/cleanup-stale-logs.sh        # Keep last 7 days (default)
#   ./scripts/cleanup-stale-logs.sh 3     # Keep last 3 days
#   ./scripts/cleanup-stale-logs.sh 0     # Remove all logs (careful!)

set -euo pipefail

DAYS_TO_KEEP="${1:-7}"
LOG_DIR="logs/railway/debug"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              🧹 Cleanup Stale Railway Debug Logs                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ ! -d "$LOG_DIR" ]; then
  echo -e "${YELLOW}⚠️  Log directory not found: $LOG_DIR${NC}"
  exit 0
fi

if [ "$DAYS_TO_KEEP" -eq 0 ]; then
  echo -e "${RED}⚠️  WARNING: This will remove ALL logs!${NC}"
  read -p "Are you sure? (yes/no): " confirm
  if [ "$confirm" != "yes" ]; then
    echo -e "${YELLOW}Cancelled${NC}"
    exit 0
  fi
fi

# Count files before
BEFORE_COUNT=$(find "$LOG_DIR" -name "*.log" -type f 2>/dev/null | wc -l | tr -d ' ')
BEFORE_SIZE=$(du -sh "$LOG_DIR" 2>/dev/null | awk '{print $1}' || echo "0")

echo -e "${BLUE}Current logs:${NC}"
echo -e "  Files: ${BEFORE_COUNT}"
echo -e "  Size: ${BEFORE_SIZE}"
echo ""

if [ "$DAYS_TO_KEEP" -eq 0 ]; then
  echo -e "${YELLOW}Removing all logs...${NC}"
  find "$LOG_DIR" -name "*.log" -type f -delete 2>/dev/null || true
  REMOVED_COUNT=$BEFORE_COUNT
else
  echo -e "${YELLOW}Removing logs older than ${DAYS_TO_KEEP} days...${NC}"
  REMOVED_COUNT=$(find "$LOG_DIR" -name "*.log" -type f -mtime +$DAYS_TO_KEEP -delete -print 2>/dev/null | wc -l | tr -d ' ' || echo "0")
fi

# Count files after
AFTER_COUNT=$(find "$LOG_DIR" -name "*.log" -type f 2>/dev/null | wc -l | tr -d ' ')
AFTER_SIZE=$(du -sh "$LOG_DIR" 2>/dev/null | awk '{print $1}' || echo "0")

echo ""
echo -e "${GREEN}✅ Cleanup complete${NC}"
echo ""
echo -e "${BLUE}Summary:${NC}"
echo -e "  Removed: ${REMOVED_COUNT} files"
echo -e "  Remaining: ${AFTER_COUNT} files"
echo -e "  Size before: ${BEFORE_SIZE}"
echo -e "  Size after: ${AFTER_SIZE}"
echo ""

if [ "$DAYS_TO_KEEP" -gt 0 ]; then
  echo -e "${BLUE}💡 Tip: Logs from last ${DAYS_TO_KEEP} days are kept${NC}"
  echo -e "${BLUE}   Run with ${YELLOW}--deployments${NC} flag for real-time debugging${NC}"
fi
