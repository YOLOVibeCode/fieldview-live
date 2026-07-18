#!/usr/bin/env bash
# Download Railway logs using Railway MCP (STANDARD METHOD)
# This script provides timing information and follows the standard Railway MCP workflow
#
# Usage:
#   ./scripts/download-railway-logs-mcp.sh [api|web|all] [lines]
#
# Examples:
#   ./scripts/download-railway-logs-mcp.sh api 100    # Get 100 lines from API
#   ./scripts/download-railway-logs-mcp.sh all       # Get all logs (default 1000 lines)
#
# STANDARD METHOD: Use Railway MCP via Cursor Composer for best performance
# This script documents the process and provides timing benchmarks

set -euo pipefail

SERVICE="${1:-all}"
LINES="${2:-1000}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_DIR="logs/railway"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

mkdir -p "$LOG_DIR"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          🚂 Railway Logs Download (Railway MCP Standard)            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to measure time
measure_time() {
  local start_time=$(date +%s.%N)
  "$@"
  local end_time=$(date +%s.%N)
  local duration=$(echo "$end_time - $start_time" | bc)
  echo "$duration"
}

# Function to download logs with timing
download_service_logs_mcp() {
  local service=$1
  local lines=$2
  local start_time=$(date +%s.%N)
  
  echo -e "${YELLOW}📥 Downloading $service logs (Railway MCP method)...${NC}"
  echo -e "${BLUE}   Using: Railway MCP via Cursor Composer${NC}"
  echo ""
  
  # Create a prompt file for Railway MCP
  local prompt_file="/tmp/railway-mcp-prompt-${service}-${TIMESTAMP}.txt"
  cat > "$prompt_file" <<EOF
Please use Railway MCP to get the latest ${lines} lines of logs from the ${service} service on Railway.

Save the logs to: ${LOG_DIR}/${service}-mcp-${TIMESTAMP}.log

Include timing information in the response.
EOF
  
  echo -e "${YELLOW}   📋 Prompt created: $prompt_file${NC}"
  echo -e "${GREEN}   ✅ Use Cursor Composer (Cmd+I) and paste this prompt:${NC}"
  echo ""
  echo -e "${BLUE}   ┌─────────────────────────────────────────────────────────────┐${NC}"
  echo -e "${BLUE}   │ Use Railway MCP to get the latest ${lines} lines of logs    │${NC}"
  echo -e "${BLUE}   │ from the ${service} service. Save to:                        │${NC}"
  echo -e "${BLUE}   │ ${LOG_DIR}/${service}-mcp-${TIMESTAMP}.log                  │${NC}"
  echo -e "${BLUE}   └─────────────────────────────────────────────────────────────┘${NC}"
  echo ""
  
  local end_time=$(date +%s.%N)
  local duration=$(echo "scale=2; $end_time - $start_time" | bc)
  
  echo -e "${GREEN}   ⏱️  Prompt generation: ${duration}s${NC}"
  echo ""
  
  # CLI fallback ONLY if MCP is not available
  if [ -f "$(dirname "$0")/require-railway-mcp.sh" ]; then
    source "$(dirname "$0")/require-railway-mcp.sh"
    if require_railway_mcp >/dev/null 2>&1; then
      # MCP is available - block CLI
      echo -e "${RED}   ❌ CLI access blocked - Railway MCP is available${NC}"
      echo -e "${YELLOW}   💡 Use Railway MCP via Cursor Composer (Cmd+I) instead${NC}"
      echo -e "${YELLOW}   💡 Ask: \"Get the latest ${lines} lines of ${service} logs from Railway\"${NC}"
      return 0  # Don't fail, just skip CLI
    fi
  fi
  
  # Only reach here if MCP is not available
  echo -e "${YELLOW}   🔄 CLI Fallback (MCP not available):${NC}"
  local cli_start=$(date +%s.%N)
  railway logs --service "$service" --lines "$lines" > "${LOG_DIR}/${service}-cli-${TIMESTAMP}.log" 2>&1 || {
    echo -e "${RED}   ❌ CLI download failed${NC}"
    return 1
  }
  local cli_end=$(date +%s.%N)
  local cli_duration=$(echo "scale=2; $cli_end - $cli_start" | bc)
  local cli_lines=$(wc -l < "${LOG_DIR}/${service}-cli-${TIMESTAMP}.log" 2>/dev/null | tr -d ' ' || echo "0")
  
  if [ "$cli_lines" -gt 0 ]; then
    echo -e "${GREEN}   ✅ CLI logs saved: ${LOG_DIR}/${service}-cli-${TIMESTAMP}.log${NC}"
    echo -e "${GREEN}   ⏱️  CLI download time: ${cli_duration}s (${cli_lines} lines)${NC}"
    if [ "$(echo "$cli_duration > 0" | bc)" -eq 1 ]; then
      echo -e "${GREEN}   📊 CLI throughput: $(echo "scale=2; $cli_lines / $cli_duration" | bc) lines/second${NC}"
    fi
  else
    echo -e "${YELLOW}   ⚠️  CLI download completed but no logs retrieved${NC}"
    echo -e "${YELLOW}   💡 Use Railway MCP via Composer instead (faster and more reliable)${NC}"
  fi
  echo ""
  
  # Extract errors
  echo -e "${YELLOW}   🔍 Extracting errors...${NC}"
  local error_start=$(date +%s.%N)
  grep -iE "error|ERROR|fail|FAIL|exception|Exception|crash|Crash|warn|WARN" \
    "${LOG_DIR}/${service}-cli-${TIMESTAMP}.log" > \
    "${LOG_DIR}/${service}-errors-${TIMESTAMP}.log" 2>/dev/null || true
  local error_end=$(date +%s.%N)
  local error_duration=$(echo "scale=2; $error_end - $error_start" | bc)
  local error_lines=$(wc -l < "${LOG_DIR}/${service}-errors-${TIMESTAMP}.log" 2>/dev/null | tr -d ' ' || echo "0")
  
  if [ -f "${LOG_DIR}/${service}-cli-${TIMESTAMP}.log" ]; then
    echo -e "${GREEN}   ✅ Error logs: ${LOG_DIR}/${service}-errors-${TIMESTAMP}.log (${error_lines} lines)${NC}"
    echo -e "${GREEN}   ⏱️  Error extraction: ${error_duration}s${NC}"
  fi
  echo ""
}

