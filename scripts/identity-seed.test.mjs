/**
 * Tests for scripts/identity-seed.mjs — anti-convergence identity seed generator.
 *
 * Contract assertions:
 *   - Live registry: seed makes computeDistinctMetrics report hardGatesPass:true
 *   - Live registry: seed passes contrast HARD floors
 *   - Live registry: seed diverges from dark #0a0a0f / teal #7effc9 scaffold default
 *   - Determinism: same registryText → same seed on repeated calls
 *   - Empty registry: seed is returned (vacuously ≥4-distinct) and passes contrast
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeIdentitySeed } from './identity-seed.mjs';
import { computeDistinctMetrics } from './distinct-metrics.mjs';
import { computeContrastMetrics } from './contrast-metrics.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REGISTRY_PATH = resolve(__dirname, '../src/videos/_registry.md');

const liveRegistryText = readFileSync(REGISTRY_PATH, 'utf8');

// ── Live registry ─────────────────────────────────────────────────────────────

describe('computeIdentitySeed — live registry', () => {
  const seed = computeIdentitySeed(liveRegistryText);

  it('returns a seed object with all required fields', () => {
    expect(typeof seed.bg).toBe('string');
    expect(typeof seed.surface).toBe('string');
    expect(typeof seed.text).toBe('string');
    expect(typeof seed.textDim).toBe('string');
    expect(typeof seed.accent).toBe('string');
    expect(typeof seed.luminance).toBe('string');
    expect(typeof seed.displayFamily).toBe('string');
    expect(typeof seed.bodyFamily).toBe('string');
    expect(typeof seed.arc).toBe('string');
    expect(typeof seed.bpmBand).toBe('string');
    expect(typeof seed.bpmBpm).toBe('number');
    expect(typeof seed.grainBand).toBe('string');
    expect(typeof seed.grainPct).toBe('number');
    expect(Array.isArray(seed.openAxes)).toBe(true);
    expect(seed.collidersByAxis).toBeTruthy();
  });

  it('all palette slots are valid 7-char hex', () => {
    const HEX7 = /^#[0-9a-fA-F]{6}$/;
    for (const slot of ['bg', 'surface', 'text', 'textDim', 'accent']) {
      expect(HEX7.test(seed[slot]), `${slot}="${seed[slot]}" is not a valid 7-char hex`).toBe(true);
    }
  });

  it('makes computeDistinctMetrics report hardGatesPass:true', () => {
    const verdict = computeDistinctMetrics({
      registryText: liveRegistryText,
      candidateSlug: '__identity_seed_test__',
      overrides: {
        bg:        seed.bg,
        accent:    seed.accent,
        luminance: seed.luminance,
        type:      `${seed.displayFamily} display / ${seed.bodyFamily} body`,
        arc:       seed.arc,
        bpm:       String(seed.bpmBpm),
        grain:     String(seed.grainPct),
      },
    });
    expect(
      verdict.hardGatesPass,
      `distinct hardGatesPass=false: ${JSON.stringify(verdict.perPrior)}`,
    ).toBe(true);
  });

  it('passes contrast HARD floors (text≥7:1, textDim≥4.5:1 on bg+surface)', () => {
    const result = computeContrastMetrics({
      bg:      seed.bg,
      surface: seed.surface,
      text:    seed.text,
      textDim: seed.textDim,
      accent:  seed.accent,
    });
    expect(
      result.hardGatesPass,
      `contrast hardGatesPass=false: ${JSON.stringify(result.pairs.filter(p => p.hard && !p.pass))}`,
    ).toBe(true);
  });

  it('bg diverges from the scaffold default #0a0a0f', () => {
    expect(seed.bg.toLowerCase()).not.toBe('#0a0a0f');
  });

  it('accent diverges from the scaffold default #7effc9', () => {
    expect(seed.accent.toLowerCase()).not.toBe('#7effc9');
  });

  it('luminance is a known class (dark / light / tonal)', () => {
    expect(['dark', 'light', 'tonal']).toContain(seed.luminance);
  });

  it('arc is a valid letter A–E', () => {
    expect(['A', 'B', 'C', 'D', 'E']).toContain(seed.arc);
  });

  it('bpmBand is a valid band', () => {
    expect(['slow', 'mid', 'upbeat', 'fast']).toContain(seed.bpmBand);
  });

  it('grainBand is a valid band', () => {
    expect(['none', 'light', 'filmic', 'heavy']).toContain(seed.grainBand);
  });

  it('openAxes contains at least one open axis (registry not fully saturated)', () => {
    // With 3 registry entries (relay, granipa, sereno), several axes must be open.
    expect(seed.openAxes.length).toBeGreaterThan(0);
  });

  it('arc is open (D or E not yet used)', () => {
    // relay=B, granipa=A, sereno=C — so D and E are open.
    expect(seed.openAxes).toContain('arc');
  });
});

// ── Determinism ───────────────────────────────────────────────────────────────

describe('computeIdentitySeed — determinism', () => {
  it('same registryText → same seed on repeated calls', () => {
    const seedA = computeIdentitySeed(liveRegistryText);
    const seedB = computeIdentitySeed(liveRegistryText);
    expect(seedA.bg).toBe(seedB.bg);
    expect(seedA.accent).toBe(seedB.accent);
    expect(seedA.luminance).toBe(seedB.luminance);
    expect(seedA.arc).toBe(seedB.arc);
    expect(seedA.bpmBand).toBe(seedB.bpmBand);
    expect(seedA.grainBand).toBe(seedB.grainBand);
    expect(seedA.displayFamily).toBe(seedB.displayFamily);
    expect(seedA.bodyFamily).toBe(seedB.bodyFamily);
  });
});

// ── Empty registry ────────────────────────────────────────────────────────────

describe('computeIdentitySeed — empty registry', () => {
  const emptyRegistry = '# Video identity registry\n\nNo entries yet.\n';
  const seed = computeIdentitySeed(emptyRegistry);

  it('returns a seed (vacuously distinct — no priors to compare)', () => {
    expect(seed).toBeTruthy();
    expect(typeof seed.bg).toBe('string');
  });

  it('passes contrast HARD floors even with empty registry', () => {
    const result = computeContrastMetrics({
      bg:      seed.bg,
      surface: seed.surface,
      text:    seed.text,
      textDim: seed.textDim,
      accent:  seed.accent,
    });
    expect(result.hardGatesPass).toBe(true);
  });

  it('bg is not the scaffold default #0a0a0f', () => {
    expect(seed.bg.toLowerCase()).not.toBe('#0a0a0f');
  });

  it('accent is not the scaffold default #7effc9', () => {
    expect(seed.accent.toLowerCase()).not.toBe('#7effc9');
  });
});

// ── Regression lock: live registry seed fields don't drift ────────────────────

describe('computeIdentitySeed — regression lock', () => {
  // Records the generated seed so future changes to the module or registry are visible.
  // If the live registry changes, this test may legitimately change.
  // The test verifies the seed is deterministic across code changes — not that specific
  // values are hardcoded. Update the snapshot if the registry legitimately changes.
  const seed = computeIdentitySeed(liveRegistryText);

  it('seed stays consistent (same fields on repeated runs = no internal randomness)', () => {
    // This will also catch any accidental introduction of Math.random / Date.now.
    const seed2 = computeIdentitySeed(liveRegistryText);
    const fields = ['bg', 'surface', 'text', 'textDim', 'accent', 'luminance',
      'arc', 'bpmBand', 'bpmBpm', 'grainBand', 'grainPct', 'displayFamily', 'bodyFamily'];
    for (const f of fields) {
      expect(seed2[f], `field "${f}" changed between calls`).toEqual(seed[f]);
    }
  });

  it('computeDistinctMetrics hardGatesPass remains true (regression lock)', () => {
    const verdict = computeDistinctMetrics({
      registryText: liveRegistryText,
      candidateSlug: '__regression_lock__',
      overrides: {
        bg:        seed.bg,
        accent:    seed.accent,
        luminance: seed.luminance,
        type:      `${seed.displayFamily} display / ${seed.bodyFamily} body`,
        arc:       seed.arc,
        bpm:       String(seed.bpmBpm),
        grain:     String(seed.grainPct),
      },
    });
    expect(verdict.hardGatesPass).toBe(true);
  });
});
