/**
 * Golden tests for computePayoffMetrics.
 *
 * Fixture scenarios:
 *
 *   empty-window-FAIL-P1   — closing window of flat/bare frames → no hold run ≥ MIN_PAYOFF_DWELL;
 *                             P1 HARD FAIL. P2 also fails (flat final frame).
 *   held-end-card-PASS     — 6 identical rich frames → hold run dwell=18f ≥ 12f;
 *                             P1 PASS, P2 PASS (rich final frame).
 *   last-frame-empty-FAIL-P2 — 5 rich frames + 1 flat final frame → P1 PASS (rich hold run
 *                             before the flat) OR P1 evaluates the full run; in either case
 *                             P2 FAILS because the final frame is flat.
 *   no-frames-SKIP         — empty frame list → all gates SKIP, hardGatesPass=true.
 *   single-frame-SKIP-P1   — one frame → P1 SKIPs (needs ≥ 2), P2 evaluates final frame.
 *   json-shape             — verify top-level output shape: hardGatesPass, gates[], summary.
 *
 * Synthetic frame types:
 *   flatFrame(w, h)   — all pixels 128; edge density ≈ 0, luminance stddev ≈ 0.
 *   richFrame(w, h)   — checkerboard (0/255); edge density ≫ 0.30, stddev ≫ 5.0.
 *
 * Arithmetic (step=3, fps=30 unless noted):
 *   MIN_PAYOFF_DWELL = 12 frames
 *   At step=3: need (runLength+1)*3 ≥ 12 → runLength ≥ 3 (≥ 4 consecutive samples)
 *   6 identical rich frames → 5 pairs → runLength=5 → dwell=(5+1)*3=18f ≥ 12f → PASS
 *   4 identical flat frames → no hold pairs (edge density < threshold) → FAIL P1
 */

import { describe, expect, it } from 'vitest';
import { computePayoffMetrics } from './payoff-metrics.mjs';

// ---------------------------------------------------------------------------
// Synthetic frame factories
// ---------------------------------------------------------------------------

/** All pixels same mid-grey value: edge density ≈ 0, luminance stddev ≈ 0. */
function flatFrame(w = 64, h = 36) {
  const pixels = Buffer.alloc(w * h * 3, 128);
  return { width: w, height: h, channels: 3, pixels };
}

/**
 * Checkerboard: alternating 0/255 pixels.
 * Edge density ≫ 0.30 (every pair has delta 255/1 at 3-channel scale).
 * Luminance stddev ≫ 5.0 (bimodal 0/255).
 */
function richFrame(w = 64, h = 36) {
  const pixels = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = ((x + y) % 2 === 0) ? 255 : 0;
      const i = (y * w + x) * 3;
      pixels[i] = pixels[i + 1] = pixels[i + 2] = v;
    }
  }
  return { width: w, height: h, channels: 3, pixels };
}

// ---------------------------------------------------------------------------
// Fixture 1: empty-window-FAIL-P1
// 4 flat frames → edge density ≈ 0 < EDGE_DENSITY_THRESHOLD → no hold pairs
// → maxDwell = 0 < 12 → P1 FAIL
// Final frame is flat → edge density < threshold → P2 FAIL
// hardGatesPass = false
// ---------------------------------------------------------------------------

