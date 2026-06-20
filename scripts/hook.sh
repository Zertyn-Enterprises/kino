#!/usr/bin/env bash
# Renders hook-window review assets for a composition:
#   frame0.png  — full-res frame 0 (thumbnail test)
#   sheet/      — contact sheet of frames 0..hookFrames at the given step
#   final.png   — full-res final frame (loop-seam comparison)
# All output lands in out/review/<CompId>/hook/.
#
# Usage: scripts/hook.sh <CompId> [hookFrames] [step=3] [propsJson]
#   hookFrames defaults to the first scene's length from the composition's
#   timeline.ts (derived via scripts/hook-window.mjs); falls back to 90 if
#   derivation fails. An explicit value overrides the auto-derived window.
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

# Concurrent-safe temp dir (PID-scoped so parallel runs don't collide).
TMP="public/review-tmp/${COMP}-hook-$$"
OUT="out/review/$COMP/hook"

rm -rf "$TMP" "$OUT/sheet"
mkdir -p "$TMP" "$OUT"

# --- 1. frame 0 — full resolution (thumbnail test) ---
STILL_ARGS=(still "$COMP" "$OUT/frame0.png" --frame=0)
if [ -n "$PROPS" ]; then
  STILL_ARGS+=("--props=$PROPS")
fi
npx remotion "${STILL_ARGS[@]}"

# --- 2. Hook-window contact sheet (frames 0..hookFrames at step) ---
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

echo "Hook review — $OUT/"
echo "  frame0.png"
echo "  sheet/"
ls "$OUT/sheet" | sed 's/^/    /'
if [ -f "$OUT/final.png" ]; then
  echo "  final.png"
fi
