#!/usr/bin/env bash
# Runs WCAG contrast-ratio gate for a composition's resolved palette:
#   metrics.json  — machine-readable verdict (hardGatesPass + per-pair detail)
#   metrics.txt   — human-readable verdict (tee'd from contrast-metrics.mjs)
# Prints HARD GATES: PASS|FAIL and exits non-zero on HARD FAIL.
# All output lands in out/review/<slug>/contrast/.
#
# Usage:
#   scripts/contrast.sh <slug> --bg=#.. --surface=#.. --text=#.. --textDim=#.. --accent=#.. [--accentAlt=#..] [--json]
#
# The director supplies all hex values explicitly (resolved from the video's
# theme.ts — no theme.ts parsing is done here).
#
# e.g. scripts/contrast.sh relay \
#        --bg='#0A0E0B' --surface='#131A14' --text='#F2F5F0' \
#        --textDim='#8FA098' --accent='#B6F22E' --accentAlt='#E5484D'
set -euo pipefail
cd "$(dirname "$0")/.."

SLUG="${1:?usage: scripts/contrast.sh <slug> --bg=#.. --surface=#.. --text=#.. --textDim=#.. --accent=#.. [--accentAlt=#..]}"
shift

# All remaining args are passed through to contrast-metrics.mjs as-is.
METRICS_ARGS=("$@")

OUT="out/review/$SLUG/contrast"
mkdir -p "$OUT"

METRICS_EXIT=0
node scripts/contrast-metrics.mjs "${METRICS_ARGS[@]}" --json \
  > "$OUT/metrics.json" || METRICS_EXIT=$?
node scripts/contrast-metrics.mjs "${METRICS_ARGS[@]}" \
  | tee "$OUT/metrics.txt" || true

echo "Contrast review — $OUT/"
echo "  metrics.json"
echo "  metrics.txt"

if [ "$METRICS_EXIT" -eq 0 ]; then
  echo "HARD GATES: PASS"
else
  echo "HARD GATES: FAIL"
fi

exit "$METRICS_EXIT"
