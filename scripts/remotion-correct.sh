#!/usr/bin/env bash
# Runs the static Remotion-correctness gate for a video: scans scenes/**,
# theme.ts, and Main.tsx for render-breaking API misuse (HARD) and correctness
# smells (advisory). No render required — pure source analysis.
#
#   metrics.json  — machine-readable verdict (hardGatesPass + per-gate detail)
#   metrics.txt   — human-readable verdict
# Prints HARD GATES: PASS|FAIL and exits non-zero on hard FAIL.
# All output lands in out/review/<CompId>/remotion-correct/.
#
# Usage: scripts/remotion-correct.sh <CompId> <slug>
#   CompId   Remotion composition ID (used for output path, e.g. RelayLaunch)
#   slug     video slug matching src/videos/<slug>/ (e.g. relay)
#
# e.g. scripts/remotion-correct.sh RelayLaunch relay
#      scripts/remotion-correct.sh GranipaLaunch granipa
set -euo pipefail
cd "$(dirname "$0")/.."

COMP="${1:?usage: scripts/remotion-correct.sh <CompId> <slug>}"
SLUG="${2:?usage: scripts/remotion-correct.sh <CompId> <slug>}"

OUT="out/review/$COMP/remotion-correct"
mkdir -p "$OUT"

METRICS_EXIT=0
node scripts/remotion-correct-metrics.mjs "$SLUG" --json \
  > "$OUT/metrics.json" || METRICS_EXIT=$?
node scripts/remotion-correct-metrics.mjs "$SLUG" \
  | tee "$OUT/metrics.txt" || true

echo "Remotion-correct review — $OUT/"
echo "  metrics.json"
echo "  metrics.txt"

if [ "$METRICS_EXIT" -eq 0 ]; then
  echo "HARD GATES: PASS"
else
  echo "HARD GATES: FAIL"
fi

exit "$METRICS_EXIT"
