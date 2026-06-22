#!/usr/bin/env bash
# Runs the full ship gate: hook.sh + retention.sh + contrast.sh + motion.sh + legibility.sh + code-craft.sh + musicsync.sh + payoff.sh, aggregates results.
#   out/review/<CompId>/ship/report.json  — machine source of truth
#   out/review/<CompId>/ship/report.txt   — human-readable table
# Prints SHIP: READY|BLOCKED and exits non-zero when not ship-ready.
# A gate whose metrics.json is absent is reported as a hard blocker rather than crashing.
#
# Usage:
#   scripts/ship-gate.sh <CompId> <slug> [palette flags...] [-- retention flags...]
#   <CompId>        Remotion composition ID (e.g. RelayLaunch)
#   <slug>          Video slug for contrast gate and code-craft gate (e.g. relay)
#   palette flags   --bg=, --surface=, --text=, --textDim=, --accent=, [--accentAlt=]
#   -- ret flags    --holds=, --climax=, --rehook= (passed after --)
#
# e.g. scripts/ship-gate.sh RelayLaunch relay \
#        --bg='#0A0E0B' --surface='#131A14' --text='#F2F5F0' \
#        --textDim='#8FA098' --accent='#B6F22E' --accentAlt='#E5484D'
set -uo pipefail
cd "$(dirname "$0")/.."

COMP="${1:?usage: scripts/ship-gate.sh <CompId> <slug> [palette flags...] [-- retention flags...]}"
SLUG="${2:?usage: scripts/ship-gate.sh <CompId> <slug> [palette flags...] [-- retention flags...]}"
shift 2

START_SECONDS=$SECONDS

# Split remaining args at -- into palette flags (for contrast) and retention flags.
PALETTE_ARGS=()
RETENTION_ARGS=()
FOUND_SEP=0
for arg in "$@"; do
  if [ "$arg" = "--" ]; then
    FOUND_SEP=1
  elif [ "$FOUND_SEP" -eq 1 ]; then
    RETENTION_ARGS+=("$arg")
  else
    PALETTE_ARGS+=("$arg")
  fi
done

SHIP_OUT="out/review/$COMP/ship"
mkdir -p "$SHIP_OUT"

HOOK_JSON="out/review/$COMP/hook/metrics.json"
RETENTION_JSON="out/review/$COMP/retention/metrics.json"
CONTRAST_JSON="out/review/$SLUG/contrast/metrics.json"
MOTION_JSON="out/review/$COMP/motion/metrics.json"
LEGIBILITY_JSON="out/review/$COMP/legibility/metrics.json"
CODE_CRAFT_JSON="out/review/$COMP/code-craft/metrics.json"
MUSICSYNC_JSON="out/review/$COMP/musicsync/metrics.json"
PAYOFF_JSON="out/review/$COMP/payoff/metrics.json"

# --- 0. Build shared render corpus once (pixel gates slice this instead of self-rendering) ---

echo "==> Building shared render corpus for $COMP..."
CORPUS_MANIFEST=$(node scripts/render-corpus.mjs "$COMP")
export CORPUS_MANIFEST
echo ""

# --- 1. Launch all 8 gates concurrently ---

echo "==> Launching all 8 gates concurrently..."

HOOK_LOG="$SHIP_OUT/hook.log"
RETENTION_LOG="$SHIP_OUT/retention.log"
CONTRAST_LOG="$SHIP_OUT/contrast.log"
MOTION_LOG="$SHIP_OUT/motion.log"
LEGIBILITY_LOG="$SHIP_OUT/legibility.log"
CODE_CRAFT_LOG="$SHIP_OUT/code-craft.log"
MUSICSYNC_LOG="$SHIP_OUT/musicsync.log"
PAYOFF_LOG="$SHIP_OUT/payoff.log"

HOOK_EXIT=0
scripts/hook.sh "$COMP" >"$HOOK_LOG" 2>&1 &
HOOK_PID=$!

RETENTION_EXIT=0
if [ "${#RETENTION_ARGS[@]}" -gt 0 ]; then
  scripts/retention.sh "$COMP" 5 "" "${RETENTION_ARGS[@]}" >"$RETENTION_LOG" 2>&1 &
