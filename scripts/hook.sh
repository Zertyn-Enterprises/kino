#!/usr/bin/env bash
# Renders hook-window review assets for a composition:
#   frame0.png  — full-res frame 0 (thumbnail test)
#   early.png   — full-res frame 9 (motion-by-frame-10 sample)
#   mid.png     — full-res frame at ~60% of hook window (background-activity sample)
#   sheet/      — contact sheet of frames 0..hookFrames at the given step (skipped when corpus)
#   final.png   — full-res final frame (loop-seam comparison)
# After rendering, runs scripts/hook-metrics.mjs for objective PASS/FAIL output.
# All output lands in out/review/<CompId>/hook/.
#
# Usage: scripts/hook.sh <CompId> [hookFrames] [step=3] [propsJson]
#   hookFrames defaults to the first scene's length from the composition's
#   timeline.ts (derived via scripts/hook-window.mjs); falls back to 90 if
#   derivation fails. An explicit value overrides the auto-derived window.
#   CORPUS_MANIFEST  env var: if set to a valid manifest path, the hook-window
#                    sequence render is skipped (corpus already holds those frames);
#                    the 3 full-res review stills and final.png are always rendered.
#   e.g. scripts/hook.sh GranipaLaunch       # auto-derives hook length
#        scripts/hook.sh GranipaLaunch 73     # explicit override
set -euo pipefail
cd "$(dirname "$0")/.."

COMP="${1:?usage: scripts/hook.sh <CompId> [hookFrames] [step=3] [propsJson]}"
STEP="${3:-3}"
PROPS="${4:-}"

# Determine hook window: explicit 2nd arg overrides; else auto-derive from timeline.
if [ -n "${2:-}" ]; then
  HOOK_FRAMES="${2}"
else
  HOOK_FRAMES=$(node scripts/hook-window.mjs "$COMP" 2>/dev/null) || {
    echo "WARNING: could not derive hook window for $COMP — falling back to 90 frames" >&2
    HOOK_FRAMES=90
  }
fi

# EARLY_FRAME: frame 9 aligns with the "Motion by frame 10" gate name; clamped to HOOK_FRAMES.
EARLY_FRAME=9
if [ "$HOOK_FRAMES" -lt "$EARLY_FRAME" ]; then EARLY_FRAME="$HOOK_FRAMES"; fi

# MID_FRAME: ~60% of hook window — background-activity sample (gate 4). Clamped to HOOK_FRAMES.
MID_FRAME=$(( HOOK_FRAMES * 6 / 10 ))
if [ "$MID_FRAME" -gt "$HOOK_FRAMES" ]; then MID_FRAME="$HOOK_FRAMES"; fi

# Corpus handshake: if CORPUS_MANIFEST env var points to a valid manifest,
# consume corpus frames instead of self-rendering for the hook-window sequence.
USING_CORPUS=0
if [ -n "${CORPUS_MANIFEST:-}" ] && [ -f "${CORPUS_MANIFEST}" ]; then
  USING_CORPUS=1
fi

# Concurrent-safe temp dir (PID-scoped so parallel runs don't collide).
TMP="public/review-tmp/${COMP}-hook-$$"
OUT="out/review/$COMP/hook"

rm -rf "$OUT/sheet"
mkdir -p "$OUT"
if [ "$USING_CORPUS" -eq 0 ]; then
  rm -rf "$TMP"
  mkdir -p "$TMP"
fi

# --- 1. frame 0 — full resolution (thumbnail test) ---
STILL_ARGS=(still "$COMP" "$OUT/frame0.png" --frame=0)
if [ -n "$PROPS" ]; then
  STILL_ARGS+=("--props=$PROPS")
fi
npx remotion "${STILL_ARGS[@]}"

# --- 1.5. early frame — full resolution (motion-by-frame-10 sample) ---
EARLY_ARGS=(still "$COMP" "$OUT/early.png" --frame="$EARLY_FRAME")
if [ -n "$PROPS" ]; then
  EARLY_ARGS+=("--props=$PROPS")
fi
npx remotion "${EARLY_ARGS[@]}"

