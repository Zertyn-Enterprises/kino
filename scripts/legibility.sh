#!/usr/bin/env bash
# Renders whole-timeline legibility review assets for a composition:
#   metrics.json      — machine-readable verdict (hardGatesPass + per-gate detail)
#   metrics.txt       — human-readable verdict (tee'd from legibility-metrics.mjs)
# Prints HARD GATES: PASS|FAIL and exits non-zero on hard FAIL.
# All output lands in out/review/<CompId>/legibility/.
#
# Usage: scripts/legibility.sh <CompId> [step=3] [propsJson]
#   step        sampling step in frames (default 3); lower = more samples, slower
#   propsJson   JSON props string passed to remotion
#
# e.g. scripts/legibility.sh RelayLaunch
#      scripts/legibility.sh GranipaLaunch 3 ''
set -euo pipefail
cd "$(dirname "$0")/.."

COMP="${1:?usage: scripts/legibility.sh <CompId> [step=3] [propsJson]}"
STEP="${2:-3}"
PROPS="${3:-}"

# Parse total duration from `npx remotion compositions`.
DURATION=$(npx remotion compositions 2>&1 \
  | awk -v comp="$COMP" '
      $1 == comp {
        for (i = 2; i <= NF; i++)
          if ($i ~ /^[0-9]+x[0-9]+$/ && $(i+1) ~ /^[0-9]+$/) { print $(i+1); exit }
      }')

if [ -z "$DURATION" ]; then
  echo "ERROR: could not determine duration for $COMP" >&2
  exit 1
fi

FINAL_FRAME=$((DURATION - 1))

# Concurrent-safe temp dir (PID-scoped so parallel runs don't collide).
TMP="public/review-tmp/${COMP}-legibility-$$"
OUT="out/review/$COMP/legibility"

rm -rf "$TMP"
mkdir -p "$TMP" "$OUT"

# --- 1. Render frames 0..FINAL_FRAME at STEP as PNG sequence (0.25 scale) ---
# PNG format is required by legibility-metrics.mjs (zero-dep PNG decoder).
# 0.25 scale keeps files small; edge-density and luminance deltas are valid at any resolution.
RENDER_ARGS=(render "$COMP" "$TMP" --sequence --image-format=png \
  --scale=0.25 --every-nth-frame="$STEP" --frames="0-$FINAL_FRAME")
if [ -n "$PROPS" ]; then
  RENDER_ARGS+=("--props=$PROPS")
fi
npx remotion "${RENDER_ARGS[@]}"

# Collect rendered PNG files in frame order.
METRICS_FRAMES=()
INDEX=0
while IFS= read -r FILE; do
  ABS_FILE="$(pwd)/$TMP/$FILE"
  METRICS_FRAMES+=("$ABS_FILE")
  INDEX=$((INDEX + 1))
done < <(ls "$TMP" | sort -t- -k2 -n)

SAMPLE_COUNT="$INDEX"

# --- 2. Pixel metrics ---
METRICS_ARGS=("${METRICS_FRAMES[@]}" --step="$STEP" --fps=30)

METRICS_EXIT=0
node scripts/legibility-metrics.mjs "${METRICS_ARGS[@]}" --json \
  > "$OUT/metrics.json" || METRICS_EXIT=$?
node scripts/legibility-metrics.mjs "${METRICS_ARGS[@]}" \
  | tee "$OUT/metrics.txt" || true

rm -rf "$TMP"
rmdir public/review-tmp 2>/dev/null || true

echo "Legibility review — $OUT/"
echo "  metrics.json  ($SAMPLE_COUNT frames at step $STEP)"
echo "  metrics.txt"

if [ "$METRICS_EXIT" -eq 0 ]; then
  echo "HARD GATES: PASS"
else
  echo "HARD GATES: FAIL"
fi

exit "$METRICS_EXIT"
