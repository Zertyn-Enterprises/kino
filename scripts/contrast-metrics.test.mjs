/**
 * Regression tests for computeContrastMetrics.
 *
 * Three fixture sets:
 *   - Golden positive (relay):   relay palette → hardGatesPass true
 *   - Golden positive (granipa): granipa palette → hardGatesPass true
 *   - Golden negative 1:  text too dim (body <7:1) → HARD FAIL
 *   - Golden negative 2:  textDim too dim (<4.5:1) → HARD FAIL
 *
 * All math is pure (no PNG I/O); tests exercise the exported functions directly.
 *
 * Measured WCAG contrast ratios for reference (from dogfood run 2026-06-21):
 *   relay:   text-on-bg=17.67:1  textDim-on-bg=7.08:1  textDim-on-surface=6.45:1
 *   granipa: text-on-bg=17.59:1  textDim-on-bg=6.42:1  textDim-on-surface=5.90:1
 */

import { describe, expect, it } from 'vitest';
import { computeContrastMetrics, contrastRatio, relativeLuminance } from './contrast-metrics.mjs';

// ---------------------------------------------------------------------------
// Relay palette — all HARD gates pass
// ---------------------------------------------------------------------------

const relayPalette = {
  bg:        '#0A0E0B',
  surface:   '#131A14',
  text:      '#F2F5F0',
  textDim:   '#8FA098',
  accent:    '#B6F22E',
  accentAlt: '#E5484D',
};

