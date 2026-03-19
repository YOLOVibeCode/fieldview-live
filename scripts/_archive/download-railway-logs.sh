#!/usr/bin/env bash
# Download all Railway logs for triage (CLI Fallback Method)
# 
# ⚠️  MCP-FIRST ENFORCEMENT: This script requires Railway MCP verification
# 
# STANDARD METHOD: Use Railway MCP via Cursor Composer for better performance
#   ./scripts/download-railway-logs-mcp.sh [api|web|all] [lines]
#
# This script is ONLY available if Railway MCP is not configured.
# Usage: ./scripts/download-railway-logs.sh [api|web|all]

set -euo pipefail

# Enforce MCP-first: Check if Railway MCP is available
if [ -f "$(dirname "$0")/require-railway-mcp.sh" ]; then
  source "$(dirname "$0")/require-railway-mcp.sh"
  if ! require_railway_mcp; then
    echo ""
    echo -e "${RED}❌ CLI access blocked - Railway MCP is available${NC}"
    echo -e "${YELLOW}Please use Railway MCP via Cursor Composer instead${NC}"
    echo ""
    exit 1
  fi
fi

SERVICE="${1:-all}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_DIR="logs/railway"

mkdir -p "$LOG_DIR"

# Function to measure time
measure_time() {
  local start_time=$(date +%s.%N)
  "$@"
  local end_time=$(date +%s.%N)
  local duration=$(echo "$end_time - $start_time" | bc)
  echo "$duration"
}

download_service_logs() {
  local service=$1
  echo "📥 Downloading $service logs (CLI method)..."
  echo "   ⚠️  Note: Railway MCP is faster. Use download-railway-logs-mcp.sh for better performance"
  
  local start_time=$(date +%s.%N)
  
  # Full logs
  railway logs --service "$service" --lines 5000 2>&1 > "$LOG_DIR/${service}-full-${TIMESTAMP}.log"
  local end_time=$(date +%s.%N)
  local duration=$(echo "scale=2; $end_time - $start_time" | bc)
  local line_count=$(wc -l < "$LOG_DIR/${service}-full-${TIMESTAMP}.log" 2>/dev/null | tr -d ' ' || echo "0")
  
  echo "  ✅ Full logs: $LOG_DIR/${service}-full-${TIMESTAMP}.log ($line_count lines)"
  if [ "$(echo "$duration > 0" | bc)" -eq 1 ] && [ "$line_count" -gt 0 ]; then
    echo "  ⏱️  Download time: ${duration}s ($(echo "scale=2; $line_count / $duration" | bc) lines/sec)"
  else
    echo "  ⏱️  Download time: ${duration}s"
  fi
  
  # Error logs only
  local error_start=$(date +%s.%N)
  railway logs --service "$service" --lines 5000 2>&1 | grep -iE "error|ERROR|fail|FAIL|exception|Exception|crash|Crash|warn|WARN" > "$LOG_DIR/${service}-errors-${TIMESTAMP}.log" || true
  local error_end=$(date +%s.%N)
  local error_duration=$(echo "scale=2; $error_end - $error_start" | bc)
  local error_lines=$(wc -l < "$LOG_DIR/${service}-errors-${TIMESTAMP}.log" 2>/dev/null | tr -d ' ' || echo "0")
  
  echo "  ✅ Error logs: $LOG_DIR/${service}-errors-${TIMESTAMP}.log ($error_lines lines)"
  echo "  ⏱️  Error extraction: ${error_duration}s"
}

download_deployment_logs() {
  echo "📥 Downloading deployment status..."
  local start_time=$(date +%s.%N)
  
  railway deployment list --service api 2>&1 > "$LOG_DIR/api-deployments-${TIMESTAMP}.log"
  
  local end_time=$(date +%s.%N)
  local duration=$(echo "scale=2; $end_time - $start_time" | bc)
  
  echo "  ✅ Deployment list: $LOG_DIR/api-deployments-${TIMESTAMP}.log"
  echo "  ⏱️  Time: ${duration}s"
  
  # Get failed deployment IDs
  local failed_deploys=$(railway deployment list --service api 2>&1 | grep "FAILED" | head -3 | awk '{print $1}' || true)
  
  if [ -n "$failed_deploys" ]; then
    echo "📥 Downloading failed deployment logs (this may take a while)..."
    local deploy_start=$(date +%s.%N)
    for deploy in $failed_deploys; do
      echo "  Getting logs for: $deploy"
      railway logs --service api --deployment "$deploy" 2>&1 | head -200 >> "$LOG_DIR/api-failed-deployments-${TIMESTAMP}.log" 2>&1 || true
    done
    local deploy_end=$(date +%s.%N)
    local deploy_duration=$(echo "scale=2; $deploy_end - $deploy_start" | bc)
    echo "  ✅ Failed deployment logs: $LOG_DIR/api-failed-deployments-${TIMESTAMP}.log"
    echo "  ⏱️  Time: ${deploy_duration}s"
  fi
}

case "$SERVICE" in
  api)
    download_service_logs "api"
    download_deployment_logs
    ;;
  web)
    download_service_logs "web"
    ;;
  all)
    download_service_logs "api"
    download_service_logs "web"
    download_deployment_logs
    ;;
  *)
    echo "Usage: $0 [api|web|all]"
    exit 1
    ;;
esac

echo ""
echo "📊 Summary:"
echo "==========="
ls -lh "$LOG_DIR"/*${TIMESTAMP}*.log 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'
echo ""
echo "✅ All logs saved to: $LOG_DIR/"
echo ""
echo "💡 TIP: For faster downloads, use Railway MCP:"
echo "   ./scripts/download-railway-logs-mcp.sh [api|web|all] [lines]"
echo "   Or use Cursor Composer (Cmd+I) and ask: 'Get Railway logs'"
echo ""
echo "📖 See $LOG_DIR/README.md for analysis tips"
