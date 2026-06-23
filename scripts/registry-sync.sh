#!/usr/bin/env bash
# Registry↔filesystem sync gate: cross-checks _registry.md against src/videos/.
# Render-free — pure source analysis.
#
#   out/review/registry-sync/metrics.json  — machine verdict
#   out/review/registry-sync/report.txt    — human-readable verdict
# Prints REGISTRY-SYNC: PASS|BLOCKED and exits non-zero on HARD fail.
#
# Usage: scripts/registry-sync.sh [<slug>] [--registry=<path>]
#   <slug>   optional candidate slug (checks that this slug resolves in the registry)
#
# e.g. scripts/registry-sync.sh
#      scripts/registry-sync.sh relay
#      scripts/registry-sync.sh granipa
set -euo pipefail
cd "$(dirname "$0")/.."

SLUG="${1:-}"
RUNNER_OPTS=()
if [ -n "$SLUG" ] && [[ "$SLUG" != --* ]]; then
  shift || true
  RUNNER_OPTS+=("$SLUG")
fi
for arg in "$@"; do
  RUNNER_OPTS+=("$arg")
done

OUT="out/review/registry-sync"
mkdir -p "$OUT"

METRICS_EXIT=0
node scripts/registry-sync-metrics.mjs "${RUNNER_OPTS[@]}" --json \
  > "$OUT/metrics.json" || METRICS_EXIT=$?
node scripts/registry-sync-metrics.mjs "${RUNNER_OPTS[@]}" \
  | tee "$OUT/report.txt" || true

echo "Registry sync review — $OUT/"
echo "  metrics.json"
echo "  report.txt"

if [ "$METRICS_EXIT" -eq 0 ]; then
  echo "REGISTRY-SYNC: PASS"
else
  echo "REGISTRY-SYNC: BLOCKED"
fi

exit "$METRICS_EXIT"
