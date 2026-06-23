#!/usr/bin/env bash
# Runs the full ship gate: hook.sh + retention.sh + contrast.sh + motion.sh + legibility.sh + code-craft.sh + musicsync.sh + payoff.sh + remotion-correct.sh + distinct.sh, aggregates results.
#   out/review/<CompId>/ship/report.json  — machine source of truth
#   out/review/<CompId>/ship/report.txt   — human-readable table
# Prints SHIP: READY|BLOCKED and exits non-zero when not ship-ready.
# A gate whose metrics.json is absent is reported as a coverage-gap blocker rather than crashing.
#
# Usage:
#   scripts/ship-gate.sh <CompId> <slug> [palette flags...] [--audio-not-bundled] [-- retention flags...]
#   <CompId>           Remotion composition ID (e.g. RelayLaunch)
#   <slug>             Video slug for contrast gate and code-craft gate (e.g. relay)
#   palette flags      --bg=, --surface=, --text=, --textDim=, --accent=, [--accentAlt=]
#   --audio-not-bundled  Acknowledges a musicsync coverage-gap (audio not yet bundled);
#                      gap is surfaced but does not block ship.
#   -- ret flags       --holds=, --climax=, --rehook= override (auto-derived from timeline when omitted)
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
# --audio-not-bundled is extracted before the split.
PALETTE_ARGS=()
RETENTION_ARGS=()
FOUND_SEP=0
AUDIO_NOT_BUNDLED=0
for arg in "$@"; do
  if [ "$arg" = "--audio-not-bundled" ]; then
    AUDIO_NOT_BUNDLED=1
  elif [ "$arg" = "--" ]; then
    FOUND_SEP=1
  elif [ "$FOUND_SEP" -eq 1 ]; then
    RETENTION_ARGS+=("$arg")
  else
    PALETTE_ARGS+=("$arg")
  fi
done

SHIP_OUT="out/review/$COMP/ship"
mkdir -p "$SHIP_OUT"

# --- Detect declaresMusic and count registry entries ---

# declaresMusic: video has an <Audio> component or staticFile(...music...) call in Main.tsx.
DECLARES_MUSIC_FLAG=""
MAIN_TSX="src/videos/$SLUG/Main.tsx"
if [ -f "$MAIN_TSX" ] && grep -qE '<Audio|staticFile\([^)]*music' "$MAIN_TSX" 2>/dev/null; then
  DECLARES_MUSIC_FLAG="--declares-music"
fi

# Count numbered sections (## 1. / ## 2. etc.) in _registry.md.
REGISTRY_COUNT=0
REGISTRY_MD="src/videos/_registry.md"
if [ -f "$REGISTRY_MD" ]; then
  REGISTRY_COUNT=$(grep -c '^## [0-9]' "$REGISTRY_MD" 2>/dev/null || echo 0)
fi

# --audio-not-bundled → pass --audio-acknowledged to ship-metrics.
AUDIO_ACKNOWLEDGED_FLAG=""
if [ "$AUDIO_NOT_BUNDLED" -eq 1 ]; then
  AUDIO_ACKNOWLEDGED_FLAG="--audio-acknowledged"
fi

HOOK_JSON="out/review/$COMP/hook/metrics.json"
RETENTION_JSON="out/review/$COMP/retention/metrics.json"
CONTRAST_JSON="out/review/$SLUG/contrast/metrics.json"
MOTION_JSON="out/review/$COMP/motion/metrics.json"
LEGIBILITY_JSON="out/review/$COMP/legibility/metrics.json"
CODE_CRAFT_JSON="out/review/$COMP/code-craft/metrics.json"
MUSICSYNC_JSON="out/review/$COMP/musicsync/metrics.json"
PAYOFF_JSON="out/review/$COMP/payoff/metrics.json"
REMOTION_CORRECT_JSON="out/review/$COMP/remotion-correct/metrics.json"
DISTINCT_JSON="out/review/$SLUG/distinct/metrics.json"

# --- 0. Build shared render corpus once (retention/motion/legibility/payoff slice from it) ---

echo "==> Building shared render corpus for $COMP..."
CORPUS_BUILD_EXIT=0
CORPUS_MANIFEST_TMP=$(node scripts/render-corpus.mjs "$COMP") || CORPUS_BUILD_EXIT=$?
if [ "$CORPUS_BUILD_EXIT" -eq 0 ] && [ -n "$CORPUS_MANIFEST_TMP" ]; then
  export CORPUS_MANIFEST="$CORPUS_MANIFEST_TMP"
  echo "    Corpus: $CORPUS_MANIFEST"
else
  echo "WARNING: corpus build failed (exit $CORPUS_BUILD_EXIT) — retention/motion/legibility/payoff will self-render" >&2
fi
echo ""

# --- 1. Run all gates concurrently (bounded: one job per gate = 10 max), collect exit codes ---

GATE_TMPDIR=$(mktemp -d)
trap 'rm -rf "$GATE_TMPDIR"' EXIT

HOOK_EXIT=0
RETENTION_EXIT=0
CONTRAST_EXIT=0
MOTION_EXIT=0
LEGIBILITY_EXIT=0
CODE_CRAFT_EXIT=0
MUSICSYNC_EXIT=0
PAYOFF_EXIT=0
REMOTION_CORRECT_EXIT=0
DISTINCT_EXIT=0

