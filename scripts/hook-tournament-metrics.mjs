#!/usr/bin/env node
// Pure ranking module for hook-variant tournaments.
// No render, no filesystem access — takes pre-computed hook-metrics --json objects.
//
// Usage (module):
//   import { rankHookVariants } from './hook-tournament-metrics.mjs';
//   const { ranking, winner } = rankHookVariants(variants);
//   // Each variant = computeHookMetrics() output + { label: string }
//
// Ranking key (three-level, fully deterministic):
//   PRIMARY   — hard-gate pass count (gates 1–3, descending): a variant that fails
//               any HARD gate must never beat one that passes all three.
//   SECONDARY — normalized weighted composite of viral-relevant raw measures (desc).
//   TIE-BREAK — label ascending (locale-insensitive byte-order, deterministic).
//
// Composite score (range [0, 1]):
//
//   score = W_MOTION    × clamp(motion,    MOTION_CAP)   / MOTION_CAP
//         + W_CONTRAST  × clamp(contrast,  CONTRAST_CAP) / CONTRAST_CAP
//         + W_LIVENESS  × clamp(cells×rows, LIVENESS_CAP) / LIVENESS_CAP
//         + W_ACTIVE    × clamp(active,    ACTIVE_CAP)   / ACTIVE_CAP
//         + W_SEPARATED × separated_bool
//
// Measures sourced from the hook-metrics gates:
//   motion    — gate 1 measured (mean abs lum delta frame0→early)
//   contrast  — gate 2 measured (lum stddev of frame0)
//   active    — gate 4 measured.active (grid cells with motion > threshold)
//   separated — gate 4 measured.separated (bool: ≥2 active cells are non-adjacent)
//   liveness  — gate 5 measured.cells × measured.rows (spatial richness of frame0)
//
// Weight rationale:
//   0.30  motion      — motion in the first 10 frames is the single strongest signal
//                       that a hook will hold a viewer; static openings kill retention.
//   0.25  contrast    — visual striking power stops the scroll; low-contrast frame0
//                       reads as "not worth watching."
//   0.20  liveness    — cells×rows penalises single-band content (title-card defect)
//                       more than cells alone; spatially distributed richness on frame0
//                       correlates with a densely authored opening.
//   0.15  active      — more background-activity regions = more parallel visual threads
//                       running during the hook, increasing perceived production value.
//   0.10  separated   — spatial dispersion bonus: confirms activity isn't a single
//                       localised blob but genuinely covers multiple screen regions.
//
// Normalisation caps — calibrated against RelayLaunch + GranipaLaunch with headroom
// to reward superior future designs without hitting a hard ceiling prematurely:
//   MOTION_CAP   = 5.0   (GranipaLaunch measured 1.40; RelayLaunch 0.29)
//   CONTRAST_CAP = 50.0  (GranipaLaunch measured 20.64; RelayLaunch 7.45)
//   ACTIVE_CAP   = 16    (4×4 grid max)
//   LIVENESS_CAP = 32    (practical rich-hook ceiling: 8 content cells × 4 rows)
// Skipped or missing gates contribute 0 to that component of the composite.

// ── Constants ────────────────────────────────────────────────────────────────

const MOTION_CAP    = 5.0;
const CONTRAST_CAP  = 50.0;
const ACTIVE_CAP    = 16;
const LIVENESS_CAP  = 32;

const W_MOTION    = 0.30;
const W_CONTRAST  = 0.25;
const W_LIVENESS  = 0.20;
const W_ACTIVE    = 0.15;
const W_SEPARATED = 0.10;

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp(v, cap) {
  return Math.min(v, cap);
}

function hardPassCount(variant) {
  return variant.gates.filter(g => g.hard && !g.skip && g.pass).length;
}

function compositeScore(variant) {
  const g1 = variant.gates.find(g => g.id === 1);
  const g2 = variant.gates.find(g => g.id === 2);
  const g4 = variant.gates.find(g => g.id === 4);
  const g5 = variant.gates.find(g => g.id === 5);

  const motion    = g1 && !g1.skip && g1.measured != null ? g1.measured                          : 0;
  const contrast  = g2 && !g2.skip && g2.measured != null ? g2.measured                          : 0;
  const active    = g4 && !g4.skip && g4.measured != null ? g4.measured.active                   : 0;
  const separated = g4 && !g4.skip && g4.measured != null ? (g4.measured.separated ? 1 : 0)      : 0;
  const liveness  = g5 && !g5.skip && g5.measured != null ? g5.measured.cells * g5.measured.rows : 0;

  return (
    W_MOTION    * clamp(motion,   MOTION_CAP)   / MOTION_CAP   +
    W_CONTRAST  * clamp(contrast, CONTRAST_CAP) / CONTRAST_CAP +
    W_LIVENESS  * clamp(liveness, LIVENESS_CAP) / LIVENESS_CAP +
    W_ACTIVE    * clamp(active,   ACTIVE_CAP)   / ACTIVE_CAP   +
    W_SEPARATED * separated
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

/**
 * Rank hook variants by gate strength then composite virality score.
 *
 * @param {Array<Object>} variants  — each item is a hook-metrics --json object
 *                                    augmented with a { label: string } field.
 * @returns {{ ranking: Array<Object>, winner: Object|null }}
 *   ranking — variants sorted best-first, each annotated with
 *             { hardPassCount: number, compositeScore: number }.
 *   winner  — first element of ranking, or null for an empty input.
 */
export function rankHookVariants(variants) {
  if (variants.length === 0) return { ranking: [], winner: null };

  const scored = variants.map(v => ({
    variant: v,
    hpc: hardPassCount(v),
    cs:  compositeScore(v),
  }));

  scored.sort((a, b) => {
    if (b.hpc !== a.hpc) return b.hpc - a.hpc;
    if (b.cs  !== a.cs)  return b.cs  - a.cs;
    return a.variant.label < b.variant.label ? -1 : a.variant.label > b.variant.label ? 1 : 0;
  });

  const ranking = scored.map(({ variant, hpc, cs }) => ({
    ...variant,
    hardPassCount:  hpc,
    compositeScore: +cs.toFixed(6),
  }));

  return { ranking, winner: ranking[0] };
}