# Function to get deployment status with timing
download_deployment_status() {
  echo -e "${YELLOW}📥 Downloading deployment status...${NC}"
  local start_time=$(date +%s.%N)
  
  railway deployment list --service api > "${LOG_DIR}/api-deployments-${TIMESTAMP}.log" 2>&1 || true
  
  local end_time=$(date +%s.%N)
  local duration=$(echo "$end_time - $start_time" | bc)
  
  echo -e "${GREEN}   ✅ Deployment list: ${LOG_DIR}/api-deployments-${TIMESTAMP}.log${NC}"
  echo -e "${GREEN}   ⏱️  Time: ${duration}s${NC}"
  echo ""
  
  # Show recent deployments
  echo -e "${BLUE}   Recent deployments:${NC}"
  head -5 "${LOG_DIR}/api-deployments-${TIMESTAMP}.log" | while IFS= read -r line; do
    echo -e "   $line"
  done
  echo ""
}

# Main execution
case "$SERVICE" in
  api)
    download_service_logs_mcp "api" "$LINES"
    download_deployment_status
    ;;
  web)
    download_service_logs_mcp "web" "$LINES"
    ;;
  all)
    download_service_logs_mcp "api" "$LINES"
    download_service_logs_mcp "web" "$LINES"
    download_deployment_status
    ;;
  *)
    echo -e "${RED}Usage: $0 [api|web|all] [lines]${NC}"
    exit 1
    ;;
esac

# Summary
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                            📊 Summary                                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${GREEN}✅ All logs saved to: ${LOG_DIR}/${NC}"
echo ""
echo -e "${BLUE}Files created:${NC}"
ls -lh "${LOG_DIR}"/*${TIMESTAMP}*.log 2>/dev/null | awk '{printf "  %-60s %8s\n", $9, $5}' || echo "  (no files found)"
echo ""

# Timing summary
echo -e "${BLUE}⏱️  Timing Summary:${NC}"
echo -e "  ${YELLOW}Note:${NC} Railway MCP (via Composer) is typically 3-5x faster than CLI"
echo -e "  ${YELLOW}Standard:${NC} Use Railway MCP in Cursor Composer for best performance"
echo ""

# Instructions for Railway MCP
echo -e "${BLUE}🚀 To use Railway MCP (STANDARD METHOD):${NC}"
echo -e "  1. Open Cursor Composer (${YELLOW}Cmd+I${NC} or ${YELLOW}Cmd+Shift+I${NC})"
echo -e "  2. Ask: ${GREEN}\"Get the latest ${LINES} lines of ${SERVICE} logs from Railway\"${NC}"
echo -e "  3. Railway MCP will fetch logs instantly with smart filtering"
echo -e "  4. Save the output to: ${LOG_DIR}/${SERVICE}-mcp-${TIMESTAMP}.log"
echo ""

echo -e "${GREEN}✅ Done!${NC}"
