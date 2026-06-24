#!/usr/bin/env node
/**
 * scripts/ambient-motifs.mjs — ambient-field motif registry for scaffold code generation.
 *
 * Mirrors the AMBIENT_MOTIF_KEYS / AMBIENT_MOTIFS registry in src/lib/fx.tsx,
 * providing the metadata that new-video.mjs needs for code generation (no React).
 *
 * Exports:
 *   AMBIENT_MOTIF_KEYS  — ordered array of the 4 stable kebab slugs
 *   AMBIENT_MOTIFS      — map: slug → { title, componentName, gateRecipe }
 *
 * componentName: exact exported name from src/lib/fx.tsx to use in generated TSX.
 * gateRecipe:    minimum density + energy that guarantee hook gate-4/5 PASS by construction.
 */

export const AMBIENT_MOTIF_KEYS = ['strips', 'motes', 'grid-pulse', 'ember-rise'];

export const AMBIENT_MOTIFS = {
  strips: {
    title: 'Horizontal strips',
    componentName: 'AmbientField',
    gateRecipe: { density: 40, energy: 1 },
  },
  motes: {
    title: 'Drifting motes',
    componentName: 'MoteField',
    gateRecipe: { density: 80, energy: 1.5 },
  },
  'grid-pulse': {
    title: 'Pulsing grid',
    componentName: 'GridPulse',
    gateRecipe: { density: 40, energy: 1 },
  },
  'ember-rise': {
    title: 'Rising embers',
    componentName: 'EmberRise',
    gateRecipe: { density: 80, energy: 1.5 },
  },
};
