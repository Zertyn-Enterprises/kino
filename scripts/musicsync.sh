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
#   --climax=F        declared climax cut frame (enables MS3 gate)
#   --tol-bpm=0.02    BPM match tolerance fraction (default 0.02 = ±2%)
#   --tol-downbeat=1  downbeat lock tolerance in frames (default 1)
#   --tol-climax=3    climax-on-drop tolerance in frames (default 3)
#   --tol-beat=1      cut-on-beat tolerance in frames (default 1)
#   --coverage-floor  cut-on-beat share floor (default 0.90)
#
# e.g. scripts/musicsync.sh RelayLaunch relay
#      scripts/musicsync.sh GranipaLaunch granipa --climax=885
set -euo pipefail
cd "$(dirname "$0")/.."

COMP="${1:?usage: scripts/musicsync.sh <CompId> <slug> [--climax=F] [--tol=..]}"
SLUG="${2:?usage: scripts/musicsync.sh <CompId> <slug> [--climax=F] [--tol=..]}"

# Pass --climax and --tol-* options through to the runner.
RUNNER_OPTS=()
for arg in "${@:3}"; do
  RUNNER_OPTS+=("$arg")
done

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
  echo "No analysis.json found in public/$SLUG/ — running in SKIP mode (degraded PASS)"
fi

METRICS_EXIT=0
node scripts/musicsync-runner.mjs "${RUNNER_ARGS[@]}" "${RUNNER_OPTS[@]}" --json \
  > "$OUT/metrics.json" || METRICS_EXIT=$?
node scripts/musicsync-runner.mjs "${RUNNER_ARGS[@]}" "${RUNNER_OPTS[@]}" \
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
