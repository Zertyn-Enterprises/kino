#!/usr/bin/env bash
# Runs the preflight structural-integrity gate for a video: checks that the
# composition is registered in Root.tsx with correct dims/fps/timeline binding,
# required files are present, treatment is approved, and metadata is in place.
# No render required — pure source analysis.
#
#   metrics.json  — machine-readable verdict (hardGatesPass + per-gate detail)
#   metrics.txt   — human-readable verdict
# Prints PREFLIGHT: PASS|BLOCKED and exits non-zero on hard FAIL.
# All output lands in out/review/<CompId>/preflight/.
#
# Usage: scripts/preflight.sh <CompId> <slug>
#   CompId   Remotion composition ID (e.g. RelayLaunch)
#   slug     video slug matching src/videos/<slug>/ (e.g. relay)
#
# e.g. scripts/preflight.sh RelayLaunch relay
#      scripts/preflight.sh GranipaLaunch granipa
set -euo pipefail
cd "$(dirname "$0")/.."

COMP="${1:?usage: scripts/preflight.sh <CompId> <slug>}"
SLUG="${2:?usage: scripts/preflight.sh <CompId> <slug>}"

OUT="out/review/$COMP/preflight"
mkdir -p "$OUT"

METRICS_EXIT=0
node scripts/preflight-metrics.mjs "$COMP" "$SLUG" --json \
  > "$OUT/metrics.json" || METRICS_EXIT=$?
node scripts/preflight-metrics.mjs "$COMP" "$SLUG" \
  | tee "$OUT/metrics.txt" || true

echo "Preflight review — $OUT/"
echo "  metrics.json"
echo "  metrics.txt"

if [ "$METRICS_EXIT" -eq 0 ]; then
  echo "PREFLIGHT: PASS"
else
  echo "PREFLIGHT: BLOCKED"
fi

exit "$METRICS_EXIT"
