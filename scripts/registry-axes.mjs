#!/usr/bin/env node
// Registry-axis reader + crowding analyzer.
//
// Reuses distinct-metrics.mjs's parseRegistry (do not re-implement parsing)
// to load all entries as the 9-axis structured form, then aggregates per-axis
// 'crowding' — which values are already in use across all entries.
//
// Usage:
//   node scripts/registry-axes.mjs [--registry=<path>]
//
// Output: JSON object mapping axis name → array of used values
// (one entry per registry record for scalar axes; type-class is flat across all font families).

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseRegistry } from './distinct-metrics.mjs';

// ── Font family → class classifier ───────────────────────────────────────────

// Known serif fonts whose names don't contain the word "serif".
const KNOWN_SERIFS = ['playfair', 'georgia', 'garamond', 'times', 'merriweather', 'lora', 'caslon', 'baskerville'];

/**
 * Classify a lowercased font family name into one of: serif / sans / mono / grotesk.
 * Keyword-based heuristic; returns 'sans' for unknowns.
 */
function fontToClass(fontName) {
  const f = fontName.toLowerCase();
  if (f.includes('mono') || f.includes('code') || f.includes('courier')) return 'mono';
  if (f.includes('slab') || f.includes('serif') || KNOWN_SERIFS.some(s => f.includes(s))) return 'serif';
  if (f.includes('grotesk') || f.includes('grotesque')) return 'grotesk';
  if (f.includes('sans')) return 'sans';
  return 'sans';
}

// ── Core export ───────────────────────────────────────────────────────────────

/**
 * Read _registry.md and return per-axis crowding: which values are already in
 * use across all entries.
 *
 * Axes returned:
 *   luminance  — 'dark' | 'light' | 'tonal' | 'unknown'  (one per entry)
 *   accent-hue — 'blue-teal' | 'other' | 'unknown'       (one per entry)
 *   type-class — 'serif' | 'sans' | 'mono' | 'grotesk'   (one per font family, flat)
 *   arc        — 'A' | 'B' | 'C' | 'D' | 'E' | 'unknown' (one per entry)
 *   bpm-band   — 'slow' | 'mid' | 'upbeat' | 'fast' | 'unknown' (one per entry)
 *   grain-band — 'none' | 'light' | 'filmic' | 'heavy'   (one per entry)
 *
 * @param {string} registryText - full text of _registry.md
 * @returns {{ luminance: string[], 'accent-hue': string[], 'type-class': string[],
 *             arc: string[], 'bpm-band': string[], 'grain-band': string[] }}
 */
export function computeRegistryAxes(registryText) {
  const records = parseRegistry(registryText);

  const axes = {
    luminance:    [],
    'accent-hue': [],
    'type-class': [],
    arc:          [],
    'bpm-band':   [],
    'grain-band': [],
  };

  for (const { parsed: p } of records) {
    axes.luminance.push(p.luminance);
    axes['accent-hue'].push(p.accentHueBand);
    for (const family of p.typeFamilies) {
      axes['type-class'].push(fontToClass(family));
    }
    axes.arc.push(p.arc);
    axes['bpm-band'].push(p.bpmBand);
    axes['grain-band'].push(p.grainBand);
  }

  return axes;
}

// ── CLI entry point ───────────────────────────────────────────────────────────

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const registryFlag = args.find(a => a.startsWith('--registry='));
  const registryPath = registryFlag ? registryFlag.slice('--registry='.length) : 'src/videos/_registry.md';

  if (!existsSync(registryPath)) {
    process.stderr.write(`ERROR: registry not found: ${registryPath}\n`);
    process.exit(1);
  }

  const registryText = readFileSync(registryPath, 'utf8');
  const axes = computeRegistryAxes(registryText);
  process.stdout.write(JSON.stringify(axes, null, 2) + '\n');
}
