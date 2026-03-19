#!/usr/bin/env bash
# Railway Logs Debugging Script - Fast, Searchable, Indexed
# 
# Downloads Railway logs via MCP (or CLI fallback) and opens in lnav for powerful analysis
#
# Usage:
#   ./scripts/debug-railway-logs.sh [api|web|all] [lines] [options]
#
# Options:
#   --errors-only    Download only error lines
#   --no-lnav        Don't open lnav (just download)
#   --search TERM    Pre-filter logs for search term
#   --deployments    Focus on deployment events (start, success, failure)
#   --stream         Stream logs in real-time (doesn't save to file)
#   --follow         Follow logs (like tail -f, opens in lnav)
#
# Examples:
#   ./scripts/debug-railway-logs.sh api 1000              # Get 1000 lines, open in lnav
#   ./scripts/debug-railway-logs.sh api 500 --errors-only # Errors only
#   ./scripts/debug-railway-logs.sh all 2000 --search "unlock" # Search for "unlock"
#   ./scripts/debug-railway-logs.sh api 5000 --deployments # Track deployments
#   ./scripts/debug-railway-logs.sh api --stream           # Real-time streaming
#   ./scripts/debug-railway-logs.sh api --follow           # Follow logs (tail -f in lnav)
#
# Features:
#   - Uses Railway MCP (fast, 3-5s) or CLI fallback
#   - Saves logs with timestamps for indexing
#   - Opens in lnav for SQL queries, filtering, regex
#   - Automatic error extraction
#   - Searchable, indexed format
#   - Real-time streaming with --follow flag
#
# Related:
#   ./scripts/monitor-deployments-realtime.sh both  # Monitor both API and Web deployments

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Parse arguments
SERVICE="${1:-api}"
LINES="${2:-1000}"
ERRORS_ONLY=false
NO_LNAV=false
SEARCH_TERM=""
DEPLOYMENTS_ONLY=false
STREAM_MODE=false
FOLLOW_MODE=false

# Parse arguments
SERVICE="${1:-api}"

# Check if first arg is a flag (stream/follow mode)
if [[ "$SERVICE" == "--stream" ]] || [[ "$SERVICE" == "--follow" ]]; then
  if [[ "$SERVICE" == "--follow" ]]; then
    FOLLOW_MODE=true
  else
    STREAM_MODE=true
  fi
  SERVICE="${2:-api}"  # Service is second arg
  shift 2 2>/dev/null || shift 1 2>/dev/null || true
else
  LINES="${2:-1000}"
  shift 2 2>/dev/null || true
fi

while [[ $# -gt 0 ]]; do
  case $1 in
    --errors-only)
      ERRORS_ONLY=true
      shift
      ;;
    --no-lnav)
      NO_LNAV=true
      shift
      ;;
    --search)
      SEARCH_TERM="$2"
      shift 2
      ;;
    --deployments)
      DEPLOYMENTS_ONLY=true
      shift
      ;;
    --stream)
      STREAM_MODE=true
      shift
      ;;
    --follow)
      FOLLOW_MODE=true
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$REPO_ROOT/logs/railway/debug"

mkdir -p "$LOG_DIR"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          🔍 Railway Logs Debugging (Fast & Searchable)               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check for lnav
check_lnav() {
  if ! command -v lnav &> /dev/null; then
    echo -e "${YELLOW}⚠️  lnav not found${NC}"
    echo -e "${BLUE}Install with:${NC}"
    echo -e "  ${GREEN}brew install lnav${NC}  # macOS"
    echo -e "  ${GREEN}apt install lnav${NC}     # Linux"
    echo ""
    echo -e "${YELLOW}Continuing without lnav...${NC}"
    return 1
  fi
  return 0
}

