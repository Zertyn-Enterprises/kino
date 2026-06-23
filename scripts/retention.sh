#!/usr/bin/env bash
# Renders whole-timeline retention review assets for a composition:
#   strip/            — contact-sheet filmstrip at full cut (every STEP frames)
#   metrics.json      — machine-readable verdict (hardGatesPass + per-gate detail)
#   metrics.txt       — human-readable verdict (tee'd from retention-metrics.mjs)
# Prints HARD GATES: PASS|FAIL and exits non-zero on hard FAIL.
# All output lands in out/review/<CompId>/retention/.
#
# Usage: scripts/retention.sh <CompId> [step=5] [propsJson] [--holds=S:E,...] [--climax=F] [--rehook=8]
#   step        sampling step in frames (default 5); lower = more samples, slower
#   propsJson   JSON props string passed to remotion
#   --holds=    exclude declared holds from dead-air gate (S:E,... frame ranges)
#   --climax=   climax frame number for energy-build-to-climax gate
#   --rehook=   max seconds between re-hook punches (default 8)
#   CORPUS_MANIFEST  env var: if set to a valid manifest path, consume corpus frames
#                    instead of self-rendering (fallback: self-render if absent).
#
# e.g. scripts/retention.sh RelayLaunch
#      scripts/retention.sh GranipaLaunch 5 '' --climax=720 --rehook=7
set -euo pipefail
cd "$(dirname "$0")/.."

COMP="${1:?usage: scripts/retention.sh <CompId> [step=5] [propsJson] [--holds=...] [--climax=F] [--rehook=N]}"
STEP="${2:-5}"
PROPS="${3:-}"

# Pass --holds/--climax/--rehook through to retention-metrics.mjs.
METRICS_OPTS=()
for arg in "${@:4}"; do
  METRICS_OPTS+=("$arg")
done

# Corpus handshake: if CORPUS_MANIFEST env var points to a valid manifest,
# consume corpus frames instead of self-rendering.
USING_CORPUS=0
if [ -n "${CORPUS_MANIFEST:-}" ] && [ -f "${CORPUS_MANIFEST}" ]; then
  USING_CORPUS=1
fi

if [ "$USING_CORPUS" -eq 1 ]; then
  DURATION=$(MANIFEST="${CORPUS_MANIFEST}" node -e \
    "process.stdout.write(String(JSON.parse(require('fs').readFileSync(process.env.MANIFEST,'utf8')).durationFrames))")
else
  # Parse total duration from `npx remotion compositions`.
  DURATION=$(npx remotion compositions 2>&1 \
    | awk -v comp="$COMP" '
        $1 == comp {
          for (i = 2; i <= NF; i++)
            if ($i ~ /^[0-9]+x[0-9]+$/ && $(i+1) ~ /^[0-9]+$/) { print $(i+1); exit }
        }')
fi

if [ -z "$DURATION" ]; then
  echo "ERROR: could not determine duration for $COMP" >&2
  exit 1
fi

FINAL_FRAME=$((DURATION - 1))

OUT="out/review/$COMP/retention"
METRICS_FRAMES=()
SAMPLE_COUNT=0

if [ "$USING_CORPUS" -eq 1 ]; then
  mkdir -p "$OUT"
  while IFS= read -r LINE; do METRICS_FRAMES+=("$LINE"); done \
    < <(node scripts/render-corpus.mjs --list "${CORPUS_MANIFEST}" --step="$STEP" --window="0:$FINAL_FRAME")
  SAMPLE_COUNT="${#METRICS_FRAMES[@]}"
else
  # Concurrent-safe temp dir (PID-scoped so parallel runs don't collide).
  TMP="public/review-tmp/${COMP}-retention-$$"
  rm -rf "$TMP" "$OUT/strip"
  mkdir -p "$TMP" "$OUT"

  # --- 1. Render frames 0..FINAL_FRAME at STEP as PNG sequence (0.25 scale) ---
  # PNG format is required by retention-metrics.mjs (zero-dep PNG decoder).
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
    --props="{\"folder\":\"review-tmp/${COMP}-retention-$$\",\"frames\":[$FRAMES],\"files\":[$FILES]}"
fi

# --- Pixel metrics (reuse the same PNG sequence) ---
METRICS_ARGS=("${METRICS_FRAMES[@]}" --step="$STEP" --fps=30 "${METRICS_OPTS[@]}")

METRICS_EXIT=0
node scripts/retention-metrics.mjs "${METRICS_ARGS[@]}" --json \
  > "$OUT/metrics.json" || METRICS_EXIT=$?
node scripts/retention-metrics.mjs "${METRICS_ARGS[@]}" \
  | tee "$OUT/metrics.txt" || true

# Clean up self-rendered TMP frames (only when not using shared corpus).
if [ "$USING_CORPUS" -eq 0 ] && [ -n "${TMP:-}" ]; then
  rm -rf "$TMP"
  rmdir public/review-tmp 2>/dev/null || true
fi

echo "Retention review — $OUT/"
echo "  strip/        ($SAMPLE_COUNT frames at step $STEP)"
echo "  metrics.json"
echo "  metrics.txt"

if [ "$METRICS_EXIT" -eq 0 ]; then
  echo "HARD GATES: PASS"
else
  echo "HARD GATES: FAIL"
fi

exit "$METRICS_EXIT"
