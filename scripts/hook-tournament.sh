#!/usr/bin/env bash
# Renders hook-window frames for each variant of a composition, ranks them with
# hook-tournament-metrics, and writes the tournament results.
#
# Convention: the director exposes a `hookVariant` prop on the composition.
# Each variant is a distinct props JSON object; the hook scene branches on
# hookVariant to render different cold-open treatments. After the tournament,
# adopt the winning variant in the production hook scene.
#
# Usage: scripts/hook-tournament.sh <CompId> [step] -- '<propsA>' '<propsB>' [..]
#   CompId   — Remotion composition ID (e.g. RelayLaunch)
#   step     — frame step, reserved for future contact-sheet extension (default: 3)
#   --       — required separator before variant props
#   propsA, propsB, ...  — ≥2 variant props JSON strings
#
# Per-variant output: out/review/<CompId>/hook-tournament/variant-N/
#   frame0.png  early.png  mid.png  final.png  — key frames (same frame set as hook.sh)
#   metrics.json  metrics.txt                   — hook-metrics output
#   props.txt                                   — raw props string for label extraction
#
# Tournament output: out/review/<CompId>/hook-tournament/
#   ranking.json   — machine result ({ ranking, winner, verdict, margin })
#   summary.txt    — human-readable ranking table
#
# e.g.
#   scripts/hook-tournament.sh RelayLaunch 3 -- '{"hookVariant":"A"}' '{"hookVariant":"B"}'
set -euo pipefail
cd "$(dirname "$0")/.."

COMP="${1:?usage: scripts/hook-tournament.sh <CompId> [step] -- '<propsA>' '<propsB>' [..]}"
shift

# Optional step before '--'
STEP=3
if [ "${1:-}" != "--" ] && [ -n "${1:-}" ]; then
  STEP="$1"
  shift
fi

if [ "${1:-}" != "--" ]; then
  echo "ERROR: expected '--' separator before variant props" >&2
  echo "Usage: scripts/hook-tournament.sh <CompId> [step] -- '<propsA>' '<propsB>' [..]" >&2
  exit 1
fi
shift  # consume '--'

if [ "$#" -lt 2 ]; then
  echo "ERROR: at least 2 variant props required; got $#" >&2
  exit 1
fi

VARIANT_PROPS=("$@")
N_VARIANTS="${#VARIANT_PROPS[@]}"

echo "Hook tournament: $COMP  ($N_VARIANTS variants, step=$STEP)"

# ── Derive hook window (same logic as hook.sh) ─────────────────────────────────
HOOK_FRAMES=$(node scripts/hook-window.mjs "$COMP" 2>/dev/null) || {
  echo "WARNING: could not derive hook window for $COMP — falling back to 90 frames" >&2
  HOOK_FRAMES=90
}

EARLY_FRAME=9
if [ "$HOOK_FRAMES" -lt "$EARLY_FRAME" ]; then EARLY_FRAME="$HOOK_FRAMES"; fi
MID_FRAME=$(( HOOK_FRAMES * 6 / 10 ))
if [ "$MID_FRAME" -gt "$HOOK_FRAMES" ]; then MID_FRAME="$HOOK_FRAMES"; fi