scripts/hook.sh "$COMP" >"$GATE_TMPDIR/hook.log" 2>&1 &
HOOK_PID=$!

scripts/retention.sh "$COMP" 5 "" --slug="$SLUG" "${RETENTION_ARGS[@]}" >"$GATE_TMPDIR/retention.log" 2>&1 &
RETENTION_PID=$!

CONTRAST_PID=""
if [ "${#PALETTE_ARGS[@]}" -gt 0 ]; then
  scripts/contrast.sh "$SLUG" "${PALETTE_ARGS[@]}" >"$GATE_TMPDIR/contrast.log" 2>&1 &
  CONTRAST_PID=$!
else
  echo "WARNING: no palette flags supplied — contrast gate cannot run" >"$GATE_TMPDIR/contrast.log"
  CONTRAST_EXIT=1
fi

scripts/motion.sh "$COMP" >"$GATE_TMPDIR/motion.log" 2>&1 &
MOTION_PID=$!

scripts/legibility.sh "$COMP" >"$GATE_TMPDIR/legibility.log" 2>&1 &
LEGIBILITY_PID=$!

scripts/code-craft.sh "$COMP" "$SLUG" >"$GATE_TMPDIR/code-craft.log" 2>&1 &
CODE_CRAFT_PID=$!

scripts/musicsync.sh "$COMP" "$SLUG" >"$GATE_TMPDIR/musicsync.log" 2>&1 &
MUSICSYNC_PID=$!

scripts/payoff.sh "$COMP" 3 "" --slug="$SLUG" >"$GATE_TMPDIR/payoff.log" 2>&1 &
PAYOFF_PID=$!

scripts/remotion-correct.sh "$COMP" "$SLUG" >"$GATE_TMPDIR/remotion-correct.log" 2>&1 &
REMOTION_CORRECT_PID=$!

scripts/distinct.sh "$SLUG" >"$GATE_TMPDIR/distinct.log" 2>&1 &
DISTINCT_PID=$!

# Join all background jobs; collect each exit code without losing failures.
wait "$HOOK_PID"              || HOOK_EXIT=$?
wait "$RETENTION_PID"         || RETENTION_EXIT=$?
[ -n "$CONTRAST_PID" ] && { wait "$CONTRAST_PID" || CONTRAST_EXIT=$?; }
wait "$MOTION_PID"              || MOTION_EXIT=$?
wait "$LEGIBILITY_PID"          || LEGIBILITY_EXIT=$?
wait "$CODE_CRAFT_PID"          || CODE_CRAFT_EXIT=$?
wait "$MUSICSYNC_PID"           || MUSICSYNC_EXIT=$?
wait "$PAYOFF_PID"              || PAYOFF_EXIT=$?
wait "$REMOTION_CORRECT_PID"    || REMOTION_CORRECT_EXIT=$?
wait "$DISTINCT_PID"            || DISTINCT_EXIT=$?

# Print gate outputs in the original fixed order.
echo "==> hook gate:"
cat "$GATE_TMPDIR/hook.log"
echo ""
echo "==> retention gate:"
cat "$GATE_TMPDIR/retention.log"
echo ""
echo "==> contrast gate:"
cat "$GATE_TMPDIR/contrast.log"
echo ""
echo "==> motion gate:"
cat "$GATE_TMPDIR/motion.log"
echo ""
echo "==> legibility gate:"
cat "$GATE_TMPDIR/legibility.log"
echo ""
echo "==> code-craft gate:"
cat "$GATE_TMPDIR/code-craft.log"
echo ""
echo "==> musicsync gate:"
cat "$GATE_TMPDIR/musicsync.log"
echo ""
echo "==> payoff gate:"
cat "$GATE_TMPDIR/payoff.log"
echo ""
echo "==> remotion-correct gate:"
cat "$GATE_TMPDIR/remotion-correct.log"
echo ""
echo "==> distinct gate:"
cat "$GATE_TMPDIR/distinct.log"
echo ""

# --- 2. Aggregate via ship-metrics.mjs ---

SHIP_METRICS_FLAGS=("--registry-count=$REGISTRY_COUNT")
[ -n "$DECLARES_MUSIC_FLAG" ]    && SHIP_METRICS_FLAGS+=("$DECLARES_MUSIC_FLAG")
[ -n "$AUDIO_ACKNOWLEDGED_FLAG" ] && SHIP_METRICS_FLAGS+=("$AUDIO_ACKNOWLEDGED_FLAG")

SHIP_EXIT=0
node scripts/ship-metrics.mjs "$HOOK_JSON" "$RETENTION_JSON" "$CONTRAST_JSON" "$MOTION_JSON" "$LEGIBILITY_JSON" "$CODE_CRAFT_JSON" "$MUSICSYNC_JSON" "$PAYOFF_JSON" "$REMOTION_CORRECT_JSON" "$DISTINCT_JSON" "${SHIP_METRICS_FLAGS[@]}" --json \
  > "$SHIP_OUT/report.json" || SHIP_EXIT=$?
node scripts/ship-metrics.mjs "$HOOK_JSON" "$RETENTION_JSON" "$CONTRAST_JSON" "$MOTION_JSON" "$LEGIBILITY_JSON" "$CODE_CRAFT_JSON" "$MUSICSYNC_JSON" "$PAYOFF_JSON" "$REMOTION_CORRECT_JSON" "$DISTINCT_JSON" "${SHIP_METRICS_FLAGS[@]}" \
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
