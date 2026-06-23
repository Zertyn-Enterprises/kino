#!/usr/bin/env bash
# Distinctiveness gate: verifies ≥4-axis anti-template rule (render-free).
#   out/review/<slug>/distinct/metrics.json  — machine-readable verdict
#   out/review/<slug>/distinct/report.txt    — human-readable verdict
# Parses _registry.md; no render required.
# Prints DISTINCT: PASS|BLOCKED|SKIP and exits non-zero on HARD fail.
#
# Usage:
#   scripts/distinct.sh <slug> [--bg=#.. --accent=#.. --luminance=.. --arc=. --bpm=.. --grain=..]
#   <slug>             candidate slug (matches registry entry or pre-registry override-only run)
#   --bg=#rrggbb       override candidate bg hex (for use at theme-lock before registry finalized)
#   --accent=#rrggbb   override candidate accent hex
#   --luminance=dark   override candidate luminance class (dark|light|tonal)
#   --arc=B            override candidate arc letter (A–E)
#   --bpm=120          override candidate bpm value
#   --grain=5          override candidate grain %
#
# e.g.  scripts/distinct.sh relay
#       scripts/distinct.sh granipa
#       scripts/distinct.sh newvideo --bg='#001122' --accent='#ff8800'
set -euo pipefail
cd "$(dirname "$0")/.."

SLUG="${1:?usage: scripts/distinct.sh <slug> [--bg=#.. --accent=#.. ...]}"
shift

# Collect pass-through flags.
RUNNER_OPTS=()
for arg in "$@"; do
  RUNNER_OPTS+=("$arg")
done

REGISTRY="src/videos/_registry.md"
if [ ! -f "$REGISTRY" ]; then
  echo "ERROR: registry not found: $REGISTRY" >&2
  exit 1
fi

OUT="out/review/$SLUG/distinct"
mkdir -p "$OUT"

METRICS_EXIT=0
node scripts/distinct-metrics.mjs "$SLUG" --registry="$REGISTRY" "${RUNNER_OPTS[@]}" --json \
  > "$OUT/metrics.json" || METRICS_EXIT=$?
node scripts/distinct-metrics.mjs "$SLUG" --registry="$REGISTRY" "${RUNNER_OPTS[@]}" \
  | tee "$OUT/report.txt" || true

echo "Distinctiveness review — $OUT/"
echo "  metrics.json"
echo "  report.txt"

# Determine verdict label from metrics.json.
SKIP_FLAG=$(node -e "const m=JSON.parse(require('fs').readFileSync('$OUT/metrics.json','utf8')); process.stdout.write(m.skip?'1':'0')" 2>/dev/null || echo "0")

if [ "$SKIP_FLAG" = "1" ]; then
  echo "DISTINCT: SKIP"
elif [ "$METRICS_EXIT" -eq 0 ]; then
  echo "DISTINCT: PASS"
else
  echo "DISTINCT: BLOCKED"
fi

exit "$METRICS_EXIT"
