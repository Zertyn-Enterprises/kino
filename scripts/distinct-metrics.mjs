#!/usr/bin/env node
// Distinctiveness gate — enforces the ≥4-axis anti-template rule (Hard Rule #3).
// Render-free: parses src/videos/_registry.md and computes per-axis divergence
// using CIE94 color distance, Jaccard similarity, and categorical comparisons.
//
// Usage:
//   node scripts/distinct-metrics.mjs [<slug>] [--bg=#.. --accent=#..] [--registry=..] [--json]
//   <slug>             slug of the candidate video (default: last registry entry)
//   --bg=#rrggbb       override candidate's bg hex (overrides derived AND registry value)
//   --accent=#rrggbb   override candidate's accent hex
//   --luminance=dark   override candidate's luminance class
//   --arc=B            override candidate's arc letter
//   --bpm=120          override candidate's bpm value
//   --grain=5          override candidate's grain % value
//   --registry=<path>  path to _registry.md (default: src/videos/_registry.md)
//   --json             emit structured JSON verdict instead of human-readable output
//
// Derived axes: when src/videos/<slug>/theme.ts is loadable, the 5 code-derivable axes
// (palette-bg, palette-accent, luminance, type, texture/grain) are derived from source and
// replace the registry-parsed values for those axes. Explicit flags above still override.
// The 4 non-derivable axes (arc, rhythm+moves, transitions, music-bpm) remain registry-sourced
// and are labeled with the three-state coverage model (ran/skip-na/coverage-gap) in the verdict.
//
// Registry-axis-drift HARD gate: when a candidate has both a registry entry and a loadable
// theme.ts, and a hand-typed registry axis disagrees with the derived value beyond tolerance
// (CIE94 ΔE > 5 for bg/accent; class mismatch for luminance; band mismatch for grain),
// the gate BLOCKS and names the field + registry-vs-source values. SKIP when theme.ts is
// unloadable or when there are <2 registry entries.
//
// Axes (9 total — Hard Rule #3 requires ≥4 to differ from every prior entry):
//   1. palette-bg:     CIE94 ΔE on bg hex > PALETTE_DELTA_E_THRESHOLD
//   2. palette-accent: CIE94 ΔE on primary accent hex > PALETTE_DELTA_E_THRESHOLD
//   3. luminance:      dark/light/tonal class must differ
//   4. type:           font family-set Jaccard < TYPE_JACCARD_THRESHOLD
//   5. arc:            A–E arc letter must differ
//   6. rhythm+moves:   combined token Jaccard of rhythm+signature-moves < TOKEN_JACCARD_THRESHOLD
//   7. texture:        grain% band (none/light/filmic/heavy) must differ
//   8. transitions:    token Jaccard of transitions field < TOKEN_JACCARD_THRESHOLD
//   9. music-bpm:      bpm band (slow/mid/upbeat/fast) must differ
//
// Verdicts:
//   HARD: candidate must differ on ≥4 axes from EVERY prior — non-zero exit; names colliders on fail.
//   Advisory drift: ≥N_DRIFT_THRESHOLD entries (incl. candidate) share a known default-drift axis
//     (bg-luminance dark/tonal family, JetBrains Mono, or blue/teal accent) → warning, never blocks.
//   SKIP: with <2 total entries, nothing to compare — exit 0, hardGatesPass:true.
//
// ── Threshold constants ─────────────────────────────────────────────────────────────────────────
//
// Calibrated so relay-vs-granipa real comparison PASSES ≥4-rule:
//
//   relay   bg #0A0E0B → Lab(3.55, -1.46,  0.77)   accent #B6F22E → Lab(88.8, -44.0,  79.5)
//   granipa bg #0A0B0E → Lab(3.26,  0.86, -4.55)   accent #3D8BFF → Lab(58.7,  15.5, -64.4)
//
//   palette-bg ΔE94      relay vs granipa ≈ 4.7 (note: below threshold — axes converge here
//                        but ≥4 other axes still differ, so hard rule satisfied)
//   palette-accent ΔE94  ≈ 72   > 5                             → DIFFERS
//   luminance            both derived as 'dark'                 → SAME
//   type Jaccard         {space grotesk, jetbrains mono} ∩ {sentient, switzer, jetbrains mono}
//                        = {jetbrains mono} / union(4) = 0.25  < TYPE_JACCARD_THRESHOLD=0.5 → DIFFERS
//   arc                  B vs A                                 → DIFFERS
//   rhythm+moves Jaccard ≈ 0.02  < TOKEN_JACCARD_THRESHOLD=0.5 → DIFFERS
//   texture              filmic(5%) vs filmic(4%)               → SAME (same band)
//   transitions Jaccard  ≈ 0.05  < 0.5                         → DIFFERS
//   music-bpm            upbeat(120bpm) vs mid(avg 110bpm)      → DIFFERS
//
//   6 of 9 axes differ → both shipped examples PASS (6 ≥ 4).
//   Drift advisory fires: bg-luminance (both dark) and mono-font (both JetBrains Mono).
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadTheme, themeToAxes } from './theme-axes.mjs';

