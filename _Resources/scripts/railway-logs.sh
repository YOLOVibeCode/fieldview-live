#!/bin/bash

###############################################################################
# Railway Logs Helper Script
# 
# Easy access to Railway deployment logs with common filters
#
# Usage:
#   ./railway-logs.sh [command] [service] [options]
#
# Commands:
#   tail       - Stream logs in real-time (default)
#   recent     - Show last 100 lines
#   errors     - Show only error lines
#   search     - Search for specific text
#   export     - Export logs to file
#
# Services:
#   api        - API service logs
#   web        - Web service logs
#   (or leave blank for prompt)
#
# Examples:
#   ./railway-logs.sh                          # Interactive mode
#   ./railway-logs.sh tail api                 # Tail API logs
#   ./railway-logs.sh recent web               # Last 100 web logs
#   ./railway-logs.sh errors api               # API errors only
#   ./railway-logs.sh search api "unlock"      # Search API logs
#   ./railway-logs.sh export api logs.txt      # Export to file
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
COMMAND="${1:-tail}"
SERVICE="${2:-}"
SEARCH_TERM="${3:-}"

###############################################################################
# Helper Functions
###############################################################################

print_header() {
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  Railway Logs - $1${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_error() {
    echo -e "${RED}❌ Error: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Prompt for service if not provided
select_service() {
    if [ -z "$SERVICE" ]; then
        echo -e "${YELLOW}Select service:${NC}"
        echo "  1) api"
        echo "  2) web"
        echo "  3) both"
        read -p "Enter choice [1-3]: " choice
        
        case $choice in
            1) SERVICE="api" ;;
            2) SERVICE="web" ;;
            3) SERVICE="both" ;;
            *) print_error "Invalid choice"; exit 1 ;;
        esac
    fi
}

# Get logs for a service
get_logs() {
    local service=$1
    local mode=$2
    
    case $mode in
        tail)
            print_info "Tailing logs for $service (Ctrl+C to stop)..."
            railway logs --service "$service" 2>&1
            ;;
        recent)
            railway logs --service "$service" 2>&1 | tail -100
            ;;
        *)
            railway logs --service "$service" 2>&1
            ;;
    esac
}

###############################################################################
# Commands
###############################################################################

cmd_tail() {
    print_header "Tail Logs (Real-time)"
    select_service
    
    if [ "$SERVICE" = "both" ]; then
        print_info "Opening logs in split view..."
        print_info "API logs:"
        railway logs --service api 2>&1 | sed 's/^/[API] /' &
        PID_API=$!
        
        print_info "Web logs:"
        railway logs --service web 2>&1 | sed 's/^/[WEB] /' &
        PID_WEB=$!
        
        # Wait for both
        wait $PID_API $PID_WEB
    else
        get_logs "$SERVICE" "tail"
    fi
}

cmd_recent() {
    print_header "Recent Logs (Last 100 lines)"
    select_service
    
    if [ "$SERVICE" = "both" ]; then
        echo -e "${GREEN}━━━ API Service (last 50) ━━━${NC}"
        get_logs "api" "recent" | tail -50
        echo ""
        echo -e "${GREEN}━━━ Web Service (last 50) ━━━${NC}"
        get_logs "web" "recent" | tail -50
    else
        get_logs "$SERVICE" "recent"
    fi
}

cmd_errors() {
    print_header "Error Logs Only"
    select_service
    
    print_info "Filtering for errors in $SERVICE logs..."
    
    if [ "$SERVICE" = "both" ]; then
        echo -e "${RED}━━━ API Errors ━━━${NC}"
        railway logs --service api 2>&1 | grep -i "error\|fail\|exception" | tail -50 || echo "No errors found"
        echo ""
        echo -e "${RED}━━━ Web Errors ━━━${NC}"
        railway logs --service web 2>&1 | grep -i "error\|fail\|exception" | tail -50 || echo "No errors found"
    else
        railway logs --service "$SERVICE" 2>&1 | grep -i "error\|fail\|exception" | tail -100 || echo "No errors found"
    fi
}

cmd_search() {
    print_header "Search Logs"
    select_service
    
    if [ -z "$SEARCH_TERM" ]; then
        read -p "Enter search term: " SEARCH_TERM
    fi
    
    if [ -z "$SEARCH_TERM" ]; then
        print_error "Search term is required"
        exit 1
    fi
    
    print_info "Searching for '$SEARCH_TERM' in $SERVICE logs..."
    railway logs --service "$SERVICE" 2>&1 | grep -i "$SEARCH_TERM" | tail -100 || echo "No matches found"
}

cmd_export() {
    print_header "Export Logs"
    select_service
    
    OUTPUT_FILE="${SEARCH_TERM:-railway-logs-$(date +%Y%m%d-%H%M%S).txt}"
    
    print_info "Exporting $SERVICE logs to $OUTPUT_FILE..."
    railway logs --service "$SERVICE" 2>&1 > "$OUTPUT_FILE"
    
    print_success "Logs exported to $OUTPUT_FILE"
    print_info "Lines: $(wc -l < "$OUTPUT_FILE")"
}

cmd_help() {
    cat << 'EOF'

Railway Logs Helper - Quick Reference
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

USAGE:
  ./railway-logs.sh [command] [service] [options]

COMMANDS:
  tail       Stream logs in real-time (default)
  recent     Show last 100 lines
  errors     Show only error/fail/exception lines
  search     Search for specific text
  export     Export logs to file
  help       Show this help

SERVICES:
  api        API service
  web        Web service
  both       Both services (where applicable)

EXAMPLES:
  ./railway-logs.sh                          Interactive mode
  ./railway-logs.sh tail api                 Tail API logs live
  ./railway-logs.sh recent web               Last 100 web logs
  ./railway-logs.sh errors api               API errors only
  ./railway-logs.sh search api "unlock"      Search API for "unlock"
  ./railway-logs.sh search web "chat"        Search web for "chat"
  ./railway-logs.sh export api my-logs.txt   Export API logs

COMMON SEARCHES:
  ./railway-logs.sh search api "unlock"      Debug unlock endpoint
  ./railway-logs.sh search api "chat"        Debug chat system
  ./railway-logs.sh search api "prisma"      Database queries
  ./railway-logs.sh search web "error"       Frontend errors
  ./railway-logs.sh errors both              All errors

TIPS:
  • Use Ctrl+C to stop tailing
  • Logs are automatically filtered for relevance
  • Export logs for deeper analysis
  • Search is case-insensitive

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF
}

###############################################################################
# Main
###############################################################################

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    print_error "Railway CLI is not installed"
    echo "Install with: npm install -g @railway/cli"
    exit 1
fi

# Execute command
case $COMMAND in
    tail)
        cmd_tail
        ;;
    recent)
        cmd_recent
        ;;
    errors)
        cmd_errors
        ;;
    search)
        cmd_search
        ;;
    export)
        cmd_export
        ;;
    help|--help|-h)
        cmd_help
        ;;
    *)
        print_error "Unknown command: $COMMAND"
        echo ""
        cmd_help
        exit 1
        ;;
esac