describe('computePayoffMetrics — empty window (bare frames FAIL P1 and P2)', () => {
  const frames  = [flatFrame(), flatFrame(), flatFrame(), flatFrame()];
  const verdict = computePayoffMetrics(frames, { step: 3, fps: 30 });

  it('hardGatesPass is false', () => {
    expect(verdict.hardGatesPass).toBe(false);
  });

  it('P1 is a HARD FAIL — no hold run meets MIN_PAYOFF_DWELL', () => {
    const p1 = verdict.gates.find(g => g.id === 1);
    expect(p1.hard).toBe(true);
    expect(p1.skip).toBe(false);
    expect(p1.pass).toBe(false);
    expect(p1.measured.holdRuns).toBe(0);
    expect(p1.measured.maxDwellFrames).toBe(0);
  });

  it('P2 is a HARD FAIL — flat final frame below edge/contrast floors', () => {
    const p2 = verdict.gates.find(g => g.id === 2);
    expect(p2.hard).toBe(true);
    expect(p2.skip).toBe(false);
    expect(p2.pass).toBe(false);
    expect(p2.measured.edgeDensity).toBeLessThanOrEqual(0.30);
  });

  it('summary has ≥ 2 hard gate failures', () => {
    const hardFails = verdict.gates.filter(g => g.hard && !g.skip && !g.pass);
    expect(hardFails.length).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// Fixture 2: held-end-card-PASS
// 6 identical rich frames → 5 hold pairs (same pixels = delta 0, edge density ≫ 0.30)
// runLength=5 → dwell=(5+1)*3=18f ≥ 12f → P1 PASS
// Final frame is rich → edge density ≫ 0.30, stddev ≫ 5.0 → P2 PASS
// P3 PASS — last 3 samples (2 pairs) have delta 0 < 0.50
// hardGatesPass = true
// ---------------------------------------------------------------------------

describe('computePayoffMetrics — held end-card (rich frames PASS P1 and P2)', () => {
  const rich    = richFrame();
  const frames  = [rich, rich, rich, rich, rich, rich];  // 6 identical → delta=0
  const verdict = computePayoffMetrics(frames, { step: 3, fps: 30 });

  it('hardGatesPass is true', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('P1 PASS — hold run dwell ≥ 12f', () => {
    const p1 = verdict.gates.find(g => g.id === 1);
    expect(p1.pass).toBe(true);
    expect(p1.skip).toBe(false);
    expect(p1.measured.holdRuns).toBeGreaterThanOrEqual(1);
    expect(p1.measured.maxDwellFrames).toBeGreaterThanOrEqual(12);
  });

  it('P2 PASS — final frame has high edge density and contrast', () => {
    const p2 = verdict.gates.find(g => g.id === 2);
    expect(p2.pass).toBe(true);
    expect(p2.skip).toBe(false);
    expect(p2.measured.edgeDensity).toBeGreaterThan(0.30);
    expect(p2.measured.contrast).toBeGreaterThan(5.0);
  });

  it('P3 PASS (advisory) — end samples are stable', () => {
    const p3 = verdict.gates.find(g => g.id === 3);
    expect(p3.advisory).toBe(true);
    expect(p3.skip).toBe(false);
    expect(p3.pass).toBe(true);
  });

  it('summary: all 3 passed', () => {
    expect(verdict.summary.passed).toBe(3);
    expect(verdict.summary.failed).toBe(0);
    expect(verdict.summary.skipped).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Fixture 3: last-frame-empty-FAIL-P2
// 5 rich frames → P1 PASS (5-frame hold run in first 5 samples)
// Final (6th) frame is flat → P2 FAIL (last frame below edge + contrast floors)
// hardGatesPass = false
//
// Note: the last sample (index 5, flat) does not contribute to a hold pair because
// its edge density < EDGE_DENSITY_THRESHOLD, so P1 still sees the 5-sample rich run
// across samples 0-4 (4 pairs, dwell=(4+1)*3=15f ≥ 12f → P1 PASS).
// ---------------------------------------------------------------------------

describe('computePayoffMetrics — last frame empty (FAIL P2)', () => {
  const rich    = richFrame();
  const frames  = [rich, rich, rich, rich, rich, flatFrame()];
  const verdict = computePayoffMetrics(frames, { step: 3, fps: 30 });

  it('hardGatesPass is false', () => {
    expect(verdict.hardGatesPass).toBe(false);
  });

  it('P1 PASS — rich hold run in samples 0-4', () => {
    const p1 = verdict.gates.find(g => g.id === 1);
    expect(p1.pass).toBe(true);
    expect(p1.skip).toBe(false);
    expect(p1.measured.maxDwellFrames).toBeGreaterThanOrEqual(12);
  });

  it('P2 FAIL — flat final frame below edge and contrast thresholds', () => {
    const p2 = verdict.gates.find(g => g.id === 2);
    expect(p2.hard).toBe(true);
    expect(p2.skip).toBe(false);
    expect(p2.pass).toBe(false);
    expect(p2.measured.edgeDensity).toBeLessThanOrEqual(0.30);
  });

  it('P1 is not the blocker — only P2 fails (1 hard fail)', () => {
    const hardFails = verdict.gates.filter(g => g.hard && !g.skip && !g.pass);
    expect(hardFails).toHaveLength(1);
    expect(hardFails[0].id).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Fixture 4: no-frames-SKIP
// Empty frame list → all gates SKIP, hardGatesPass=true.
// ---------------------------------------------------------------------------

describe('computePayoffMetrics — no frames (all gates SKIP)', () => {
  const verdict = computePayoffMetrics([], { step: 3, fps: 30 });

  it('hardGatesPass is true — skipped gates do not block', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('all 3 gates are SKIP', () => {
    for (const g of verdict.gates) {
      expect(g.skip).toBe(true);
    }
  });

  it('summary: 0 passed, 0 failed, 3 skipped', () => {
    expect(verdict.summary.passed).toBe(0);
    expect(verdict.summary.failed).toBe(0);
    expect(verdict.summary.skipped).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Fixture 5: single-frame — P1 SKIPS (needs ≥ 2 frames), P2 evaluates last frame.
// Single rich frame → P1 SKIP, P2 PASS, P3 SKIP (< 3 samples).
// ---------------------------------------------------------------------------

describe('computePayoffMetrics — single rich frame (P1 SKIP, P2 PASS, P3 SKIP)', () => {
  const verdict = computePayoffMetrics([richFrame()], { step: 3, fps: 30 });

  it('hardGatesPass is true — P1 skip counts as pass, P2 passes', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('P1 SKIPs — fewer than 2 frames', () => {
    const p1 = verdict.gates.find(g => g.id === 1);
    expect(p1.skip).toBe(true);
    expect(p1.hard).toBe(true);
  });

  it('P2 PASS — single rich final frame clears both thresholds', () => {
    const p2 = verdict.gates.find(g => g.id === 2);
    expect(p2.skip).toBe(false);
    expect(p2.pass).toBe(true);
    expect(p2.measured.edgeDensity).toBeGreaterThan(0.30);
    expect(p2.measured.contrast).toBeGreaterThan(5.0);
  });

  it('P3 SKIPs — fewer than 3 samples', () => {
    const p3 = verdict.gates.find(g => g.id === 3);
    expect(p3.skip).toBe(true);
    expect(p3.advisory).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Fixture 6: JSON shape contract
// Verify the output object has the required top-level fields and gate structure,
// shape-compatible with ship-metrics.mjs expectations.
// ---------------------------------------------------------------------------

describe('computePayoffMetrics — JSON shape contract', () => {
  const rich    = richFrame();
  const verdict = computePayoffMetrics([rich, rich, rich, rich], { step: 3, fps: 30 });

  it('top-level: hardGatesPass (boolean), gates (array), summary (object)', () => {
    expect(typeof verdict.hardGatesPass).toBe('boolean');
    expect(Array.isArray(verdict.gates)).toBe(true);
    expect(typeof verdict.summary).toBe('object');
  });

  it('gates array has exactly 3 entries', () => {
    expect(verdict.gates).toHaveLength(3);
  });

  it('each gate has: id, name, hard, advisory, pass, skip', () => {
    for (const g of verdict.gates) {
      expect(typeof g.id).toBe('number');
      expect(typeof g.name).toBe('string');
      expect(typeof g.hard).toBe('boolean');
      expect(typeof g.advisory).toBe('boolean');
      expect(typeof g.pass).toBe('boolean');
      expect(typeof g.skip).toBe('boolean');
    }
  });

  it('gate 1 is hard, gates 2 is hard, gate 3 is advisory', () => {
    expect(verdict.gates[0].hard).toBe(true);
    expect(verdict.gates[0].advisory).toBe(false);
    expect(verdict.gates[1].hard).toBe(true);
    expect(verdict.gates[1].advisory).toBe(false);
    expect(verdict.gates[2].hard).toBe(false);
    expect(verdict.gates[2].advisory).toBe(true);
  });

  it('summary has: passed, failed, skipped, samples, step, holdRuns', () => {
    expect(typeof verdict.summary.passed).toBe('number');
    expect(typeof verdict.summary.failed).toBe('number');
    expect(typeof verdict.summary.skipped).toBe('number');
    expect(typeof verdict.summary.samples).toBe('number');
    expect(typeof verdict.summary.step).toBe('number');
    expect(typeof verdict.summary.holdRuns).toBe('number');
  });
});
