#!/usr/bin/env bash
# Renders closing-window payoff review assets for a composition:
#   final.png    — full-res final frame (end-card check; mirrors hook.sh)
#   metrics.json — machine-readable verdict (hardGatesPass + per-gate detail)
#   metrics.txt  — human-readable verdict (tee'd from payoff-metrics.mjs)
# Prints HARD GATES: PASS|FAIL and exits non-zero on hard FAIL.
# All output lands in out/review/<CompId>/payoff/.
#
# Usage: scripts/payoff.sh <CompId> [step=3] [propsJson] [--window=S:E]
#   step        sampling step in frames (default 3)
#   propsJson   JSON props string passed to remotion
#   --window=   closing window as start:end frame numbers (default: final 90 frames / 3s)
#   CORPUS_MANIFEST  env var: if set to a valid manifest path, consume corpus frames
#                    instead of self-rendering (fallback: self-render if absent).
#
# e.g. scripts/payoff.sh RelayLaunch
#      scripts/payoff.sh GranipaLaunch 3 '' --window=870:959
set -euo pipefail
cd "$(dirname "$0")/.."

COMP="${1:?usage: scripts/payoff.sh <CompId> [step=3] [propsJson] [--window=S:E] [--slug=<slug>]}"
STEP="${2:-3}"
PROPS="${3:-}"

# Parse --window=S:E and --slug from args 4+; remaining options pass through to payoff-metrics.mjs.
# --slug is accepted for consistency with retention.sh and ship-gate.sh auto-wiring;
# no structure flags currently apply to the payoff gate's closing-window measurement.
WINDOW_ARG=""
METRICS_OPTS=()
for arg in "${@:4}"; do
  case "$arg" in
    --window=*) WINDOW_ARG="${arg#--window=}" ;;
    --slug=*)   ;; # accepted, not forwarded — no payoff-metrics.mjs structure flags
    *)          METRICS_OPTS+=("$arg") ;;
  esac
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

# Determine closing window: --window=S:E or default (final 90 frames / 3s at 30fps).
DEFAULT_WINDOW_FRAMES=90
if [ -n "$WINDOW_ARG" ]; then
  WIN_START="${WINDOW_ARG%%:*}"
  WIN_END="${WINDOW_ARG##*:}"
else
  WIN_START=$((FINAL_FRAME - DEFAULT_WINDOW_FRAMES + 1))
  if [ "$WIN_START" -lt 0 ]; then WIN_START=0; fi
  WIN_END="$FINAL_FRAME"
fi

OUT="out/review/$COMP/payoff"
METRICS_FRAMES=()
SAMPLE_COUNT=0

if [ "$USING_CORPUS" -eq 1 ]; then
  mkdir -p "$OUT"
  while IFS= read -r LINE; do METRICS_FRAMES+=("$LINE"); done \
    < <(node scripts/render-corpus.mjs --list "${CORPUS_MANIFEST}" --step="$STEP" --window="${WIN_START}:${WIN_END}")
  SAMPLE_COUNT="${#METRICS_FRAMES[@]}"
else
  # Concurrent-safe temp dir (PID-scoped so parallel runs don't collide).
  TMP="public/review-tmp/${COMP}-payoff-$$"
  rm -rf "$TMP"
  mkdir -p "$TMP" "$OUT"

  # --- 1. Full-res final frame (end-card check) ---
  FINAL_ARGS=(still "$COMP" "$OUT/final.png" --frame="$WIN_END")
  if [ -n "$PROPS" ]; then
    FINAL_ARGS+=("--props=$PROPS")
  fi
  npx remotion "${FINAL_ARGS[@]}"

  # --- 2. Closing-window PNG sequence at 0.25 scale (for payoff-metrics.mjs) ---
  # PNG format is required by payoff-metrics.mjs (zero-dep PNG decoder).
  # 0.25 scale keeps files small; edge-density and luminance are valid at any resolution.
  RENDER_ARGS=(render "$COMP" "$TMP" --sequence --image-format=png \
    --scale=0.25 --every-nth-frame="$STEP" --frames="$WIN_START-$WIN_END")
  if [ -n "$PROPS" ]; then
    RENDER_ARGS+=("--props=$PROPS")
  fi
  npx remotion "${RENDER_ARGS[@]}"

  # Collect rendered PNG files in frame order.
  INDEX=0
  while IFS= read -r FILE; do
    ABS_FILE="$(pwd)/$TMP/$FILE"
    METRICS_FRAMES+=("$ABS_FILE")
    INDEX=$((INDEX + 1))
  done < <(ls "$TMP" | sort -t- -k2 -n)

  SAMPLE_COUNT="$INDEX"

  rm -rf "$TMP"
  rmdir public/review-tmp 2>/dev/null || true
fi

# --- Pixel metrics ---
METRICS_ARGS=("${METRICS_FRAMES[@]}" --step="$STEP" --fps=30 "${METRICS_OPTS[@]}")

METRICS_EXIT=0
node scripts/payoff-metrics.mjs "${METRICS_ARGS[@]}" --json \
  > "$OUT/metrics.json" || METRICS_EXIT=$?
node scripts/payoff-metrics.mjs "${METRICS_ARGS[@]}" \
  | tee "$OUT/metrics.txt" || true

echo "Payoff review — $OUT/"
echo "  final.png"
echo "  metrics.json  ($SAMPLE_COUNT frames at step $STEP, window ${WIN_START}:${WIN_END})"
echo "  metrics.txt"

if [ "$METRICS_EXIT" -eq 0 ]; then
  echo "HARD GATES: PASS"
else
  echo "HARD GATES: FAIL"
fi

exit "$METRICS_EXIT"