else
  scripts/retention.sh "$COMP" >"$RETENTION_LOG" 2>&1 &
fi
RETENTION_PID=$!

CONTRAST_EXIT=0
CONTRAST_PID=""
if [ "${#PALETTE_ARGS[@]}" -gt 0 ]; then
  scripts/contrast.sh "$SLUG" "${PALETTE_ARGS[@]}" >"$CONTRAST_LOG" 2>&1 &
  CONTRAST_PID=$!
else
  printf "WARNING: no palette flags supplied — contrast gate cannot run\n" >"$CONTRAST_LOG"
  CONTRAST_EXIT=1
fi

MOTION_EXIT=0
scripts/motion.sh "$COMP" >"$MOTION_LOG" 2>&1 &
MOTION_PID=$!

LEGIBILITY_EXIT=0
scripts/legibility.sh "$COMP" >"$LEGIBILITY_LOG" 2>&1 &
LEGIBILITY_PID=$!

CODE_CRAFT_EXIT=0
scripts/code-craft.sh "$COMP" "$SLUG" >"$CODE_CRAFT_LOG" 2>&1 &
CODE_CRAFT_PID=$!

MUSICSYNC_EXIT=0
scripts/musicsync.sh "$COMP" "$SLUG" >"$MUSICSYNC_LOG" 2>&1 &
MUSICSYNC_PID=$!

PAYOFF_EXIT=0
scripts/payoff.sh "$COMP" >"$PAYOFF_LOG" 2>&1 &
PAYOFF_PID=$!

# --- 2. Collect exit codes ---

wait "$HOOK_PID"      || HOOK_EXIT=$?
wait "$RETENTION_PID" || RETENTION_EXIT=$?
[ -n "$CONTRAST_PID" ] && { wait "$CONTRAST_PID" || CONTRAST_EXIT=$?; }
wait "$MOTION_PID"    || MOTION_EXIT=$?
wait "$LEGIBILITY_PID" || LEGIBILITY_EXIT=$?
wait "$CODE_CRAFT_PID" || CODE_CRAFT_EXIT=$?
wait "$MUSICSYNC_PID"  || MUSICSYNC_EXIT=$?
wait "$PAYOFF_PID"    || PAYOFF_EXIT=$?

# --- 3. Print buffered gate output in order ---

echo "==> hook gate:"
cat "$HOOK_LOG"

echo ""
echo "==> retention gate:"
cat "$RETENTION_LOG"

echo ""
echo "==> contrast gate:"
cat "$CONTRAST_LOG"

echo ""
echo "==> motion gate:"
cat "$MOTION_LOG"

echo ""
echo "==> legibility gate:"
cat "$LEGIBILITY_LOG"

echo ""
echo "==> code-craft gate:"
cat "$CODE_CRAFT_LOG"

echo ""
echo "==> musicsync gate:"
cat "$MUSICSYNC_LOG"

echo ""
echo "==> payoff gate:"
cat "$PAYOFF_LOG"

echo ""

# --- 4. Aggregate via ship-metrics.mjs ---

SHIP_EXIT=0
node scripts/ship-metrics.mjs "$HOOK_JSON" "$RETENTION_JSON" "$CONTRAST_JSON" "$MOTION_JSON" "$LEGIBILITY_JSON" "$CODE_CRAFT_JSON" "$MUSICSYNC_JSON" "$PAYOFF_JSON" --json \
  > "$SHIP_OUT/report.json" || SHIP_EXIT=$?
node scripts/ship-metrics.mjs "$HOOK_JSON" "$RETENTION_JSON" "$CONTRAST_JSON" "$MOTION_JSON" "$LEGIBILITY_JSON" "$CODE_CRAFT_JSON" "$MUSICSYNC_JSON" "$PAYOFF_JSON" \
  | tee "$SHIP_OUT/report.txt" || true

ELAPSED=$((SECONDS - START_SECONDS))

echo "Ship review — $SHIP_OUT/"
echo "  report.json"
echo "  report.txt"
echo "  wall-clock: ${ELAPSED}s"

if [ "$SHIP_EXIT" -eq 0 ]; then
  echo "SHIP: READY"
else
  echo "SHIP: BLOCKED"
fi

exit "$SHIP_EXIT"