DURATION=$(npx remotion compositions 2>&1 \
  | awk -v comp="$COMP" '
      $1 == comp {
        for (i = 2; i <= NF; i++)
          if ($i ~ /^[0-9]+x[0-9]+$/ && $(i+1) ~ /^[0-9]+$/) { print $(i+1); exit }
      }')

TOURNAMENT_OUT="out/review/$COMP/hook-tournament"
mkdir -p "$TOURNAMENT_OUT"

# ── Render each variant ────────────────────────────────────────────────────────
for i in "${!VARIANT_PROPS[@]}"; do
  PROPS="${VARIANT_PROPS[$i]}"
  VARIANT_DIR="$TOURNAMENT_OUT/variant-$i"
  mkdir -p "$VARIANT_DIR"

  echo ""
  echo "==> Variant $i: $PROPS"

  # Save props string; ranking step uses this for label extraction
  printf '%s' "$PROPS" > "$VARIANT_DIR/props.txt"

  PROPS_ARG=()
  if [ -n "$PROPS" ]; then
    PROPS_ARG=("--props=$PROPS")
  fi

  npx remotion still "$COMP" "$VARIANT_DIR/frame0.png" --frame=0 "${PROPS_ARG[@]}"
  npx remotion still "$COMP" "$VARIANT_DIR/early.png"  --frame="$EARLY_FRAME" "${PROPS_ARG[@]}"
  npx remotion still "$COMP" "$VARIANT_DIR/mid.png"    --frame="$MID_FRAME"   "${PROPS_ARG[@]}"

  if [ -n "$DURATION" ]; then
    FINAL_FRAME=$(( DURATION - 1 ))
    npx remotion still "$COMP" "$VARIANT_DIR/final.png" --frame="$FINAL_FRAME" "${PROPS_ARG[@]}"
  else
    echo "WARNING: could not determine duration — final.png skipped (gate 3 will be skipped)" >&2
  fi

  # hook-metrics: JSON first (artifact of record), then human-readable
  METRICS_EXIT=0
  node scripts/hook-metrics.mjs \
    "$VARIANT_DIR/frame0.png" \
    "$VARIANT_DIR/early.png" \
    "$VARIANT_DIR/mid.png" \
    "$VARIANT_DIR/final.png" \
    --json > "$VARIANT_DIR/metrics.json" || METRICS_EXIT=$?
  node scripts/hook-metrics.mjs \
    "$VARIANT_DIR/frame0.png" \
    "$VARIANT_DIR/early.png" \
    "$VARIANT_DIR/mid.png" \
    "$VARIANT_DIR/final.png" \
    | tee "$VARIANT_DIR/metrics.txt" || true

  if [ "$METRICS_EXIT" -eq 0 ]; then
    echo "  HARD GATES: PASS"
  else
    echo "  HARD GATES: FAIL"
  fi
done

# ── Rank variants via hook-tournament-metrics ──────────────────────────────────
export HOOK_TOURNAMENT_OUT="$TOURNAMENT_OUT"
export HOOK_TOURNAMENT_N="$N_VARIANTS"
export HOOK_TOURNAMENT_COMP="$COMP"

node --input-type=module << 'EOJS'
import { readFileSync, writeFileSync } from 'node:fs';
import { rankHookVariants } from './scripts/hook-tournament-metrics.mjs';

const tournamentOut = process.env.HOOK_TOURNAMENT_OUT;
const nVariants     = parseInt(process.env.HOOK_TOURNAMENT_N, 10);
const comp          = process.env.HOOK_TOURNAMENT_COMP;

const variants = [];
for (let i = 0; i < nVariants; i++) {
  const dir = `${tournamentOut}/variant-${i}`;

  // Label: prefer hookVariant from props JSON, else fall back to variant-N
  let label = `variant-${i}`;
  try {
    const raw   = readFileSync(`${dir}/props.txt`, 'utf8');
    const props = JSON.parse(raw);
    if (props.hookVariant != null) label = String(props.hookVariant);
  } catch {}

  let metrics;
  try {
    metrics = JSON.parse(readFileSync(`${dir}/metrics.json`, 'utf8'));
  } catch (e) {
    process.stderr.write(`WARNING: could not read metrics for variant-${i}: ${e.message}\n`);
    continue;
  }

  variants.push({ ...metrics, label });
}

if (variants.length === 0) {
  process.stderr.write('ERROR: no variant metrics could be loaded\n');
  process.exit(1);
}

const { ranking, winner, verdict, margin } = rankHookVariants(variants);

writeFileSync(`${tournamentOut}/ranking.json`, JSON.stringify({ ranking, winner, verdict, margin }, null, 2) + '\n');

// Human-readable summary table
const width = Math.max(13, ...ranking.map(v => v.label.length));
const verdictLine = margin != null
  ? `Verdict: ${verdict} (margin ${margin.toFixed(4)})`
  : `Verdict: ${verdict}`;

function focalLabel(f) {
  if (f === null || f === undefined) return 'N/A';
  const band = f >= 0.50 ? 'focal' : f >= 0.20 ? 'mixed' : 'diffuse';
  return `${f.toFixed(2)} (${band})`;
}
const focalColWidth = Math.max(5, ...ranking.map(v => focalLabel(v.focal).length));

const lines = [
  `Hook Tournament — ${comp}  (${ranking.length} variants)`,
  `Winner: ${winner.label}  (hard=${winner.hardPassCount}/3  composite=${winner.compositeScore.toFixed(4)})`,
  verdictLine,
  '',
  `${'Rank'.padEnd(4)}  ${'Label'.padEnd(width)}  Hard  Composite  Focal`,
  `${'────'.padEnd(4)}  ${'─'.repeat(width)}  ────  ─────────  ${'─'.repeat(focalColWidth)}`,
  ...ranking.map((v, idx) =>
    `${String(idx + 1).padEnd(4)}  ${v.label.padEnd(width)}  ${String(v.hardPassCount).padStart(4)}  ${v.compositeScore.toFixed(4).padStart(9)}  ${focalLabel(v.focal)}`
  ),
  '',
];

if (verdict === 'contested') {
  lines.push(
    'NOTE  CONTESTED verdict — director decides on human substance gates:',
    '      promise-by-2.5s, hook-pattern-committed, frame-0 thumbnail.',
    '      Focal clarity scores above are advisory director-judgment input:',
    '      higher score = stronger scroll-stopper candidate (dominant focal',
    '      region vs uniform busyness). See thumbnail.md for poster-craft spec.',
    '',
  );
}

const summary = lines.join('\n');
writeFileSync(`${tournamentOut}/summary.txt`, summary);
process.stdout.write(summary);
EOJS

echo "Hook tournament — $TOURNAMENT_OUT/"
echo "  ranking.json"
echo "  summary.txt"
for i in "${!VARIANT_PROPS[@]}"; do
  echo "  variant-$i/"
done