# Download logs via Railway MCP (preferred) or CLI (fallback)
download_logs() {
  local service=$1
  local lines=$2
  local output_file="$LOG_DIR/${service}-${TIMESTAMP}.log"
  local start_time=$(date +%s.%N)
  
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}📥 Downloading ${service} logs...${NC}"
  
  # For downloads, check MCP-first but allow auto-continue for non-interactive use
  # Real-time streaming always uses CLI (best for streaming)
  if [ -f "$SCRIPT_DIR/require-railway-mcp.sh" ]; then
    source "$SCRIPT_DIR/require-railway-mcp.sh"
    if ! require_railway_mcp >/dev/null 2>&1; then
      # MCP is available - suggest it but continue automatically
      echo -e "${GREEN}✅ Railway MCP is available${NC}"
      echo -e "${BLUE}   💡 Tip: For faster downloads, use Railway MCP in Composer${NC}"
      echo -e "${YELLOW}   Continuing with CLI (automatic)...${NC}"
      echo ""
    fi
  fi
  
  # CLI fallback (run from app dir so Railway has project context)
  echo -e "${YELLOW}   🔄 Using CLI (from apps/$service)...${NC}"
  (cd "$REPO_ROOT/apps/$service" && railway logs --service "$service" --lines "$lines") > "$output_file" 2>&1 || {
    echo -e "${RED}   ❌ Download failed${NC}"
    return 1
  }
  
  local end_time=$(date +%s.%N)
  local duration=$(echo "scale=2; $end_time - $start_time" | bc)
  local line_count=$(wc -l < "$output_file" 2>/dev/null | tr -d ' ' || echo "0")
  
  echo -e "${GREEN}   ✅ Logs saved: ${output_file}${NC}"
  echo -e "${GREEN}   ⏱️  Download time: ${duration}s (${line_count} lines)${NC}"
  if [ "$(echo "$duration > 0" | bc)" -eq 1 ] && [ "$line_count" -gt 0 ]; then
    echo -e "${GREEN}   📊 Throughput: $(echo "scale=2; $line_count / $duration" | bc) lines/second${NC}"
  fi
  echo ""
  
  # Apply filters
  if [ "$ERRORS_ONLY" = true ] || [ -n "$SEARCH_TERM" ] || [ "$DEPLOYMENTS_ONLY" = true ]; then
    local filtered_file="$LOG_DIR/${service}-filtered-${TIMESTAMP}.log"
    local filter_start=$(date +%s.%N)
    
    echo -e "${YELLOW}   🔍 Applying filters...${NC}"
    
    if [ "$DEPLOYMENTS_ONLY" = true ]; then
      # Filter for deployment-related events
      grep -iE "deploy|deployment|build|railway|nixpacks|starting|started|listening|server started|build.*success|build.*fail|deploy.*success|deploy.*fail|container|healthcheck|health check" "$output_file" > "$filtered_file" 2>/dev/null || true
      echo -e "${BLUE}   Filter: Deployment events${NC}"
    elif [ "$ERRORS_ONLY" = true ] && [ -n "$SEARCH_TERM" ]; then
      grep -iE "error|ERROR|fail|FAIL|exception|Exception|crash|Crash|warn|WARN" "$output_file" | \
        grep -i "$SEARCH_TERM" > "$filtered_file" 2>/dev/null || true
      echo -e "${BLUE}   Filter: Errors + \"${SEARCH_TERM}\"${NC}"
    elif [ "$ERRORS_ONLY" = true ]; then
      grep -iE "error|ERROR|fail|FAIL|exception|Exception|crash|Crash|warn|WARN" "$output_file" > "$filtered_file" 2>/dev/null || true
      echo -e "${BLUE}   Filter: Errors only${NC}"
    elif [ -n "$SEARCH_TERM" ]; then
      grep -i "$SEARCH_TERM" "$output_file" > "$filtered_file" 2>/dev/null || true
      echo -e "${BLUE}   Filter: \"${SEARCH_TERM}\"${NC}"
    fi
    
    local filter_end=$(date +%s.%N)
    local filter_duration=$(echo "scale=2; $filter_end - $filter_start" | bc)
    local filtered_lines=$(wc -l < "$filtered_file" 2>/dev/null | tr -d ' ' || echo "0")
    
    if [ "$filtered_lines" -gt 0 ]; then
      echo -e "${GREEN}   ✅ Filtered logs: ${filtered_file} (${filtered_lines} lines)${NC}"
      echo -e "${GREEN}   ⏱️  Filter time: ${filter_duration}s${NC}"
      echo "$filtered_file"
    else
      echo -e "${YELLOW}   ⚠️  No matches found${NC}"
      echo "$output_file"
    fi
  else
    echo "$output_file"
  fi
}

