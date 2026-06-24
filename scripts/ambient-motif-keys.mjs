#!/usr/bin/env node
/**
 * scripts/ambient-motif-keys.mjs — ambient-field motif key registry (render-free).
 *
 * Mirrors the AMBIENT_MOTIF_KEYS / AMBIENT_MOTIFS registry in src/lib/fx.tsx
 * but lives in scripts/ so scaffold tooling (new-video.mjs, identity-seed.mjs)
 * can import it without loading TypeScript.
 *
 * Exports:
 *   AMBIENT_MOTIF_KEYS        — ordered const array of the 4 stable motif slugs
 *   AMBIENT_MOTIF_COMPONENT_NAMES — map: slug → exported component name in fx.tsx
 */

/** Ordered list of all stable ambient-field motif slugs. */
export const AMBIENT_MOTIF_KEYS = ['strips', 'motes', 'grid-pulse', 'ember-rise'];

/**
 * Map from motif slug to the React component name exported from src/lib/fx.tsx.
 * 'strips' → 'AmbientField' (the original; itemH prop available)
 * Others   → their new named exports (AmbientMotifProps surface; no itemH)
 */
export const AMBIENT_MOTIF_COMPONENT_NAMES = {
  strips:       'AmbientField',
  motes:        'MoteField',
  'grid-pulse': 'GridPulse',
  'ember-rise': 'EmberRise',
};

/**
 * Gate recipe (minimum density + energy) for each motif to produce hook gate-4/5 PASSes.
 * Callers may use higher values; these are the floors.
 */
export const AMBIENT_MOTIF_GATE_RECIPES = {
  strips:       { density: 40,  energy: 1.0 },
  motes:        { density: 80,  energy: 1.5 },
  'grid-pulse': { density: 40,  energy: 1.0 },
  'ember-rise': { density: 80,  energy: 1.5 },
};
