#!/usr/bin/env bash
# Runs the static code-craft gate for a video: scans scenes/** and theme.ts for
# source-level AI-tells (emoji, system fonts, raw hex, linear easing).
# No render required — pure source analysis.
#
#   metrics.json  — machine-readable verdict (hardGatesPass + per-gate detail)
#   metrics.txt   — human-readable verdict
# Prints HARD GATES: PASS|FAIL and exits non-zero on hard FAIL.
# All output lands in out/review/<CompId>/code-craft/.
#
# Usage: scripts/code-craft.sh <CompId> <slug>
#   CompId   Remotion composition ID (used for output path, e.g. RelayLaunch)
#   slug     video slug matching src/videos/<slug>/ (e.g. relay)
#
# e.g. scripts/code-craft.sh RelayLaunch relay
#      scripts/code-craft.sh GranipaLaunch granipa
set -euo pipefail
cd "$(dirname "$0")/.."

COMP="${1:?usage: scripts/code-craft.sh <CompId> <slug>}"
SLUG="${2:?usage: scripts/code-craft.sh <CompId> <slug>}"

OUT="out/review/$COMP/code-craft"
mkdir -p "$OUT"

METRICS_EXIT=0
node scripts/code-craft-metrics.mjs "$SLUG" --json \
  > "$OUT/metrics.json" || METRICS_EXIT=$?
node scripts/code-craft-metrics.mjs "$SLUG" \
  | tee "$OUT/metrics.txt" || true

echo "Code-craft review — $OUT/"
echo "  metrics.json"
echo "  metrics.txt"

if [ "$METRICS_EXIT" -eq 0 ]; then
  echo "HARD GATES: PASS"
else
  echo "HARD GATES: FAIL"
fi

exit "$METRICS_EXIT"
