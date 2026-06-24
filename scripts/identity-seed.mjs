#!/usr/bin/env node
// Anti-convergence identity seed generator.
//
// Given _registry.md content, deterministically emits a starter identity
// {luminance, bg, surface, text, textDim, accent hexes, display+body family
// class + concrete name, arc, bpm-band, grain%} that:
//   (a) differs on ≥4 axes from every prior registry entry, per
//       distinct-metrics.mjs's computeAxisDivergences logic
//   (b) passes WCAG contrast HARD floors (text≥7:1, textDim≥4.5:1)
//       via contrast-metrics.mjs
//   (c) is never the dark #0a0a0f / teal #7effc9 scaffold default
//
// Deterministic: same registryText → same output.
// Seed is derived from the registry content via FNV-1a hash; no Math.random / Date.now.
//
// Usage:
//   node scripts/identity-seed.mjs [--registry=<path>] [--json]

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseRegistry, computeAxisDivergences } from './distinct-metrics.mjs';
import { computeRegistryAxes } from './registry-axes.mjs';
import { computeContrastMetrics } from './contrast-metrics.mjs';

// ── Deterministic hash ────────────────────────────────────────────────────────

/** FNV-1a hash of a string → unsigned 32-bit integer. Used to rotate catalog. */
function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

// ── Axis candidate catalogs ───────────────────────────────────────────────────
// Candidates are tried in order of ascending crowding; ties keep original order.

const LUMINANCE_CANDIDATES  = ['tonal', 'light', 'dark'];
const ARC_CANDIDATES        = ['D', 'E', 'A', 'B', 'C'];
const BPM_BAND_CANDIDATES   = ['slow', 'fast', 'upbeat', 'mid'];
const BPM_BPM_BY_BAND       = { slow: 70, fast: 165, upbeat: 128, mid: 100 };
const GRAIN_BAND_CANDIDATES = ['light', 'heavy', 'none', 'filmic'];
const GRAIN_PCT_BY_BAND     = { light: 1.5, heavy: 12.0, none: 0, filmic: 5.0 };

// Palette catalog: indexed by luminance class.
// Each palette must pass contrast HARD floors; the code re-verifies at runtime.
// Designed to differ perceptually from all current registry entries:
//   relay bg #0A0E0B (near-black green)  accent #B6F22E (lime)
//   granipa bg #0A0B0E (near-black blue) accent #3D8BFF (blue)
//   sereno bg #F7F5F0 (warm off-white)   accent #3F6D50 (sage)
const PALETTE_CATALOG = {
  tonal: [
    // Grape-purple: colorful mid-dark, clearly not a near-black
    { bg: '#3d1a5e', surface: '#2a0e4a', text: '#ffe8ff', textDim: '#c09ee0', accent: '#ff7040' },
    // Dark emerald tonal
    { bg: '#0e2a1a', surface: '#09180f', text: '#e0ffe8', textDim: '#78bc8a', accent: '#ff4d6a' },
    // Midnight indigo tonal
    { bg: '#1a1050', surface: '#0e0838', text: '#e0e4ff', textDim: '#8888d8', accent: '#ff9030' },
    // Burnt copper tonal
    { bg: '#2a1206', surface: '#1e0c02', text: '#fff0e0', textDim: '#c88860', accent: '#00d9c0' },
  ],
  light: [
    // Lavender light
    { bg: '#f2ecfb', surface: '#e4d8f5', text: '#18002e', textDim: '#604880', accent: '#e63946' },
    // Mint light
    { bg: '#e8faf2', surface: '#d0f2e4', text: '#0a1e14', textDim: '#3a7058', accent: '#d62828' },
    // Pale sky light
    { bg: '#e8f2fd', surface: '#d0e4f5', text: '#0a1428', textDim: '#385876', accent: '#e05c00' },
    // Peach cream light
    { bg: '#fef0e8', surface: '#f5e0d0', text: '#281008', textDim: '#7a4030', accent: '#1a6f8c' },
  ],
  dark: [
    // Purple-black (distinct from relay/granipa near-blacks)
    { bg: '#1a0526', surface: '#23073a', text: '#f8e8ff', textDim: '#c090d8', accent: '#ff5a00' },
    // Maroon black
    { bg: '#200505', surface: '#300a0a', text: '#fff0f0', textDim: '#d09090', accent: '#00e5d0' },
    // Navy black
    { bg: '#050520', surface: '#0a0a30', text: '#f0f0ff', textDim: '#9090c8', accent: '#ff9030' },
    // Forest black
    { bg: '#041204', surface: '#081808', text: '#f0fff0', textDim: '#80c080', accent: '#c050ff' },
  ],
};

