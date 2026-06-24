/**
 * Tests for registry-axes.mjs — registry-axis crowding analyzer.
 *
 * Fixtures:
 *   1. Live 3-entry registry (_registry.md): dark-luminance crowding, teal/blue accent cluster.
 *   2. Arc coverage: all 3 arc letters (A, B, C) present from relay/granipa/sereno.
 *   3. Grain coverage: filmic (relay, granipa) and none (sereno) both present.
 *   4. Font classification: grotesk (Space Grotesk), mono (JetBrains Mono),
 *      serif (Playfair Display), sans (DM Sans).
 *   5. Empty / no-entry registry → all arrays are empty.
 *   6. Single-entry synthetic: correct scalar values extracted.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeRegistryAxes } from './registry-axes.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REGISTRY_PATH = resolve(__dirname, '../src/videos/_registry.md');

// ── Live registry ────────────────────────────────────────────────────────────

describe('computeRegistryAxes — live 3-entry registry', () => {
  const registryText = readFileSync(REGISTRY_PATH, 'utf8');
  const axes = computeRegistryAxes(registryText);

  it('detects dark-luminance crowding — relay + granipa both dark', () => {
    const darkCount = axes.luminance.filter(v => v === 'dark').length;
    expect(darkCount).toBeGreaterThanOrEqual(2);
  });

  it('detects teal/blue accent cluster — granipa has blue accent', () => {
    expect(axes['accent-hue']).toContain('blue-teal');
  });

  it('has one luminance value per registry entry (3 total)', () => {
    expect(axes.luminance).toHaveLength(3);
  });

  it('has one arc value per registry entry (3 total)', () => {
    expect(axes.arc).toHaveLength(3);
  });

  it('has one bpm-band value per registry entry (3 total)', () => {
    expect(axes['bpm-band']).toHaveLength(3);
  });

  it('has one grain-band value per registry entry (3 total)', () => {
    expect(axes['grain-band']).toHaveLength(3);
  });

  it('includes all three arc letters A, B, C from relay/granipa/sereno', () => {
    expect(axes.arc).toContain('B'); // relay
    expect(axes.arc).toContain('A'); // granipa
    expect(axes.arc).toContain('C'); // sereno
  });

  it('includes both filmic and none grain bands', () => {
    expect(axes['grain-band']).toContain('filmic'); // relay + granipa
    expect(axes['grain-band']).toContain('none');   // sereno
  });

  it('classifies Space Grotesk as grotesk', () => {
    expect(axes['type-class']).toContain('grotesk');
  });

  it('classifies JetBrains Mono as mono', () => {
    expect(axes['type-class']).toContain('mono');
  });

  it('classifies Playfair Display as serif', () => {
    expect(axes['type-class']).toContain('serif');
  });

  it('classifies DM Sans as sans', () => {
    expect(axes['type-class']).toContain('sans');
  });
});

// ── Synthetic fixtures ────────────────────────────────────────────────────────

const SINGLE_ENTRY = `
## 1 · testprod / TestComp (2026-01-01)

| field           | value                                                              |
| --------------- | ------------------------------------------------------------------ |
| product         | Test product                                                       |
| arc             | D · twist                                                          |
| rhythm          | punchy — fast cuts with deliberate pauses                          |
| luminance       | light (#FAFAFA)                                                    |
| palette         | bg #FAFAFA · accent coral #FF6B6B                                  |
| type            | Playfair Display display / DM Sans body / JetBrains Mono terminal+data |
| signature moves | none                                                               |
| texture         | clean — grain 0%, vignette 0%                                      |
| transitions     | fade dissolves                                                     |
| music           | 160bpm punchy electronic                                           |
`;

describe('computeRegistryAxes — single-entry synthetic', () => {
  const axes = computeRegistryAxes(SINGLE_ENTRY);

  it('luminance = ["light"]', () => {
    expect(axes.luminance).toEqual(['light']);
  });

  it('arc = ["D"]', () => {
    expect(axes.arc).toEqual(['D']);
  });

  it('grain-band = ["none"] for grain 0%', () => {
    expect(axes['grain-band']).toEqual(['none']);
  });

  it('bpm-band = ["fast"] for 160bpm', () => {
    expect(axes['bpm-band']).toEqual(['fast']);
  });

  it('accent-hue is other (coral at ~0° is not blue-teal)', () => {
    expect(axes['accent-hue']).toEqual(['other']);
  });

  it('type-class includes serif, sans, mono from Playfair/DM Sans/JetBrains', () => {
    expect(axes['type-class']).toContain('serif');
    expect(axes['type-class']).toContain('sans');
    expect(axes['type-class']).toContain('mono');
  });
});

describe('computeRegistryAxes — empty registry', () => {
  it('returns empty arrays for all axes when no entries present', () => {
    const axes = computeRegistryAxes('# Video identity registry\n\nNo entries yet.\n');
    expect(axes.luminance).toEqual([]);
    expect(axes['accent-hue']).toEqual([]);
    expect(axes['type-class']).toEqual([]);
    expect(axes.arc).toEqual([]);
    expect(axes['bpm-band']).toEqual([]);
    expect(axes['grain-band']).toEqual([]);
  });
});
