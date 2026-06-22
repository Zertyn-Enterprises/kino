#!/usr/bin/env bash
# Runs the full ship gate: hook.sh + retention.sh + contrast.sh + motion.sh + legibility.sh + code-craft.sh, aggregates results.
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

# --- 1. Run each gate, capturing exit codes without aborting ---

echo "==> Running hook gate..."
HOOK_EXIT=0
scripts/hook.sh "$COMP" || HOOK_EXIT=$?

echo ""
echo "==> Running retention gate..."
RETENTION_EXIT=0
if [ "${#RETENTION_ARGS[@]}" -gt 0 ]; then
  scripts/retention.sh "$COMP" 5 "" "${RETENTION_ARGS[@]}" || RETENTION_EXIT=$?
else
  scripts/retention.sh "$COMP" || RETENTION_EXIT=$?
fi

echo ""
echo "==> Running contrast gate..."
CONTRAST_EXIT=0
if [ "${#PALETTE_ARGS[@]}" -gt 0 ]; then
  scripts/contrast.sh "$SLUG" "${PALETTE_ARGS[@]}" || CONTRAST_EXIT=$?
else
  echo "WARNING: no palette flags supplied — contrast gate cannot run" >&2
  CONTRAST_EXIT=1
fi

echo ""
echo "==> Running motion gate..."
MOTION_EXIT=0
scripts/motion.sh "$COMP" || MOTION_EXIT=$?

echo ""
echo "==> Running legibility gate..."
LEGIBILITY_EXIT=0
scripts/legibility.sh "$COMP" || LEGIBILITY_EXIT=$?

echo ""
echo "==> Running code-craft gate..."
CODE_CRAFT_EXIT=0
scripts/code-craft.sh "$COMP" "$SLUG" || CODE_CRAFT_EXIT=$?

echo ""

# --- 2. Aggregate via ship-metrics.mjs ---

SHIP_EXIT=0
node scripts/ship-metrics.mjs "$HOOK_JSON" "$RETENTION_JSON" "$CONTRAST_JSON" "$MOTION_JSON" "$LEGIBILITY_JSON" "$CODE_CRAFT_JSON" --json \
  > "$SHIP_OUT/report.json" || SHIP_EXIT=$?
node scripts/ship-metrics.mjs "$HOOK_JSON" "$RETENTION_JSON" "$CONTRAST_JSON" "$MOTION_JSON" "$LEGIBILITY_JSON" "$CODE_CRAFT_JSON" \
  | tee "$SHIP_OUT/report.txt" || true

echo "Ship review — $SHIP_OUT/"
echo "  report.json"
echo "  report.txt"

if [ "$SHIP_EXIT" -eq 0 ]; then
  echo "SHIP: READY"
else
  echo "SHIP: BLOCKED"
fi

exit "$SHIP_EXIT"