describe('computeContrastMetrics — relay palette (golden positive)', () => {
  const verdict = computeContrastMetrics(relayPalette);

  it('hardGatesPass is true', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('all 4 HARD pairs pass', () => {
    const hardFails = verdict.pairs.filter(p => p.hard && !p.pass);
    expect(hardFails).toHaveLength(0);
  });

  it('text-on-bg >=7:1', () => {
    const p = verdict.pairs.find(p => p.role === 'text-on-bg');
    expect(p.hard).toBe(true);
    expect(p.pass).toBe(true);
    expect(p.ratio).toBeGreaterThanOrEqual(7);
  });

  it('text-on-surface >=7:1', () => {
    const p = verdict.pairs.find(p => p.role === 'text-on-surface');
    expect(p.hard).toBe(true);
    expect(p.pass).toBe(true);
    expect(p.ratio).toBeGreaterThanOrEqual(7);
  });

  it('textDim-on-bg >=4.5:1', () => {
    const p = verdict.pairs.find(p => p.role === 'textDim-on-bg');
    expect(p.hard).toBe(true);
    expect(p.pass).toBe(true);
    expect(p.ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('textDim-on-surface >=4.5:1', () => {
    const p = verdict.pairs.find(p => p.role === 'textDim-on-surface');
    expect(p.hard).toBe(true);
    expect(p.pass).toBe(true);
    expect(p.ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('accent-on-bg is advisory (never hard)', () => {
    const p = verdict.pairs.find(p => p.role === 'accent-on-bg');
    expect(p.hard).toBe(false);
  });

  it('accentAlt-on-bg is advisory (never hard)', () => {
    const p = verdict.pairs.find(p => p.role === 'accentAlt-on-bg');
    expect(p.hard).toBe(false);
  });

  it('emits 6 pairs (including accentAlt)', () => {
    expect(verdict.pairs).toHaveLength(6);
  });
});

// ---------------------------------------------------------------------------
// Granipa palette — all HARD gates pass
// ---------------------------------------------------------------------------

const granipaPalette = {
  bg:        '#0A0B0E',
  surface:   '#14161D',
  text:      '#F1F2F6',
  textDim:   '#8E93A3',
  accent:    '#3D8BFF',
  accentAlt: '#F4604C',
};

describe('computeContrastMetrics — granipa palette (golden positive)', () => {
  const verdict = computeContrastMetrics(granipaPalette);

  it('hardGatesPass is true', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('all 4 HARD pairs pass', () => {
    const hardFails = verdict.pairs.filter(p => p.hard && !p.pass);
    expect(hardFails).toHaveLength(0);
  });

  it('text-on-bg >=7:1', () => {
    const p = verdict.pairs.find(p => p.role === 'text-on-bg');
    expect(p.pass).toBe(true);
    expect(p.ratio).toBeGreaterThanOrEqual(7);
  });

  it('text-on-surface >=7:1', () => {
    const p = verdict.pairs.find(p => p.role === 'text-on-surface');
    expect(p.pass).toBe(true);
    expect(p.ratio).toBeGreaterThanOrEqual(7);
  });

  it('textDim-on-bg >=4.5:1', () => {
    const p = verdict.pairs.find(p => p.role === 'textDim-on-bg');
    expect(p.pass).toBe(true);
    expect(p.ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('textDim-on-surface >=4.5:1', () => {
    const p = verdict.pairs.find(p => p.role === 'textDim-on-surface');
    expect(p.pass).toBe(true);
    expect(p.ratio).toBeGreaterThanOrEqual(4.5);
  });
});

// ---------------------------------------------------------------------------
// Golden negative 1 — body text too dim (text <7:1) → HARD FAIL
//
// text=#777777 on bg=#000000: L(#777)≈0.184, contrast=(0.184+0.05)/(0+0.05)≈4.69:1 <7:1 FAIL
// textDim=#AAAAAA on bg/surface=#000000: L(#AAA)≈0.402, ratio≈9.03:1 >4.5:1 PASS
// hardGatesPass=false (text-on-bg and text-on-surface fail)
// ---------------------------------------------------------------------------

describe('computeContrastMetrics — golden negative 1 (body text <7:1 HARD FAIL)', () => {
  const verdict = computeContrastMetrics({
    bg:      '#000000',
    surface: '#000000',
    text:    '#777777',
    textDim: '#AAAAAA',
    accent:  '#FFFFFF',
  });

  it('hardGatesPass is false', () => {
    expect(verdict.hardGatesPass).toBe(false);
  });

  it('text-on-bg fails — ratio <7:1', () => {
    const p = verdict.pairs.find(p => p.role === 'text-on-bg');
    expect(p.hard).toBe(true);
    expect(p.pass).toBe(false);
    expect(p.ratio).toBeLessThan(7);
  });

  it('text-on-surface fails — ratio <7:1', () => {
    const p = verdict.pairs.find(p => p.role === 'text-on-surface');
    expect(p.hard).toBe(true);
    expect(p.pass).toBe(false);
    expect(p.ratio).toBeLessThan(7);
  });

  it('textDim-on-bg passes — ratio >=4.5:1', () => {
    const p = verdict.pairs.find(p => p.role === 'textDim-on-bg');
    expect(p.hard).toBe(true);
    expect(p.pass).toBe(true);
    expect(p.ratio).toBeGreaterThanOrEqual(4.5);
  });
});

// ---------------------------------------------------------------------------
// Golden negative 2 — textDim too dim (<4.5:1) → HARD FAIL
//
// text=#FFFFFF on #000000: 21:1 >7:1 PASS
// textDim=#555555 on #000000: L(#555)≈0.091, ratio=(0.091+0.05)/0.05≈2.82:1 <4.5:1 FAIL
// hardGatesPass=false (textDim-on-bg and textDim-on-surface fail)
// ---------------------------------------------------------------------------

describe('computeContrastMetrics — golden negative 2 (textDim <4.5:1 HARD FAIL)', () => {
  const verdict = computeContrastMetrics({
    bg:      '#000000',
    surface: '#000000',
    text:    '#FFFFFF',
    textDim: '#555555',
    accent:  '#FFFFFF',
  });

  it('hardGatesPass is false', () => {
    expect(verdict.hardGatesPass).toBe(false);
  });

  it('text-on-bg passes — 21:1 >7:1', () => {
    const p = verdict.pairs.find(p => p.role === 'text-on-bg');
    expect(p.hard).toBe(true);
    expect(p.pass).toBe(true);
    expect(p.ratio).toBeCloseTo(21, 0);
  });

  it('textDim-on-bg fails — ratio <4.5:1', () => {
    const p = verdict.pairs.find(p => p.role === 'textDim-on-bg');
    expect(p.hard).toBe(true);
    expect(p.pass).toBe(false);
    expect(p.ratio).toBeLessThan(4.5);
  });

  it('textDim-on-surface fails — ratio <4.5:1', () => {
    const p = verdict.pairs.find(p => p.role === 'textDim-on-surface');
    expect(p.hard).toBe(true);
    expect(p.pass).toBe(false);
    expect(p.ratio).toBeLessThan(4.5);
  });
});

// ---------------------------------------------------------------------------
// Advisory fails never affect hardGatesPass
// ---------------------------------------------------------------------------

describe('computeContrastMetrics — advisory fails do not block', () => {
  it('accent <4.5:1 does not set hardGatesPass=false', () => {
    // accent=#333333 on bg=#000000: L(#333)≈0.02, ratio≈(0.02+0.05)/(0+0.05)=1.4:1 <4.5:1
    const verdict = computeContrastMetrics({
      bg:        '#000000',
      surface:   '#000000',
      text:      '#FFFFFF',
      textDim:   '#AAAAAA',
      accent:    '#333333',
      accentAlt: '#333333',
    });
    // Both hard pairs pass; accent advisory fails
    const accentPair = verdict.pairs.find(p => p.role === 'accent-on-bg');
    expect(accentPair.hard).toBe(false);
    expect(accentPair.pass).toBe(false);
    expect(verdict.hardGatesPass).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// WCAG math correctness
// ---------------------------------------------------------------------------

describe('relativeLuminance — WCAG spot-checks', () => {
  it('black (#000000) has luminance 0', () => {
    expect(relativeLuminance([0, 0, 0])).toBeCloseTo(0, 10);
  });

  it('white (#FFFFFF) has luminance 1', () => {
    expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1, 10);
  });
});

describe('contrastRatio — WCAG spot-checks', () => {
  it('white on black = 21:1', () => {
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 0);
  });

  it('is commutative (order of args does not matter)', () => {
    const r1 = contrastRatio('#F2F5F0', '#0A0E0B');
    const r2 = contrastRatio('#0A0E0B', '#F2F5F0');
    expect(r1).toBeCloseTo(r2, 10);
  });
});

// ---------------------------------------------------------------------------
// accentAlt optional — omitting it produces 5 pairs (not 6)
// ---------------------------------------------------------------------------

describe('computeContrastMetrics — accentAlt is optional', () => {
  it('omitting accentAlt produces 5 pairs', () => {
    const verdict = computeContrastMetrics({
      bg:      '#0A0E0B',
      surface: '#131A14',
      text:    '#F2F5F0',
      textDim: '#8FA098',
      accent:  '#B6F22E',
    });
    expect(verdict.pairs).toHaveLength(5);
    expect(verdict.pairs.find(p => p.role === 'accentAlt-on-bg')).toBeUndefined();
  });
});
