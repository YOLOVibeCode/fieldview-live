#!/usr/bin/env bash
# Monitor API and Web Deployments in Real-Time
# 
# Tracks both services simultaneously during deployment
# Shows real-time logs with deployment events highlighted
#
# Usage:
#   ./scripts/monitor-deployments-realtime.sh [api|web|both]
#
# Examples:
#   ./scripts/monitor-deployments-realtime.sh both    # Monitor both services
#   ./scripts/monitor-deployments-realtime.sh api    # Monitor API only
#   ./scripts/monitor-deployments-realtime.sh web    # Monitor Web only

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
API_DIR="$REPO_ROOT/apps/api"
WEB_DIR="$REPO_ROOT/apps/web"

SERVICE="${1:-both}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_DIR="$REPO_ROOT/logs/railway/debug"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

mkdir -p "$LOG_DIR"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        🚀 Real-Time Deployment Monitoring (API + Web)                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check for lnav
check_lnav() {
  if ! command -v lnav &> /dev/null; then
    echo -e "${YELLOW}⚠️  lnav not found - using simple stream mode${NC}"
    return 1
  fi
  return 0
}

# Stream single service with deployment highlighting
stream_service_deployment() {
  local service=$1
  local pipe_file="/tmp/railway-${service}-deploy-${TIMESTAMP}.log"
  
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}📡 Starting real-time monitoring: ${service}${NC}"
  
  # Create named pipe
  mkfifo "$pipe_file" 2>/dev/null || rm -f "$pipe_file" 2>/dev/null || true
  mkfifo "$pipe_file" 2>/dev/null || true
  
  # Stream Railway logs from linked app dir (Railway CLI requires project context)
  local app_dir="$REPO_ROOT/apps/$service"
  (cd "$app_dir" && railway logs) 2>&1 | \
    sed -E \
      -e "s/(build|Build|BUILD)/${GREEN}\1${NC}/g" \
      -e "s/(deploy|Deploy|DEPLOY)/${BLUE}\1${NC}/g" \
      -e "s/(started|Started|STARTED|listening|Listening)/${GREEN}\1${NC}/g" \
      -e "s/(success|Success|SUCCESS|healthy|Healthy)/${GREEN}\1${NC}/g" \
      -e "s/(fail|Fail|FAIL|error|Error|ERROR|exception|Exception)/${RED}\1${NC}/g" \
      -e "s/(warn|Warn|WARN|warning|Warning)/${YELLOW}\1${NC}/g" \
      > "$pipe_file" &
  
  local stream_pid=$!
  echo "$stream_pid:$pipe_file"
}

# Monitor both services in separate terminals or combined
monitor_both_services() {
  if check_lnav; then
    echo -e "${GREEN}✅ Using lnav for combined monitoring${NC}"
    echo ""
    
    # Create pipes for both services
    local api_pipe="/tmp/railway-api-deploy-${TIMESTAMP}.log"
    local web_pipe="/tmp/railway-web-deploy-${TIMESTAMP}.log"
    
    mkfifo "$api_pipe" "$web_pipe" 2>/dev/null || true
    
    # Start streaming both services from linked app dirs (Railway needs project context)
    echo -e "${YELLOW}📡 Starting API stream (from apps/api)...${NC}"
    (cd "$API_DIR" && railway logs) > "$api_pipe" 2>&1 &
    local api_pid=$!
    
    echo -e "${YELLOW}📡 Starting Web stream (from apps/web)...${NC}"
    (cd "$WEB_DIR" && railway logs) > "$web_pipe" 2>&1 &
    local web_pid=$!
    
    # Cleanup function
    cleanup_both() {
      echo ""
      echo -e "${YELLOW}🛑 Stopping all streams...${NC}"
      kill $api_pid $web_pid 2>/dev/null || true
      rm -f "$api_pipe" "$web_pipe" 2>/dev/null || true
      echo -e "${GREEN}✅ Cleanup complete${NC}"
      exit 0
    }
    
    trap cleanup_both EXIT INT TERM
    
    echo ""
    echo -e "${GREEN}🚀 Opening lnav with both services...${NC}"
    echo -e "${BLUE}   Press Ctrl+C to stop${NC}"
    echo ""
    echo -e "${CYAN}Deployment Event Indicators:${NC}"
    echo -e "  ${GREEN}green${NC} - Build/Deploy/Start/Success events"
    echo -e "  ${BLUE}blue${NC} - Deployment events"
    echo -e "  ${RED}red${NC} - Errors/Failures"
    echo -e "  ${YELLOW}yellow${NC} - Warnings"
    echo ""
    
    # Open lnav with both pipes
    sleep 1
    lnav "$api_pipe" "$web_pipe" || {
      cleanup_both
      exit 1
    }
  else
    # Fallback: simple combined stream with prefixes
    echo -e "${YELLOW}⚠️  lnav not available - using simple stream${NC}"
    echo -e "${BLUE}Monitoring both services (interleaved)...${NC}"
    echo -e "${BLUE}Press Ctrl+C to stop${NC}"
    echo ""
    
    # Cleanup function
    cleanup_simple() {
      echo ""
      echo -e "${YELLOW}🛑 Stopping streams...${NC}"
      pkill -f "railway logs" 2>/dev/null || true
      echo -e "${GREEN}✅ Cleanup complete${NC}"
      exit 0
    }
    
    trap cleanup_simple EXIT INT TERM
    
    # Stream both services with prefixes, from linked app dirs
    (
      (cd "$API_DIR" && railway logs) 2>&1 | sed -E 's/^/[API] /' &
      local api_pid=$!
      (cd "$WEB_DIR" && railway logs) 2>&1 | sed -E 's/^/[WEB] /' &
      local web_pid=$!
      
      wait $api_pid $web_pid
    ) || cleanup_simple
  fi
}