// Font pairings: display+body by class profile.
// All families are absent from the live registry so Jaccard=0 → type DIFFERS.
const FONT_CATALOG = [
  { displayClass: 'serif',   bodyClass: 'sans',  displayFamily: 'Libre Baskerville', bodyFamily: 'Outfit'          },
  { displayClass: 'grotesk', bodyClass: 'sans',  displayFamily: 'Syne',              bodyFamily: 'Manrope'         },
  { displayClass: 'sans',    bodyClass: 'serif', displayFamily: 'Nunito',            bodyFamily: 'Lora'            },
  { displayClass: 'mono',    bodyClass: 'sans',  displayFamily: 'Fira Code',         bodyFamily: 'Rubik'           },
  { displayClass: 'serif',   bodyClass: 'mono',  displayFamily: 'Cormorant Garamond',bodyFamily: 'Roboto Mono'     },
  { displayClass: 'grotesk', bodyClass: 'mono',  displayFamily: 'Clash Display',     bodyFamily: 'Source Code Pro' },
];

// ── Axis ranking ──────────────────────────────────────────────────────────────

/** Sort candidates by ascending usage count; ties keep original order (stable). */
function rankCandidates(candidates, usedValues) {
  const counts = Object.fromEntries(candidates.map(c => [c, 0]));
  for (const v of usedValues) {
    if (Object.prototype.hasOwnProperty.call(counts, v)) counts[v]++;
  }
  return [...candidates].sort((a, b) => counts[a] - counts[b]);
}

// ── Reporting helpers ─────────────────────────────────────────────────────────

/** Axis names where the chosen value has zero prior uses (fully open). */
function computeOpenAxes(axes, chosen) {
  const open = [];
  if (!axes.luminance.includes(chosen.luminance))     open.push('luminance');
  if (!axes.arc.includes(chosen.arc))                 open.push('arc');
  if (!axes['bpm-band'].includes(chosen.bpmBand))     open.push('bpm-band');
  if (!axes['grain-band'].includes(chosen.grainBand)) open.push('grain-band');
  return open;
}

/** Per-axis list of prior slugs sharing the same chosen value (colliders). */
function computeCollidersByAxis(priors, chosen) {
  const result = {};
  for (const { slug, parsed: p } of priors) {
    const check = (axis, priorVal, chosenVal) => {
      if (priorVal === chosenVal) {
        if (!result[axis]) result[axis] = [];
        result[axis].push(slug);
      }
    };
    check('luminance',  p.luminance, chosen.luminance);
    check('arc',        p.arc,       chosen.arc);
    check('bpm-band',   p.bpmBand,   chosen.bpmBand);
    check('grain-band', p.grainBand, chosen.grainBand);
  }
  return result;
}

// ── Core export ───────────────────────────────────────────────────────────────

/**
 * Generate a deterministic anti-convergence identity seed from _registry.md.
 *
 * @param {string} registryText - full content of _registry.md
 * @returns {{
 *   bg: string, surface: string, text: string, textDim: string, accent: string,
 *   luminance: string,
 *   displayClass: string, bodyClass: string,
 *   displayFamily: string, bodyFamily: string,
 *   arc: string,
 *   bpmBand: string, bpmBpm: number,
 *   grainBand: string, grainPct: number,
 *   openAxes: string[],
 *   collidersByAxis: Object<string, string[]>
 * }}
 */