// ── Constants ──────────────────────────────────────────────────────────────────────────────────

const MIN_DIFFERING_AXES = 4;        // Hard Rule #3
const PALETTE_DELTA_E_THRESHOLD = 5; // CIE94 ΔE for palette-bg and palette-accent
const TYPE_JACCARD_THRESHOLD = 0.5;  // font family-set Jaccard: < threshold → differs
const TOKEN_JACCARD_THRESHOLD = 0.5; // token Jaccard for rhythm+moves and transitions

// Advisory drift fires when this many entries (incl. candidate) share a default-drift axis.
// Set to 2 so the warning is visible from the very first convergence (n=2 both dark-bg).
const N_DRIFT_THRESHOLD = 2;

// BPM bands for music-bpm axis comparison.
const BPM_SLOW_MAX    = 89;   // ≤89 bpm
const BPM_MID_MAX     = 115;  // 90–115 bpm
const BPM_UPBEAT_MAX  = 140;  // 116–140 bpm
// fast: >140 bpm

// Grain % bands for texture axis comparison.
const GRAIN_LIGHT_MAX  = 3.0;  // 0.1–3.0% → light filmic
const GRAIN_FILMIC_MAX = 7.0;  // 3.1–7.0% → filmic

// Non-derivable axis names (registry-only; labeled with three-state coverage model).
const NON_DERIVABLE_AXES = ['arc', 'rhythm+moves', 'transitions', 'music-bpm'];

// ── Color science: sRGB → Lab → CIE94 ΔE ──────────────────────────────────────────────────────