# Monitor single service
monitor_single_service() {
  local service=$1
  
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}📡 Monitoring ${service} deployment in real-time...${NC}"
  echo ""
  
  if check_lnav; then
    local pipe_file="/tmp/railway-${service}-deploy-${TIMESTAMP}.log"
    mkfifo "$pipe_file" 2>/dev/null || rm -f "$pipe_file" 2>/dev/null || true
    mkfifo "$pipe_file" 2>/dev/null || true
    
    (cd "$REPO_ROOT/apps/$service" && railway logs) > "$pipe_file" 2>&1 &
    local stream_pid=$!
    
    cleanup_single() {
      echo ""
      echo -e "${YELLOW}🛑 Stopping stream...${NC}"
      kill $stream_pid 2>/dev/null || true
      rm -f "$pipe_file" 2>/dev/null || true
      echo -e "${GREEN}✅ Cleanup complete${NC}"
      exit 0
    }
    
    trap cleanup_single EXIT INT TERM
    
    echo -e "${GREEN}🚀 Opening lnav...${NC}"
    echo -e "${BLUE}   Press Ctrl+C to stop${NC}"
    echo ""
    
    sleep 0.5
    lnav "$pipe_file" || {
      cleanup_single
      exit 1
    }
  else
    echo -e "${YELLOW}⚠️  lnav not available - using simple stream${NC}"
    echo -e "${BLUE}Press Ctrl+C to stop${NC}"
    echo ""
    (cd "$REPO_ROOT/apps/$service" && railway logs)
  fi
}

# Check deployment status before starting (run from each app dir for correct Railway context)
check_deployment_status() {
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}📊 Current deployment status:${NC}"
  echo ""
  
  for svc in api web; do
    if [ "$SERVICE" = "both" ] || [ "$SERVICE" = "$svc" ]; then
      echo -e "${BLUE}${svc}:${NC}"
      local app_dir="$REPO_ROOT/apps/$svc"
      local status_output
      status_output=$(cd "$app_dir" && railway deployment list --service "$svc" 2>&1)
      if echo "$status_output" | grep -q "No linked project"; then
        echo -e "  ${YELLOW}⚠️  Not linked - run from $app_dir: railway link${NC}"
      elif echo "$status_output" | grep -qi "error"; then
        echo -e "  ${YELLOW}⚠️  Could not fetch - will attempt to stream anyway${NC}"
      else
        echo "$status_output" | head -5
      fi
      echo ""
    fi
  done
  
  echo -e "${GREEN}✅ Starting real-time monitoring...${NC}"
  echo ""
}

# Main execution
main() {
  # Check current status
  check_deployment_status
  
  # Start monitoring
  case "$SERVICE" in
    both)
      monitor_both_services
      ;;
    api|web)
      monitor_single_service "$SERVICE"
      ;;
    *)
      echo -e "${RED}Invalid service: $SERVICE${NC}"
      echo -e "${YELLOW}Usage: $0 [api|web|both]${NC}"
      exit 1
      ;;
  esac
}

# Run main
main