export function computeIdentitySeed(registryText) {
  const priors = parseRegistry(registryText);
  const axes   = computeRegistryAxes(registryText);
  const hash   = hashString(registryText);

  const rankedLuminance  = rankCandidates(LUMINANCE_CANDIDATES,  axes.luminance);
  const rankedArc        = rankCandidates(ARC_CANDIDATES,        axes.arc);
  const rankedBpmBand    = rankCandidates(BPM_BAND_CANDIDATES,   axes['bpm-band']);
  const rankedGrainBand  = rankCandidates(GRAIN_BAND_CANDIDATES, axes['grain-band']);

  // Pick font by hash rotation — any catalog entry gives type-DIFFERS vs all priors.
  const font = FONT_CATALOG[hash % FONT_CATALOG.length];
  const typeFamilies = [font.displayFamily.toLowerCase(), font.bodyFamily.toLowerCase()];

  for (const luminance of rankedLuminance) {
    const palettes = PALETTE_CATALOG[luminance];

    // Rotate within same-luminance palettes by hash for variety across registry states.
    for (let pi = 0; pi < palettes.length; pi++) {
      const palette = palettes[(hash + pi) % palettes.length];

      // Contrast HARD floor check — skip palette if any HARD pair fails.
      if (!computeContrastMetrics({
        bg: palette.bg, surface: palette.surface,
        text: palette.text, textDim: palette.textDim,
        accent: palette.accent,
      }).hardGatesPass) continue;

      for (const arc of rankedArc) {
        for (const bpmBand of rankedBpmBand) {
          for (const grainBand of rankedGrainBand) {
            // Synthesize a pre-registry candidate (empty rhythm/transitions — differs
            // from all priors that have non-empty sets for those fields).
            const candidate = {
              bg:               palette.bg,
              accent:           palette.accent,
              luminance,
              typeFamilies,
              arc,
              rhythmMoveTokens: new Set(),
              grainBand,
              transitionTokens: new Set(),
              bpmBand,
            };

            // ≥4-axis check vs every prior entry.
            const allPass = priors.every(prior =>
              computeAxisDivergences(candidate, prior.parsed).length >= 4,
            );
            if (!allPass) continue;

            const chosen = { luminance, arc, bpmBand, grainBand };
            return {
              ...palette,
              luminance,
              displayClass:  font.displayClass,
              bodyClass:     font.bodyClass,
              displayFamily: font.displayFamily,
              bodyFamily:    font.bodyFamily,
              arc,
              bpmBand,
              bpmBpm:        BPM_BPM_BY_BAND[bpmBand],
              grainBand,
              grainPct:      GRAIN_PCT_BY_BAND[grainBand],
              openAxes:      computeOpenAxes(axes, chosen),
              collidersByAxis: computeCollidersByAxis(priors, chosen),
            };
          }
        }
      }
    }
  }

  throw new Error(
    'identity-seed: no valid seed found — all catalog combinations fail gates; ' +
    'extend PALETTE_CATALOG or FONT_CATALOG to cover this registry state',
  );
}

// ── CLI entry point ───────────────────────────────────────────────────────────

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');
  const registryFlag = args.find(a => a.startsWith('--registry='));
  const registryPath = registryFlag ? registryFlag.slice('--registry='.length) : 'src/videos/_registry.md';

  if (!existsSync(registryPath)) {
    process.stderr.write(`ERROR: registry not found: ${registryPath}\n`);
    process.exit(1);
  }

  const registryText = readFileSync(registryPath, 'utf8');
  const seed = computeIdentitySeed(registryText);

  if (jsonMode) {
    process.stdout.write(JSON.stringify(seed, null, 2) + '\n');
  } else {
    const open = seed.openAxes.length > 0 ? seed.openAxes.join(', ') : '(all partially crowded)';
    const colliders = Object.keys(seed.collidersByAxis).length > 0
      ? Object.entries(seed.collidersByAxis)
          .map(([ax, slugs]) => `${ax}: ${slugs.join(',')}`)
          .join('; ')
      : 'none';

    process.stdout.write(`\n── Identity seed ───────────────────────────────────────────────
  luminance  ${seed.luminance}
  bg         ${seed.bg}
  surface    ${seed.surface}
  text       ${seed.text}
  textDim    ${seed.textDim}
  accent     ${seed.accent}
  display    ${seed.displayFamily} (${seed.displayClass})
  body       ${seed.bodyFamily} (${seed.bodyClass})
  arc        ${seed.arc}
  bpm        ${seed.bpmBpm} bpm (${seed.bpmBand})
  grain      ${seed.grainPct}% (${seed.grainBand})

  Open axes (zero prior uses): ${open}
  Colliders: ${colliders}
────────────────────────────────────────────────────────────────\n`);
  }
}