# Create lnav configuration for better parsing
setup_lnav_config() {
  local config_dir="$HOME/.lnav"
  mkdir -p "$config_dir"
  
  # Create format file for Railway logs if it doesn't exist
  local format_file="$config_dir/formats/railway.json"
  if [ ! -f "$format_file" ]; then
    mkdir -p "$config_dir/formats"
    cat > "$format_file" <<'EOF'
{
  "railway_log": {
    "title": "Railway Logs",
    "description": "Railway service logs with timestamps",
    "url": "https://railway.app",
    "regex": {
      "railway": {
        "pattern": "^(?<timestamp>\\d{4}-\\d{2}-\\d{2}[T ]\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?(?:Z|[+-]\\d{2}:\\d{2})?)\\s+(?<level>\\w+)\\s+(?<body>.*)$",
        "timestamp-field": "timestamp",
        "timestamp-format": [
          "%Y-%m-%dT%H:%M:%S.%f",
          "%Y-%m-%dT%H:%M:%S",
          "%Y-%m-%d %H:%M:%S.%f",
          "%Y-%m-%d %H:%M:%S"
        ]
      }
    },
    "level-field": "level",
    "body-field": "body",
    "sample": [
      {
        "line": "2026-01-23T10:26:00.123Z INFO Server started on port 4301"
      }
    ]
  }
}
EOF
    echo -e "${GREEN}✅ Created lnav format configuration${NC}"
  fi
}

# Open logs in lnav (accepts one or more paths)
open_lnav() {
  if [ "$NO_LNAV" = true ]; then
    echo -e "${YELLOW}⚠️  lnav disabled (--no-lnav)${NC}"
    return 0
  fi
  
  if [ $# -eq 0 ]; then
    echo -e "${RED}No log files to open${NC}"
    return 1
  fi
  
  if ! check_lnav; then
    echo -e "${YELLOW}⚠️  Opening logs in default editor instead...${NC}"
    ${EDITOR:-nano} "$1" || cat "$1"
    return 0
  fi
  
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}🚀 Opening logs in lnav...${NC}"
  echo ""
  echo -e "${BLUE}lnav Tips:${NC}"
  echo -e "  ${GREEN};${NC} - SQL query mode"
  echo -e "  ${GREEN}/${NC} - Search (regex supported)"
  echo -e "  ${GREEN}:filter-in${NC} - Filter to show only matching lines"
  echo -e "  ${GREEN}:filter-out${NC} - Filter to hide matching lines"
  echo -e "  ${GREEN}:goto${NC} - Jump to line number"
  echo -e "  ${GREEN}q${NC} - Quit"
  echo ""
  
  # Show deployment-specific queries if --deployments was used
  if [ "$DEPLOYMENTS_ONLY" = true ]; then
    echo -e "${BLUE}🚀 Deployment Tracking SQL Queries:${NC}"
    echo -e "  ${CYAN}SELECT log_time, log_body FROM log WHERE log_body LIKE '%deploy%' OR log_body LIKE '%build%' ORDER BY log_time${NC}"
    echo -e "  ${CYAN}SELECT log_time, log_body FROM log WHERE log_body LIKE '%started%' OR log_body LIKE '%listening%' ORDER BY log_time${NC}"
    echo -e "  ${CYAN}SELECT log_time, log_body FROM log WHERE log_body LIKE '%success%' OR log_body LIKE '%fail%' ORDER BY log_time${NC}"
    echo -e "  ${CYAN}SELECT MIN(log_time) as first_deploy, MAX(log_time) as last_deploy FROM log WHERE log_body LIKE '%deploy%'${NC}"
    echo ""
  else
    echo -e "${BLUE}Example SQL Queries:${NC}"
    echo -e "  ${CYAN}SELECT * FROM log WHERE log_body LIKE '%error%'${NC}"
    echo -e "  ${CYAN}SELECT * FROM log WHERE log_time > datetime('now', '-1 hour')${NC}"
    echo -e "  ${CYAN}SELECT log_body, COUNT(*) FROM log GROUP BY log_body${NC}"
    echo ""
    echo -e "${BLUE}💡 Tip: Use ${YELLOW}--deployments${NC} flag for deployment tracking${NC}"
    echo ""
  fi
  
  # Setup lnav config
  setup_lnav_config
  
  # Open in lnav (all arguments as files)
  lnav "$@" || {
    echo -e "${RED}❌ Failed to open lnav${NC}"
    echo -e "${YELLOW}Opening first file in editor instead...${NC}"
    ${EDITOR:-nano} "$1" || cat "$1"
  }
}

