#!/bin/bash
# Monitor Railway deployment status
# Usage: ./scripts/monitor-deployment.sh [service] [interval]
# Example: ./scripts/monitor-deployment.sh api 10

set -euo pipefail

SERVICE="${1:-api}"
INTERVAL="${2:-10}"

echo "🔍 Monitoring Railway deployment for service: $SERVICE"
echo "⏱️  Check interval: ${INTERVAL}s"
echo ""

# Get current deployment status
get_status() {
  railway deployment list --service "$SERVICE" 2>/dev/null | head -2 | tail -1 | awk '{print $3}' || echo "UNKNOWN"
}

# Monitor loop
CHECK_COUNT=0
MAX_CHECKS=60  # 10 minutes max (60 checks * 10s = 600s)

while [ $CHECK_COUNT -lt $MAX_CHECKS ]; do
  STATUS=$(get_status)
  TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
  
  echo "[$TIMESTAMP] Status: $STATUS (check $((CHECK_COUNT + 1))/$MAX_CHECKS)"
  
  case "$STATUS" in
    "SUCCESS")
      echo "✅ Deployment succeeded!"
      echo ""
      echo "📊 Final deployment info:"
      railway deployment list --service "$SERVICE" | head -3
      exit 0
      ;;
    "FAILED")
      echo "❌ Deployment failed!"
      echo ""
      echo "📋 Latest logs (last 50 lines):"
      railway logs --service "$SERVICE" --lines 50 || echo "Could not fetch logs"
      echo ""
      echo "📊 Failed deployment info:"
      railway deployment list --service "$SERVICE" | head -3
      exit 1
      ;;
    "BUILDING"|"DEPLOYING"|"QUEUED")
      echo "⏳ Deployment in progress..."
      ;;
    "UNKNOWN"|"")
      echo "⚠️  Could not determine status"
      ;;
    *)
      echo "ℹ️  Status: $STATUS"
      ;;
  esac
  
  CHECK_COUNT=$((CHECK_COUNT + 1))
  sleep "$INTERVAL"
done

echo ""
echo "⏰ Monitoring timeout reached (${MAX_CHECKS} checks)"
echo "📊 Current status:"
railway deployment list --service "$SERVICE" | head -3
exit 2