# --- 1.6. mid frame — full resolution (~60% of hook window; background-activity sample) ---
MID_ARGS=(still "$COMP" "$OUT/mid.png" --frame="$MID_FRAME")
if [ -n "$PROPS" ]; then
  MID_ARGS+=("--props=$PROPS")
fi
npx remotion "${MID_ARGS[@]}"

if [ "$USING_CORPUS" -eq 0 ]; then
  # --- 2. Hook-window contact sheet (frames 0..hookFrames at step) ---
  # Skipped when CORPUS_MANIFEST is set; corpus is 0.25-scale PNG which
  # ContactSheet can't consume directly (requires public/-relative paths).
  RENDER_ARGS=(render "$COMP" "$TMP" --sequence --image-format=jpeg \
    --scale=0.25 --every-nth-frame="$STEP" --frames="0-$HOOK_FRAMES")
  if [ -n "$PROPS" ]; then
    RENDER_ARGS+=("--props=$PROPS")
  fi
  npx remotion "${RENDER_ARGS[@]}"

  FRAMES=""
  FILES=""
  INDEX=0
  while IFS= read -r FILE; do
    FRAMES+="${FRAMES:+,}$((INDEX * STEP))"
    FILES+="${FILES:+,}\"$FILE\""
    INDEX=$((INDEX + 1))
  done < <(ls "$TMP" | sort -t- -k2 -n)

  mkdir -p "$OUT/sheet"
  npx remotion render ContactSheet "$OUT/sheet" --sequence --image-format=png \
    --props="{\"folder\":\"review-tmp/${COMP}-hook-$$\",\"frames\":[$FRAMES],\"files\":[$FILES]}"

  rm -rf "$TMP"
  rmdir public/review-tmp 2>/dev/null || true
fi

# --- 3. final frame — full resolution (loop-seam comparison) ---
# Parse total duration from `npx remotion compositions`; the line format is:
#   <CompId>  <fps>  <WxH>  <durationInFrames>  (<sec>)
# We find the WxH field and take the next token as the frame count.
DURATION=$(npx remotion compositions 2>&1 \
  | awk -v comp="$COMP" '
      $1 == comp {
        for (i = 2; i <= NF; i++)
          if ($i ~ /^[0-9]+x[0-9]+$/ && $(i+1) ~ /^[0-9]+$/) { print $(i+1); exit }
      }')

if [ -z "$DURATION" ]; then
  echo "WARNING: could not determine duration for $COMP — final.png skipped" >&2
else
  FINAL_FRAME=$((DURATION - 1))
  FINAL_ARGS=(still "$COMP" "$OUT/final.png" --frame="$FINAL_FRAME")
  if [ -n "$PROPS" ]; then
    FINAL_ARGS+=("--props=$PROPS")
  fi
  npx remotion "${FINAL_ARGS[@]}"
fi

# --- 4. Pixel metrics ---
# Capture JSON first (artifact of record), then display + tee human-readable.
# METRICS_EXIT is captured before summary output so a FAIL is reported after
# all artifacts are written, not mid-flight (preserves set -euo pipefail intent).
METRICS_EXIT=0
node scripts/hook-metrics.mjs "$OUT/frame0.png" "$OUT/early.png" "$OUT/mid.png" "$OUT/final.png" --json \
  > "$OUT/metrics.json" || METRICS_EXIT=$?
node scripts/hook-metrics.mjs "$OUT/frame0.png" "$OUT/early.png" "$OUT/mid.png" "$OUT/final.png" \
  | tee "$OUT/metrics.txt" || true

echo "Hook review — $OUT/"
echo "  frame0.png"
echo "  early.png  (frame $EARLY_FRAME)"
echo "  mid.png    (frame $MID_FRAME)"
if [ -d "$OUT/sheet" ]; then
  echo "  sheet/"
  ls "$OUT/sheet" | sed 's/^/    /'
fi
if [ -f "$OUT/final.png" ]; then
  echo "  final.png"
fi
echo "  metrics.json"
echo "  metrics.txt"

if [ "$METRICS_EXIT" -eq 0 ]; then
  echo "HARD GATES: PASS"
else
  echo "HARD GATES: FAIL"
fi

exit "$METRICS_EXIT"
