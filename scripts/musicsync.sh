#!/usr/bin/env bash
# Music-sync gate: verifies audio↔picture alignment for a composition.
#   metrics.json  — machine-readable verdict (hardGatesPass + per-gate detail)
#   metrics.txt   — human-readable verdict
# Resolves the video's timeline from source (no hardcoded frames) via esbuild.
# Degrades cleanly to SKIP when no .analysis.json is found (audio not bundled).
# Prints HARD GATES: PASS|FAIL and exits non-zero on HARD FAIL.
# All output lands in out/review/<CompId>/musicsync/.
#
# Usage: scripts/musicsync.sh <CompId> <slug> [--climax=F] [--tol-bpm=..] [--tol-downbeat=..]
#                                              [--tol-climax=..] [--tol-beat=..] [--coverage-floor=..]
#   <CompId>          Remotion composition ID (e.g. RelayLaunch)
#   <slug>            video slug matching src/videos/<slug>/timeline.ts and public/<slug>/
#   --climax=F        climax cut frame override (auto-derived from role:'climax' scene when omitted)
#   --tol-bpm=0.02    BPM match tolerance fraction (default 0.02 = ±2%)
#   --tol-downbeat=1  downbeat lock tolerance in frames (default 1)
#   --tol-climax=3    climax-on-drop tolerance in frames (default 3)
#   --tol-beat=1      cut-on-beat tolerance in frames (default 1)
#   --coverage-floor  cut-on-beat share floor (default 0.90)
#
# e.g. scripts/musicsync.sh RelayLaunch relay
#      scripts/musicsync.sh GranipaLaunch granipa
set -euo pipefail
cd "$(dirname "$0")/.."

COMP="${1:?usage: scripts/musicsync.sh <CompId> <slug> [--climax=F] [--tol=..]}"
SLUG="${2:?usage: scripts/musicsync.sh <CompId> <slug> [--climax=F] [--tol=..]}"

# Pass --climax and --tol-* options through to the runner.
# Track whether --climax was explicitly supplied so auto-load only fills the gap.
EXPLICIT_CLIMAX=0
RUNNER_OPTS=()
for arg in "${@:3}"; do
  case "$arg" in
    --climax=*) EXPLICIT_CLIMAX=1; RUNNER_OPTS+=("$arg") ;;
    *)          RUNNER_OPTS+=("$arg") ;;
  esac
done

# Auto-load --climax from the timeline's role:'climax' scene when not explicitly passed.
# Explicit CLI flags always override (they appear after STRUCTURE_OPTS in the runner call).
STRUCTURE_OPTS=()
if [ "$EXPLICIT_CLIMAX" -eq 0 ]; then
  STRUCTURE_FLAGS=$(node scripts/structure.mjs "$SLUG" 2>/dev/null | tail -1) || STRUCTURE_FLAGS=""
  for sflag in $STRUCTURE_FLAGS; do
    case "$sflag" in
      --climax=*) STRUCTURE_OPTS+=("$sflag") ;;
    esac
  done
fi

TIMELINE="src/videos/$SLUG/timeline.ts"
if [ ! -f "$TIMELINE" ]; then
  echo "ERROR: timeline not found: $TIMELINE" >&2
  exit 1
fi

OUT="out/review/$COMP/musicsync"
mkdir -p "$OUT"

# Auto-locate analysis JSON: public/<slug>/*.analysis.json (first match).
ANALYSIS=""
for f in "public/$SLUG/"*.analysis.json; do
  if [ -f "$f" ]; then
    ANALYSIS="$f"
    break
  fi
done

# Build runner args.
RUNNER_ARGS=(--timeline="$TIMELINE")
if [ -n "$ANALYSIS" ]; then
  echo "Music analysis: $ANALYSIS"
  RUNNER_ARGS+=(--analysis="$ANALYSIS")
else
  echo "No analysis.json found in public/$SLUG/ — checking music intent (SKIP or UNVERIFIED)"
fi

METRICS_EXIT=0
node scripts/musicsync-runner.mjs "${RUNNER_ARGS[@]}" "${STRUCTURE_OPTS[@]}" "${RUNNER_OPTS[@]}" --json \
  > "$OUT/metrics.json" || METRICS_EXIT=$?
node scripts/musicsync-runner.mjs "${RUNNER_ARGS[@]}" "${STRUCTURE_OPTS[@]}" "${RUNNER_OPTS[@]}" \
  | tee "$OUT/metrics.txt" || true

echo "Music-sync review — $OUT/"
echo "  metrics.json"
echo "  metrics.txt"

if [ "$METRICS_EXIT" -eq 0 ]; then
  echo "HARD GATES: PASS"
else
  echo "HARD GATES: FAIL"
fi

exit "$METRICS_EXIT"