/** Parse a hex color string to [R, G, B] (0–255 integers). */
export function parseHex(hex) {
  const h = hex.replace('#', '');
  if (h.length !== 6) throw new Error(`Invalid hex: ${hex}`);
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function toLinear(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function labF(t) {
  return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
}

/** Convert hex color to CIE L*a*b* (D65 illuminant). */
export function hexToLab(hex) {
  const [r, g, b] = parseHex(hex);
  const rL = toLinear(r / 255);
  const gL = toLinear(g / 255);
  const bL = toLinear(b / 255);
  const X = 0.4124564 * rL + 0.3575761 * gL + 0.1804375 * bL;
  const Y = 0.2126729 * rL + 0.7151522 * gL + 0.0721750 * bL;
  const Z = 0.0193339 * rL + 0.1191920 * gL + 0.9503041 * bL;
  const fx = labF(X / 0.95047);
  const fy = labF(Y / 1.00000);
  const fz = labF(Z / 1.08883);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/**
 * CIE94 perceptual color distance (graphic-arts weights: kL=kC=kH=1).
 * Uses the chroma of lab1 as reference (comparing candidate against prior).
 */
export function deltaE94(lab1, lab2) {
  const [L1, a1, b1] = lab1;
  const [L2, a2, b2] = lab2;
  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const dL = L1 - L2;
  const dC = C1 - C2;
  const dH2 = (a1 - a2) ** 2 + (b1 - b2) ** 2 - dC ** 2;
  const dH = dH2 > 0 ? Math.sqrt(dH2) : 0;
  const SC = 1 + 0.045 * C1;
  const SH = 1 + 0.015 * C1;
  return Math.sqrt(dL ** 2 + (dC / SC) ** 2 + (dH / SH) ** 2);
}

// ── Set utilities ─────────────────────────────────────────────────────────────────────────────

/**
 * Jaccard similarity index for two Sets (or arrays).
 * Returns 1.0 when both are empty (identical empty sets).
 */
export function jaccard(a, b) {
  const setA = a instanceof Set ? a : new Set(a);
  const setB = b instanceof Set ? b : new Set(b);
  if (setA.size === 0 && setB.size === 0) return 1.0;
  let inter = 0;
  for (const v of setA) if (setB.has(v)) inter++;
  return inter / (setA.size + setB.size - inter);
}

/**
 * Tokenize a string for Jaccard comparison.
 * Lowercases, splits on non-alphanumeric runs, drops tokens shorter than 3 chars.
 */
export function tokenSet(str) {
  return new Set(
    str.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length >= 3),
  );
}

// ── Field parsers ──────────────────────────────────────────────────────────────────────────────

/**
 * Extract luminance class: 'dark' | 'light' | 'tonal' | 'unknown'.
 * Priority: 'tonal' wins over 'dark' (e.g. "tonal dark" → 'tonal').
 */
export function parseLuminanceClass(str) {
  const s = str.toLowerCase();
  if (s.includes('tonal')) return 'tonal';
  if (s.includes('light')) return 'light';
  if (s.includes('dark')) return 'dark';
  return 'unknown';
}

/**
 * Extract font family names from the type field.
 * Input: "Space Grotesk display+body / JetBrains Mono terminal+data"
 * Output: ["space grotesk", "jetbrains mono"]
 */
export function parseFontFamilies(str) {
  return str
    .split('/')
    .map(seg =>
      seg
        .trim()
        // Strip role specifications at end of segment:
        //   "word+word[+word]*"  e.g. "display+body", "terminal+data"
        //   unambiguous solo roles: "display", "body", "heading", "ui"
        // Does NOT strip "mono", "terminal", "data" alone — they can be font name parts.
        .replace(/\s+(?:\w+\+\w+[\w+]*|(display|body|heading|ui))\s*$/i, '')
        .trim()
        .toLowerCase(),
    )
    .filter(Boolean);
}

/**
 * Extract the arc letter (A–E) from an arc field.
 * Input: "B · problem-first"
 * Output: "B"
 */
export function parseArc(str) {
  const m = str.trim().match(/^([A-E])/i);
  return m ? m[1].toUpperCase() : 'unknown';
}

/**
 * Extract grain% from a texture field and return a band label.
 * Input: "filmic — grain 5%, vignette 0.3, no light leaks"
 * Output: "filmic"
 */
export function parseGrainBand(str) {
  if (/\bclean\b/i.test(str) && !/grain/i.test(str)) return 'none';
  const m = str.match(/grain\s+([\d.]+)%/i);
  if (!m) return 'none';
  const pct = parseFloat(m[1]);
  if (pct === 0) return 'none';
  if (pct <= GRAIN_LIGHT_MAX) return 'light';
  if (pct <= GRAIN_FILMIC_MAX) return 'filmic';
  return 'heavy';
}

/**
 * Extract bpm from a music field and return a band label.
 * Handles ranges ("~98–122bpm" → avg 110) and singles ("120bpm").
 * Input: "warm assured modern, ~98–122bpm character"
 * Output: "mid"
 */
export function parseBpmBand(str) {
  const rangeM = str.match(/(\d+)\s*[-–]\s*(\d+)\s*bpm/i);
  if (rangeM) {
    const avg = (parseInt(rangeM[1]) + parseInt(rangeM[2])) / 2;
    return bpmToBand(avg);
  }
  const singleM = str.match(/~?(\d+)\s*bpm/i);
  if (singleM) return bpmToBand(parseInt(singleM[1]));
  return 'unknown';
}

function bpmToBand(bpm) {
  if (bpm <= BPM_SLOW_MAX)   return 'slow';
  if (bpm <= BPM_MID_MAX)    return 'mid';
  if (bpm <= BPM_UPBEAT_MAX) return 'upbeat';
  return 'fast';
}

/** Convert a numeric grain% from themeToAxes() to a grain band label. */
export function grainPctToBand(pct) {
  if (pct == null || pct <= 0) return 'none';
  if (pct <= GRAIN_LIGHT_MAX)  return 'light';
  if (pct <= GRAIN_FILMIC_MAX) return 'filmic';
  return 'heavy';
}

/**
 * Extract bg and primary accent hex from a palette field.
 * Input: "bg #0A0E0B · accent lime #B6F22E (live-only) · alt red #E5484D"
 * Output: { bg: '#0A0E0B', accent: '#B6F22E' }
 */
export function parsePaletteHex(str) {
  const bgM     = str.match(/\bbg\s+(#[0-9a-fA-F]{6})\b/);
  const accentM = str.match(/\baccent(?:\s+\w+)?\s+(#[0-9a-fA-F]{6})\b/);
  return {
    bg:     bgM     ? bgM[1]     : null,
    accent: accentM ? accentM[1] : null,
  };
}

// ── Registry parser ────────────────────────────────────────────────────────────────────────────

/**
 * Parse _registry.md into an ordered array of identity records.
 * Each record: { slug, fields: Map<string,string>, parsed: { bg, accent, luminance, ... } }
 */
export function parseRegistry(markdownText) {
  const records = [];

  // Split into sections at ## N · headings.
  const sections = markdownText.split(/^(?=## \d+\s*·)/m).filter(s => /^## \d+\s*·/.test(s));

  for (const section of sections) {
    // Extract slug from heading: "## 1 · relay / RelayLaunch (2026-06-11)"
    const headingM = section.match(/^## \d+\s*·\s*([\w-]+)/m);
    if (!headingM) continue;
    const slug = headingM[1].toLowerCase();

    // Parse the markdown table: | field | value | rows
    const fields = new Map();
    const tableRows = [...section.matchAll(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/gm)];
    for (const row of tableRows) {
      const key = row[1].trim().toLowerCase();
      const val = row[2].trim();
      if (key === 'field') continue; // skip header row
      fields.set(key, val);
    }
    if (fields.size === 0) continue;

    const paletteStr = fields.get('palette') ?? '';
    const { bg, accent } = parsePaletteHex(paletteStr);
    const typeStr = fields.get('type') ?? '';
    const rhythmStr = fields.get('rhythm') ?? '';
    const sigMovesStr = fields.get('signature moves') ?? '';
    const textureStr = fields.get('texture') ?? '';
    const transStr = fields.get('transitions') ?? '';
    const musicStr = fields.get('music') ?? '';

    records.push({
      slug,
      fields,
      parsed: {
        bg,
        accent,
        luminance:        parseLuminanceClass(fields.get('luminance') ?? ''),
        typeFamilies:     parseFontFamilies(typeStr),
        arc:              parseArc(fields.get('arc') ?? ''),
        rhythmMoveTokens: new Set([...tokenSet(rhythmStr), ...tokenSet(sigMovesStr)]),
        grainBand:        parseGrainBand(textureStr),
        transitionTokens: tokenSet(transStr),
        bpmBand:          parseBpmBand(musicStr),
        // for drift checks
        usesJetbrainsMono: typeStr.toLowerCase().includes('jetbrains mono'),
        accentHueBand:    accent ? hueToFamily(hexToHue(accent)) : 'unknown',
      },
    });
  }

  return records;
}

// ── Accent hue helpers (for drift detection) ──────────────────────────────────────────────────

/** Convert hex to HSL hue (0–360°). Returns null if hex is null. */
function hexToHue(hex) {
  if (!hex) return null;
  const [r, g, b] = parseHex(hex).map(c => c / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  let h;
  if (max === r)      h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else                h = ((r - g) / d + 4) * 60;
  return h;
}

/**
 * Map hue to a family for drift detection.
 * Blue/teal (151°–240°) is the known default-drift accent family.
 */
function hueToFamily(hue) {
  if (hue == null) return 'unknown';
  if (hue >= 151 && hue <= 240) return 'blue-teal';
  return 'other';
}

// ── Per-axis divergence ───────────────────────────────────────────────────────────────────────

/**
 * Compute which axes the candidate differs from the prior on.
 * Both candidate and prior must be parsed identity records.
 * Returns an array of axis names that DIFFER.
 */
export function computeAxisDivergences(candidate, prior) {
  const differing = [];

  // 1. palette-bg
  if (candidate.bg && prior.bg) {
    try {
      const e = deltaE94(hexToLab(candidate.bg), hexToLab(prior.bg));
      if (e > PALETTE_DELTA_E_THRESHOLD) differing.push('palette-bg');
    } catch { /* invalid hex — skip axis */ }
  }

  // 2. palette-accent
  if (candidate.accent && prior.accent) {
    try {
      const e = deltaE94(hexToLab(candidate.accent), hexToLab(prior.accent));
      if (e > PALETTE_DELTA_E_THRESHOLD) differing.push('palette-accent');
    } catch { /* invalid hex — skip axis */ }
  }

  // 3. luminance class
  if (candidate.luminance !== 'unknown' && prior.luminance !== 'unknown' &&
      candidate.luminance !== prior.luminance) {
    differing.push('luminance');
  }

  // 4. type (font family-set Jaccard)
  const typeJaccard = jaccard(candidate.typeFamilies, prior.typeFamilies);
  if (typeJaccard < TYPE_JACCARD_THRESHOLD) differing.push('type');

  // 5. arc
  if (candidate.arc !== 'unknown' && prior.arc !== 'unknown' &&
      candidate.arc !== prior.arc) {
    differing.push('arc');
  }

  // 6. rhythm + signature-moves (combined token Jaccard)
  const rhythmJaccard = jaccard(candidate.rhythmMoveTokens, prior.rhythmMoveTokens);
  if (rhythmJaccard < TOKEN_JACCARD_THRESHOLD) differing.push('rhythm+moves');

  // 7. texture (grain band)
  if (candidate.grainBand !== prior.grainBand) differing.push('texture');

  // 8. transitions (token Jaccard)
  const transJaccard = jaccard(candidate.transitionTokens, prior.transitionTokens);
  if (transJaccard < TOKEN_JACCARD_THRESHOLD) differing.push('transitions');

  // 9. music-bpm (band)
  if (candidate.bpmBand !== 'unknown' && prior.bpmBand !== 'unknown' &&
      candidate.bpmBand !== prior.bpmBand) {
    differing.push('music-bpm');
  }

  return differing;
}

// ── Drift detection ───────────────────────────────────────────────────────────────────────────

/**
 * Check for convergence drift on known default-drift axes.
 * allEntries: all registry records including the candidate (already parsed).
 * Returns an array of advisory drift warning strings.
 */
export function computeDriftWarnings(allEntries) {
  const warnings = [];

  // bg-luminance: dark and tonal are both "dark-family" defaults
  const darkFamily = allEntries.filter(e => e.parsed.luminance === 'dark' || e.parsed.luminance === 'tonal');
  if (darkFamily.length >= N_DRIFT_THRESHOLD) {
    warnings.push(`bg-luminance drift (${darkFamily.length} entries: ${darkFamily.map(e => `${e.slug}=${e.parsed.luminance}`).join(', ')})`);
  }

  // mono-font: JetBrains Mono is the default mono
  const jbMono = allEntries.filter(e => e.parsed.usesJetbrainsMono);
  if (jbMono.length >= N_DRIFT_THRESHOLD) {
    warnings.push(`mono-font drift (${jbMono.length} entries use JetBrains Mono: ${jbMono.map(e => e.slug).join(', ')})`);
  }

  // accent-hue: blue/teal is the default accent drift direction
  const blueTeal = allEntries.filter(e => e.parsed.accentHueBand === 'blue-teal');
  if (blueTeal.length >= N_DRIFT_THRESHOLD) {
    warnings.push(`accent-hue drift (${blueTeal.length} entries have blue/teal accent: ${blueTeal.map(e => e.slug).join(', ')})`);
  }

  return warnings;
}

// ── Main computation ──────────────────────────────────────────────────────────────────────────

/**
 * Compute the distinctiveness verdict for a candidate against all prior registry entries.
 *
 * @param {object} opts
 * @param {string}      opts.registryText   - full text of _registry.md
 * @param {string|null} opts.candidateSlug  - slug to find candidate (null = last entry)
 * @param {object}      [opts.overrides]    - field overrides applied to the candidate's parsed record
 *   Supported: bg, accent, luminance, arc, bpmBand, grainBand
 * @param {object|null} [opts.derivedAxes]  - output of themeToAxes() for the candidate's theme.ts;
 *   when provided, replaces registry-parsed values for the 5 code-derivable axes before overrides
 *   are applied. Also triggers registry-axis-drift HARD check when candidate is in the registry.
 * @returns {object} metrics verdict matching ship-metrics gate contract
 */
export function computeDistinctMetrics({ registryText, candidateSlug = null, overrides = {}, derivedAxes = null }) {
  const allRecords = parseRegistry(registryText);

  // SKIP when fewer than 2 entries total — nothing to compare.
  if (allRecords.length < 2) {
    return {
      hardGatesPass: true,
      skip: true,
      n: allRecords.length,
      candidateSlug: allRecords[0]?.slug ?? null,
      priorSlugs: [],
      perPrior: [],
      nonDerivableCoverage: Object.fromEntries(NON_DERIVABLE_AXES.map(a => [a, 'skip-na'])),
      gates: [
        { name: 'HARD: ≥4 axes distinct from every prior', hard: true, advisory: false, pass: true, skip: true, detail: `n=${allRecords.length} — nothing to compare` },
      ],
    };
  }

  // Identify candidate, priors, and whether candidate is pre-registry.
  let candidateRecord, priorRecords, isPreRegistry = false;
  let registryDriftGate = null;

  if (candidateSlug) {
    const idx = allRecords.findIndex(r => r.slug === candidateSlug.toLowerCase());
    if (idx === -1) {
      isPreRegistry = true;
      // Slug not in registry: synthesize candidate from derived axes + overrides.
      if (derivedAxes) {
        const base = {
          slug: candidateSlug.toLowerCase(), fields: new Map(),
          parsed: {
            bg:               overrides.bg     ?? derivedAxes.bg,
            accent:           overrides.accent ?? derivedAxes.accent,
            luminance:        overrides.luminance ? parseLuminanceClass(overrides.luminance) : derivedAxes.luminance,
            typeFamilies:     derivedAxes.fonts,
            arc:              overrides.arc  ? parseArc(overrides.arc)             : 'unknown',
            rhythmMoveTokens: new Set(),
            grainBand:        overrides.grain ? parseGrainBand(`grain ${overrides.grain}%`) : grainPctToBand(derivedAxes.grainPct),
            transitionTokens: new Set(),
            bpmBand:          overrides.bpm  ? bpmToBand(parseInt(overrides.bpm)) : 'unknown',
            usesJetbrainsMono: derivedAxes.fonts.some(f => f.includes('jetbrains mono')),
            accentHueBand:    derivedAxes.accent ? hueToFamily(hexToHue(overrides.accent ?? derivedAxes.accent)) : 'unknown',
          },
        };
        candidateRecord = base;
      } else {
        candidateRecord = synthesizeCandidate(candidateSlug, overrides);
      }
      priorRecords = allRecords;
    } else {
      const rawRecord = allRecords[idx];
      if (derivedAxes) {
        // Registry-axis-drift: compare RAW registry values against derived source values.
        registryDriftGate = computeRegistryDriftGate(rawRecord, derivedAxes);
        // Apply derived axes first (replaces 5 code-derivable axes), then CLI overrides.
        candidateRecord = applyOverrides(applyDerivedAxesToRecord(rawRecord, derivedAxes), overrides);
      } else {
        candidateRecord = applyOverrides(rawRecord, overrides);
      }
      priorRecords = [...allRecords.slice(0, idx), ...allRecords.slice(idx + 1)];
    }
  } else {
    // Default: last entry is the candidate; all others are priors.
    const rawRecord = allRecords[allRecords.length - 1];
    if (derivedAxes) {
      registryDriftGate = computeRegistryDriftGate(rawRecord, derivedAxes);
      candidateRecord = applyOverrides(applyDerivedAxesToRecord(rawRecord, derivedAxes), overrides);
    } else {
      candidateRecord = applyOverrides(rawRecord, overrides);
    }
    priorRecords = allRecords.slice(0, allRecords.length - 1);
  }

  // Per-prior HARD rule evaluation.
  const perPrior = priorRecords.map(prior => {
    const differingAxes = computeAxisDivergences(candidateRecord.parsed, prior.parsed);
    return {
      priorSlug: prior.slug,
      differingAxes,
      differingCount: differingAxes.length,
      hardPass: differingAxes.length >= MIN_DIFFERING_AXES,
      collidingAxes: differingAxes.length < MIN_DIFFERING_AXES
        ? ['palette-bg','palette-accent','luminance','type','arc','rhythm+moves','texture','transitions','music-bpm']
            .filter(a => !differingAxes.includes(a))
        : [],
    };
  });

  const antiTemplatePass = perPrior.every(p => p.hardPass);
  const driftPass = registryDriftGate ? registryDriftGate.pass : true;
  const hardGatesPass = driftPass && antiTemplatePass;

  // Advisory drift check over all entries (candidate + priors).
  const allEntries = [candidateRecord, ...priorRecords];
  const driftWarnings = computeDriftWarnings(allEntries);

  // Non-derivable coverage labels.
  const nonDerivableCoverage = computeNonDerivableCoverage(candidateRecord, isPreRegistry);

  // Build gates array matching ship-metrics contract.
  const hardDetail = antiTemplatePass
    ? `all ${perPrior.length} prior(s) satisfied ≥${MIN_DIFFERING_AXES} axes`
    : perPrior
        .filter(p => !p.hardPass)
        .map(p => `vs ${p.priorSlug}: ${p.differingCount} axes differ (${p.differingCount === 0 ? 'none' : p.differingAxes.join(', ')}); colliding: ${p.collidingAxes.join(', ')}`)
        .join('; ');

  const gates = [];
  if (registryDriftGate) gates.push(registryDriftGate);
  gates.push({
    name: 'HARD: ≥4 axes distinct from every prior',
    hard: true, advisory: false,
    pass: antiTemplatePass, skip: false,
    detail: hardDetail,
  });
  for (const w of driftWarnings) {
    gates.push({ name: `Advisory: ${w}`, hard: false, advisory: true, pass: false, skip: false, detail: w });
  }

  return {
    hardGatesPass,
    skip: false,
    n: allRecords.length,
    candidateSlug: candidateRecord.slug,
    priorSlugs: priorRecords.map(r => r.slug),
    perPrior,
    nonDerivableCoverage,
    gates,
  };
}

/** Synthesize a minimal candidate record from CLI overrides when slug not found in registry. */
function synthesizeCandidate(slug, overrides) {
  const parsed = {
    bg:               overrides.bg     ?? null,
    accent:           overrides.accent ?? null,
    luminance:        overrides.luminance ? parseLuminanceClass(overrides.luminance) : 'unknown',
    typeFamilies:     overrides.type ? parseFontFamilies(overrides.type) : [],
    arc:              overrides.arc    ? parseArc(overrides.arc)         : 'unknown',
    rhythmMoveTokens: overrides.rhythm ? tokenSet(overrides.rhythm)      : new Set(),
    grainBand:        overrides.grain  ? parseGrainBand(`grain ${overrides.grain}%`) : 'unknown',
    transitionTokens: overrides.transitions ? tokenSet(overrides.transitions) : new Set(),
    bpmBand:          overrides.bpm    ? bpmToBand(parseInt(overrides.bpm)) : 'unknown',
    usesJetbrainsMono: overrides.type ? overrides.type.toLowerCase().includes('jetbrains mono') : false,
    accentHueBand:    overrides.accent ? hueToFamily(hexToHue(overrides.accent)) : 'unknown',
  };
  return { slug: slug.toLowerCase(), fields: new Map(), parsed };
}

/** Apply CLI override values to an existing registry record's parsed fields. */
function applyOverrides(record, overrides) {
  if (Object.keys(overrides).length === 0) return record;
  const parsed = { ...record.parsed };
  if (overrides.bg)           parsed.bg             = overrides.bg;
  if (overrides.accent) {
    parsed.accent         = overrides.accent;
    parsed.accentHueBand  = hueToFamily(hexToHue(overrides.accent));
  }
  if (overrides.luminance)    parsed.luminance       = parseLuminanceClass(overrides.luminance);
  if (overrides.arc)          parsed.arc             = parseArc(overrides.arc);
  if (overrides.bpm)          parsed.bpmBand         = bpmToBand(parseInt(overrides.bpm));
  if (overrides.grain)        parsed.grainBand       = parseGrainBand(`grain ${overrides.grain}%`);
  return { ...record, parsed };
}

/**
 * Apply derived axes from themeToAxes() to a registry record for the 5 code-derivable axes.
 * Does NOT apply CLI overrides — call applyOverrides() after this.
 */
function applyDerivedAxesToRecord(record, derivedAxes) {
  const parsed = { ...record.parsed };
  if (derivedAxes.bg)                    parsed.bg          = derivedAxes.bg;
  if (derivedAxes.accent) {
    parsed.accent       = derivedAxes.accent;
    parsed.accentHueBand = hueToFamily(hexToHue(derivedAxes.accent));
  }
  if (derivedAxes.luminance !== 'unknown') parsed.luminance  = derivedAxes.luminance;
  if (derivedAxes.grainPct != null)        parsed.grainBand  = grainPctToBand(derivedAxes.grainPct);
  if (derivedAxes.fonts.length > 0) {
    parsed.typeFamilies     = derivedAxes.fonts;
    parsed.usesJetbrainsMono = derivedAxes.fonts.some(f => f.includes('jetbrains mono'));
  }
  return { ...record, parsed };
}

/**
 * Compute the registry-axis-drift HARD gate: compares RAW registry values against derived
 * source values. Returns a gate object; pass:true when no drift beyond tolerance.
 *
 * Tolerances:
 *   bg/accent: CIE94 ΔE > PALETTE_DELTA_E_THRESHOLD (same as anti-template threshold)
 *   luminance: class mismatch (dark / tonal / light)
 *   grain:     band mismatch (none / light / filmic / heavy)
 */
export function computeRegistryDriftGate(rawRecord, derivedAxes) {
  const reg = rawRecord.parsed;
  const driftFields = [];

  if (reg.bg && derivedAxes.bg) {
    try {
      const e = deltaE94(hexToLab(reg.bg), hexToLab(derivedAxes.bg));
      if (e > PALETTE_DELTA_E_THRESHOLD) {
        driftFields.push({ field: 'palette-bg', registry: reg.bg, source: derivedAxes.bg, detail: `ΔE94=${e.toFixed(1)}` });
      }
    } catch { /* ignore invalid hex */ }
  }

  if (reg.accent && derivedAxes.accent) {
    try {
      const e = deltaE94(hexToLab(reg.accent), hexToLab(derivedAxes.accent));
      if (e > PALETTE_DELTA_E_THRESHOLD) {
        driftFields.push({ field: 'palette-accent', registry: reg.accent, source: derivedAxes.accent, detail: `ΔE94=${e.toFixed(1)}` });
      }
    } catch { /* ignore invalid hex */ }
  }

  const derivedLum = derivedAxes.luminance;
  if (derivedLum !== 'unknown' && reg.luminance !== 'unknown' && reg.luminance !== derivedLum) {
    driftFields.push({ field: 'luminance', registry: reg.luminance, source: derivedLum });
  }

  if (derivedAxes.grainPct != null) {
    const derivedGrain = grainPctToBand(derivedAxes.grainPct);
    if (derivedGrain !== reg.grainBand) {
      driftFields.push({ field: 'texture/grain', registry: reg.grainBand, source: derivedGrain });
    }
  }

  if (driftFields.length === 0) {
    return { name: 'HARD: registry-axis-drift', hard: true, advisory: false, pass: true, skip: false,
             detail: 'registry matches source on all derivable axes' };
  }

  const detail = driftFields
    .map(f => `${f.field}: registry=${f.registry} source=${f.source}${f.detail ? ` (${f.detail})` : ''}`)
    .join('; ');
  return { name: 'HARD: registry-axis-drift', hard: true, advisory: false, pass: false, skip: false, detail };
}

/**
 * Label the 4 non-derivable axes with the three-state coverage model.
 *   'ran'          — axis value found and used in comparison
 *   'coverage-gap' — registry entry exists but the field is missing / unparseable
 *   'skip-na'      — no registry entry for candidate (pre-registry mode)
 */
export function computeNonDerivableCoverage(candidateRecord, isPreRegistry) {
  if (isPreRegistry) {
    return Object.fromEntries(NON_DERIVABLE_AXES.map(a => [a, 'skip-na']));
  }
  const p = candidateRecord.parsed;
  return {
    'arc':          p.arc !== 'unknown'           ? 'ran' : 'coverage-gap',
    'rhythm+moves': p.rhythmMoveTokens.size > 0   ? 'ran' : 'coverage-gap',
    'transitions':  p.transitionTokens.size > 0   ? 'ran' : 'coverage-gap',
    'music-bpm':    p.bpmBand !== 'unknown'        ? 'ran' : 'coverage-gap',
  };
}

// ── Human-readable output ─────────────────────────────────────────────────────────────────────

function printHumanReadable(verdict) {
  const { hardGatesPass, skip, candidateSlug, priorSlugs, perPrior, gates } = verdict;

  console.log('\n── Distinctiveness metrics ─────────────────────────────────────');

  if (skip) {
    const gate = gates[0];
    console.log(`  SKIP: ${gate.detail}`);
    console.log('───────────────────────────────────────────────────────────────');
    console.log('HARD GATES: PASS (SKIP)\n');
    return;
  }

  console.log(`  Candidate: ${candidateSlug}  |  Priors: ${priorSlugs.join(', ')}`);
  console.log('');

  const driftGate = gates.find(g => g.name === 'HARD: registry-axis-drift');
  if (driftGate) {
    const driftLabel = driftGate.pass ? 'PASS' : 'FAIL';
    console.log(`  Registry-axis-drift: ${driftLabel}`);
    if (!driftGate.pass) console.log(`    ${driftGate.detail}`);
    console.log('');
  }

  for (const p of perPrior) {
    const verdict_ = p.hardPass ? 'PASS' : 'FAIL';
    console.log(`  vs ${p.priorSlug}: ${verdict_} (${p.differingCount}/${['palette-bg','palette-accent','luminance','type','arc','rhythm+moves','texture','transitions','music-bpm'].length} axes differ)`);
    console.log(`    differ:  ${p.differingAxes.join(', ') || '(none)'}`);
    if (!p.hardPass) {
      console.log(`    collide: ${p.collidingAxes.join(', ')}`);
    }
  }

  const advisoryGates = gates.filter(g => g.advisory && !g.pass);
  if (advisoryGates.length > 0) {
    console.log('');
    console.log('  Convergence drift (advisory):');
    for (const g of advisoryGates) console.log(`    ⚠  ${g.detail}`);
  }

  console.log('───────────────────────────────────────────────────────────────');
  console.log(`HARD GATES: ${hardGatesPass ? 'PASS' : 'FAIL'}\n`);
}

// ── CLI entry point ───────────────────────────────────────────────────────────────────────────

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');

  function getFlag(name) {
    const a = args.find(a => a.startsWith(`--${name}=`));
    return a ? a.slice(name.length + 3) : null;
  }

  const registryPath = getFlag('registry') ?? 'src/videos/_registry.md';
  const slugFlag     = getFlag('slug');

  // First positional arg is the candidate slug (if not --slug=).
  const positional = args.filter(a => !a.startsWith('--'));
  const candidateSlug = slugFlag ?? positional[0] ?? null;

  if (!existsSync(registryPath)) {
    process.stderr.write(`ERROR: registry not found: ${registryPath}\n`);
    process.exit(1);
  }

  const registryText = readFileSync(registryPath, 'utf8');

  const overrides = {};
  const bgFlag         = getFlag('bg');
  const accentFlag     = getFlag('accent');
  const luminanceFlag  = getFlag('luminance');
  const arcFlag        = getFlag('arc');
  const bpmFlag        = getFlag('bpm');
  const grainFlag      = getFlag('grain');
  if (bgFlag)         overrides.bg          = bgFlag;
  if (accentFlag)     overrides.accent      = accentFlag;
  if (luminanceFlag)  overrides.luminance   = luminanceFlag;
  if (arcFlag)        overrides.arc         = arcFlag;
  if (bpmFlag)        overrides.bpm         = bpmFlag;
  if (grainFlag)      overrides.grain       = grainFlag;

  // Try to load derived axes from theme.ts; SKIP gracefully if unloadable.
  let derivedAxes = null;
  if (candidateSlug) {
    try {
      const theme = await loadTheme(candidateSlug);
      derivedAxes = themeToAxes(theme);
    } catch {
      // theme.ts unloadable — run registry-only path
    }
  }

  const verdict = computeDistinctMetrics({ registryText, candidateSlug, overrides, derivedAxes });

  if (jsonMode) {
    process.stdout.write(JSON.stringify(verdict, null, 2) + '\n');
  } else {
    printHumanReadable(verdict);
  }

  process.exit(verdict.hardGatesPass ? 0 : 1);
}
