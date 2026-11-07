#!/usr/bin/env bash
# Refresh the vendored @noctusoft/store-client from the relay repository.
#
#   scripts/sync-store-client.sh [git-ref]      (default: main)
#
# Downloads index.js, index.d.ts and README.md of noctusoft-relay/packages/store-client
# at that commit into packages/store-client and records the commit in VENDORED.md.
# Needs the GitHub CLI (`gh`) signed in to an account that can read the relay repo.
set -euo pipefail

REF="${1:-main}"
REPO="rvegajr/noctusoft-relay"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$ROOT/packages/store-client"

SHA="$(gh api "repos/$REPO/commits/$REF" --jq .sha)"
for f in index.js index.d.ts README.md; do
  gh api "repos/$REPO/contents/packages/store-client/$f?ref=$SHA" --jq .content | base64 -d > "$DIR/$f"
done
node --check "$DIR/index.js"

TODAY="$(date +%Y-%m-%d)"
perl -0pi -e "s/^Commit: .*\$/Commit: $SHA/m; s/^Synced: .*\$/Synced: $TODAY/m" "$DIR/VENDORED.md"

echo "packages/store-client synced to $REPO@$SHA"