# Stream logs in real-time
stream_logs() {
  local service=$1
  
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}📡 Streaming ${service} logs in real-time...${NC}"
  echo ""
  
  # For real-time streaming, always use CLI (fastest for streaming)
  # Railway MCP is better for on-demand queries, but CLI --follow is best for real-time
  echo -e "${GREEN}✅ Starting real-time stream via Railway CLI${NC}"
  echo -e "${BLUE}   💡 Tip: For on-demand queries, use Railway MCP in Composer${NC}"
  echo ""
  
  if [ "$FOLLOW_MODE" = true ] && check_lnav; then
    # Stream to lnav in follow mode (automatic start)
    echo -e "${GREEN}   📡 Streaming to lnav (follow mode)...${NC}"
    echo -e "${BLUE}   Press Ctrl+C to stop${NC}"
    echo ""
    
    # Create named pipe for lnav
    local pipe_file="/tmp/railway-${service}-stream-${TIMESTAMP}.log"
    mkfifo "$pipe_file" 2>/dev/null || rm -f "$pipe_file" 2>/dev/null || true
    mkfifo "$pipe_file" 2>/dev/null || true
    
    # Stream from app dir so Railway has project context
    (cd "$REPO_ROOT/apps/$service" && railway logs) > "$pipe_file" 2>&1 &
    local stream_pid=$!
    
    # Cleanup function
    cleanup_stream() {
      echo ""
      echo -e "${YELLOW}🛑 Stopping stream...${NC}"
      kill $stream_pid 2>/dev/null || true
      rm -f "$pipe_file" 2>/dev/null || true
      echo -e "${GREEN}✅ Cleanup complete${NC}"
      exit 0
    }
    
    # Trap signals for proper cleanup
    # EXIT - normal exit, error exit, or function return
    # SIGINT - Ctrl+C
    # SIGTERM - termination signal
    trap cleanup_stream EXIT INT TERM
    
    # Small delay to ensure pipe has data
    sleep 0.5
    
    # Open lnav with the pipe (automatic start)
    echo -e "${GREEN}   🚀 Opening lnav...${NC}"
    lnav "$pipe_file" || {
      cleanup_stream
      echo -e "${RED}❌ Failed to open lnav${NC}"
      echo -e "${YELLOW}Falling back to simple stream...${NC}"
      (cd "$REPO_ROOT/apps/$service" && railway logs)
      exit 1
    }
    
    # If lnav exits normally, cleanup will be handled by trap
  else
    # Simple stream (no lnav) - run from app dir
    echo -e "${GREEN}   📡 Streaming logs (from apps/$service)...${NC}"
    echo -e "${BLUE}   Press Ctrl+C to stop${NC}"
    echo ""
    (cd "$REPO_ROOT/apps/$service" && railway logs)
  fi
}

# Main execution
main() {
  # Handle streaming mode
  if [ "$STREAM_MODE" = true ] || [ "$FOLLOW_MODE" = true ]; then
    case "$SERVICE" in
      api|web)
        stream_logs "$SERVICE"
        ;;
      *)
        echo -e "${RED}Invalid service for streaming: $SERVICE${NC}"
        echo -e "${YELLOW}Usage: $0 [api|web] --stream${NC}"
        exit 1
        ;;
    esac
    return 0
  fi
  
  # Normal download mode
  local log_files=()
  
  case "$SERVICE" in
    api|web)
      local log_file=$(download_logs "$SERVICE" "$LINES")
      log_files+=("$log_file")
      ;;
    all)
      local api_file=$(download_logs "api" "$LINES")
      local web_file=$(download_logs "web" "$LINES")
      log_files+=("$api_file")
      log_files+=("$web_file")
      ;;
    *)
      echo -e "${RED}Invalid service: $SERVICE${NC}"
      echo -e "${YELLOW}Usage: $0 [api|web|all] [lines] [options]${NC}"
      exit 1
      ;;
  esac
  
  # Summary
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}✅ Download complete${NC}"
  echo ""
  echo -e "${BLUE}📁 Log files:${NC}"
  for file in "${log_files[@]}"; do
    local size=$(ls -lh "$file" 2>/dev/null | awk '{print $5}' || echo "?")
    local lines=$(wc -l < "$file" 2>/dev/null | tr -d ' ' || echo "0")
    echo -e "  ${GREEN}${file}${NC} (${size}, ${lines} lines)"
  done
  echo ""
  
  # Open in lnav
  if [ ${#log_files[@]} -eq 1 ]; then
    open_lnav "${log_files[0]}"
  else
    echo -e "${YELLOW}Multiple log files - opening all in lnav...${NC}"
    open_lnav "${log_files[@]}"
  fi
}

# Run main
main
