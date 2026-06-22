#!/usr/bin/env bash
# Renders whole-timeline motion review assets for a composition:
#   strip/            — contact-sheet filmstrip at full cut (every STEP frames)
#   metrics.json      — machine-readable verdict (hardGatesPass + per-gate detail)
#   metrics.txt       — human-readable verdict (tee'd from motion-metrics.mjs)
# Prints HARD GATES: PASS|FAIL and exits non-zero on hard FAIL.
# All output lands in out/review/<CompId>/motion/.
#
# Usage: scripts/motion.sh <CompId> [step=3] [propsJson] [--window=S:E]
#   step        sampling step in frames (default 3); lower = more samples, slower
#   propsJson   JSON props string passed to remotion
#   --window=   restrict motion-metrics.mjs analysis to [S, E] frame range
#
# e.g. scripts/motion.sh RelayLaunch
#      scripts/motion.sh GranipaLaunch 3 '' --window=0:299
set -euo pipefail
cd "$(dirname "$0")/.."

COMP="${1:?usage: scripts/motion.sh <CompId> [step=3] [propsJson] [--window=S:E]}"
STEP="${2:-3}"
PROPS="${3:-}"

# Pass --window and any other options through to motion-metrics.mjs.
METRICS_OPTS=()
for arg in "${@:4}"; do
  METRICS_OPTS+=("$arg")
done

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
TMP="public/review-tmp/${COMP}-motion-$$"
OUT="out/review/$COMP/motion"

rm -rf "$TMP" "$OUT/strip"
mkdir -p "$TMP" "$OUT"

# --- 1. Render frames 0..FINAL_FRAME at STEP as PNG sequence (0.25 scale) ---
# PNG format is required by motion-metrics.mjs (zero-dep PNG decoder).
# 0.25 scale keeps files small; luminance deltas are valid at any resolution.
RENDER_ARGS=(render "$COMP" "$TMP" --sequence --image-format=png \
  --scale=0.25 --every-nth-frame="$STEP" --frames="0-$FINAL_FRAME")
if [ -n "$PROPS" ]; then
  RENDER_ARGS+=("--props=$PROPS")
fi
npx remotion "${RENDER_ARGS[@]}"

# Collect rendered PNG files in frame order and build index arrays.
FRAMES=""
FILES=""
METRICS_FRAMES=()
INDEX=0
while IFS= read -r FILE; do
  ABS_FILE="$(pwd)/$TMP/$FILE"
  FRAMES+="${FRAMES:+,}$((INDEX * STEP))"
  FILES+="${FILES:+,}\"$FILE\""
  METRICS_FRAMES+=("$ABS_FILE")
  INDEX=$((INDEX + 1))
done < <(ls "$TMP" | sort -t- -k2 -n)

SAMPLE_COUNT="$INDEX"

# --- 2. Full-cut contact sheet ---
mkdir -p "$OUT/strip"
npx remotion render ContactSheet "$OUT/strip" --sequence --image-format=png \
  --props="{\"folder\":\"review-tmp/${COMP}-motion-$$\",\"frames\":[$FRAMES],\"files\":[$FILES]}"

# --- 3. Pixel metrics (reuse the same PNG sequence) ---
METRICS_ARGS=("${METRICS_FRAMES[@]}" --step="$STEP" --fps=30 "${METRICS_OPTS[@]}")

METRICS_EXIT=0
node scripts/motion-metrics.mjs "${METRICS_ARGS[@]}" --json \
  > "$OUT/metrics.json" || METRICS_EXIT=$?
node scripts/motion-metrics.mjs "${METRICS_ARGS[@]}" \
  | tee "$OUT/metrics.txt" || true

rm -rf "$TMP"
rmdir public/review-tmp 2>/dev/null || true

echo "Motion review — $OUT/"
echo "  strip/        ($SAMPLE_COUNT frames at step $STEP)"
echo "  metrics.json"
echo "  metrics.txt"

if [ "$METRICS_EXIT" -eq 0 ]; then
  echo "HARD GATES: PASS"
else
  echo "HARD GATES: FAIL"
fi

exit "$METRICS_EXIT"
