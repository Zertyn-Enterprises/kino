#!/usr/bin/env bash
# Renders full-resolution stills of a composition for visual review.
#
# Usage: scripts/stills.sh <CompositionId> <frame...> [--props=json]
#   e.g. scripts/stills.sh LibCheck 0 45 180 --props='{"debug":true}'
set -euo pipefail
cd "$(dirname "$0")/.."

COMP="${1:?usage: scripts/stills.sh <CompositionId> <frame...> [--props=json]}"
shift

PROPS=""
FRAMES=()
for arg in "$@"; do
  case "$arg" in
    --props=*) PROPS="${arg#--props=}" ;;
    *) FRAMES+=("$arg") ;;
  esac
done
if [ "${#FRAMES[@]}" -eq 0 ]; then
  echo "ERROR: no frames given" >&2
  exit 1
fi

OUT="out/review/$COMP"
mkdir -p "$OUT"

for f in "${FRAMES[@]}"; do
  ARGS=(still "$COMP" "$OUT/f$f.png" --frame="$f")
  if [ -n "$PROPS" ]; then
    ARGS+=("--props=$PROPS")
  fi
  npx remotion "${ARGS[@]}"
done

echo "Stills:"
ls "$OUT"/f*.png
