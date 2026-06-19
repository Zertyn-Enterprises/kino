#!/usr/bin/env bash
# Renders a composition as scaled-down thumbnails, then tiles them into
# labeled contact-sheet pages (out/review/<Comp>/strip/) so motion — spacing,
# rhythm, holds — can be judged from images. Pure Remotion; no system ffmpeg.
#
# Usage: scripts/filmstrip.sh <CompositionId> [step] [propsJson] [outName]
#   step      take every Nth frame (default 15 = 2 thumbs/second at 30fps)
#   propsJson e.g. '{"debug":true}' to enable safe-area overlays
#   outName   output folder name (default = CompositionId); REQUIRED when
#             several strips of the same comp run concurrently
set -euo pipefail
cd "$(dirname "$0")/.."

COMP="${1:?usage: scripts/filmstrip.sh <CompositionId> [step] [propsJson] [outName]}"
STEP="${2:-15}"
PROPS="${3:-}"
NAME="${4:-$COMP}"
TMP="public/review-tmp/$NAME"
OUT="out/review/$NAME"

rm -rf "$TMP" "$OUT/strip"
mkdir -p "$TMP" "$OUT/strip"

ARGS=(render "$COMP" "$TMP" --sequence --image-format=jpeg --scale=0.25 --every-nth-frame="$STEP")
if [ -n "$PROPS" ]; then
  ARGS+=("--props=$PROPS")
fi
npx remotion "${ARGS[@]}"

FRAMES=""
FILES=""
INDEX=0
while IFS= read -r FILE; do
  FRAMES+="${FRAMES:+,}$((INDEX * STEP))"
  FILES+="${FILES:+,}\"$FILE\""
  INDEX=$((INDEX + 1))
done < <(ls "$TMP" | sort -t- -k2 -n)

npx remotion render ContactSheet "$OUT/strip" --sequence --image-format=png \
  --props="{\"folder\":\"review-tmp/$NAME\",\"frames\":[$FRAMES],\"files\":[$FILES]}"

rm -rf "$TMP"
rmdir public/review-tmp 2>/dev/null || true

echo "Contact sheets:"
ls "$OUT/strip"
