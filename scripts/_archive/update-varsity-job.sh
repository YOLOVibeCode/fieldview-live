#!/bin/bash
# Update Varsity Stream URL - Railway Job Wrapper
#
# This runs as a Railway job with internal database access

set -e

echo "🔧 Updating Varsity stream URL..."
echo "Environment: Railway (internal network)"
echo ""

# Run the Node.js script
node scripts/update-varsity-stream-url-simple.js

echo ""
echo "✅ Update complete!"
