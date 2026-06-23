/**
 * Tests for payoff-closure-metrics.mjs — promise→payoff closure gate.
 *
 * Fixture sets:
 *   - Positive (promise+payoff, payoff in closing region): C1+C2 pass; hardGatesPass=true.
 *   - No promise → all 3 gates SKIP; hardGatesPass=true.
 *   - Promise declared, payoff missing → C1 HARD FAIL, C2+C3 SKIP; hardGatesPass=false.
 *   - Payoff before promise → C2 HARD FAIL (not after promise); hardGatesPass=false.
 *   - Payoff mid-video → C2 HARD FAIL (not in closing region); hardGatesPass=false.
 *   - No climax, closing region by 75% threshold: payoff exactly at floor(total*0.75) → PASS.
 *   - Boundary: payoffFrame === closingStart passes (>= is inclusive).
 *   - C3 payoffRendered: text frame → active cells PASS (advisory).
 *   - C3 payoffRendered: flat frame → advisory FAIL; hardGatesPass still true.
 *   - C3 payoffRendered: null frame → SKIP (advisory).
 */

import { describe, expect, it } from 'vitest';
import { evaluate } from './payoff-closure-metrics.mjs';

// ---------------------------------------------------------------------------
// Synthetic frame factory (mirrors promise-metrics.test.mjs)
// ---------------------------------------------------------------------------

const W = 16;
const H = 16;

function makeFrame(fillFn) {
  const pixels = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const v = fillFn(x, y);
      const base = (y * W + x) * 3;
      pixels[base] = v;
      pixels[base + 1] = v;
      pixels[base + 2] = v;
    }
  }
  return { width: W, height: H, channels: 3, pixels };
}

// Central band (rows 1–2 of 4×4 grid) alternating 50/200 → stddev ≈ 75 > threshold 10
const textFrame = makeFrame((x, y) => {
  const row = Math.floor(y / 4);
  if (row === 1 || row === 2) return (x + y) % 2 === 0 ? 200 : 50;
  return 100;
});

// Flat frame: stddev = 0 everywhere → payoffRendered FAIL
const flatFrame = makeFrame(() => 100);

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const promise = { text: 'Deploy in 3 seconds', frame: 52, wordCount: 4 };
const payoff  = { text: '14,203 deploys today', frame: 840 };
const CLIMAX  = 720;
const TOTAL   = 960;

// ---------------------------------------------------------------------------
// Positive: promise+payoff, payoff after promise and in closing region
//
// payoff.frame=840 > promise.frame=52 ✓
// closingStart=climaxFrame=720, 840 >= 720 ✓
// hardGatesPass = true
// ---------------------------------------------------------------------------

describe('evaluate — positive: promise+payoff, payoff in closing region', () => {
  const result = evaluate({ promise, payoff, climaxFrame: CLIMAX, totalDurationInFrames: TOTAL });

  it('hardGatesPass is true', () => {
    expect(result.hardGatesPass).toBe(true);
  });

  it('summary: 2 passed (C1+C2), 0 failed, 1 skipped (C3 — no frame)', () => {
    expect(result.summary.passed).toBe(2);
    expect(result.summary.failed).toBe(0);
    expect(result.summary.skipped).toBe(1);
  });

  it('payoffDeclared passes — payoff is non-null', () => {
    const g = result.gates.find(g => g.name === 'payoffDeclared');
    expect(g.pass).toBe(true);
    expect(g.skip).toBe(false);
    expect(g.hard).toBe(true);
    expect(g.measured).toBe(payoff.text);
  });

  it('payoffLandsLate passes — 840 > 52 AND 840 >= 720', () => {
    const g = result.gates.find(g => g.name === 'payoffLandsLate');
    expect(g.pass).toBe(true);
    expect(g.skip).toBe(false);
    expect(g.hard).toBe(true);
    expect(g.measured.payoffFrame).toBe(840);
    expect(g.measured.promiseFrame).toBe(52);
    expect(g.measured.closingStart).toBe(720);
  });

  it('payoffRendered is skipped (advisory) — no frame image provided', () => {
    const g = result.gates.find(g => g.name === 'payoffRendered');
    expect(g.skip).toBe(true);
    expect(g.advisory).toBe(true);
    expect(g.skipReason).toMatch(/not rendered/);
  });
});

// ---------------------------------------------------------------------------
// No promise → entire gate skips; hardGatesPass=true
// ---------------------------------------------------------------------------

describe('evaluate — no promise: entire closure gate skips', () => {
  const result = evaluate({ promise: null, payoff: null, climaxFrame: null, totalDurationInFrames: TOTAL });

  it('hardGatesPass is true', () => {
    expect(result.hardGatesPass).toBe(true);
  });

  it('summary: 0 passed, 0 failed, 3 skipped', () => {
    expect(result.summary.passed).toBe(0);
    expect(result.summary.failed).toBe(0);
    expect(result.summary.skipped).toBe(3);
  });

  it('all 3 gates skip with "no promise declared" reason', () => {
    for (const gate of result.gates) {
      expect(gate.skip).toBe(true);
      expect(gate.skipReason).toMatch(/no promise declared/);
    }
  });

  it('payoffDeclared is HARD gate that skips', () => {
    const g = result.gates.find(g => g.name === 'payoffDeclared');
    expect(g.hard).toBe(true);
    expect(g.skip).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Promise declared, payoff missing → C1 HARD FAIL, C2+C3 SKIP
// ---------------------------------------------------------------------------

describe('evaluate — promise declared, payoff missing → C1 HARD FAIL', () => {
  const result = evaluate({ promise, payoff: null, climaxFrame: CLIMAX, totalDurationInFrames: TOTAL });

  it('hardGatesPass is false', () => {
    expect(result.hardGatesPass).toBe(false);
  });

  it('summary: 0 passed, 1 failed, 2 skipped', () => {
    expect(result.summary.passed).toBe(0);
    expect(result.summary.failed).toBe(1);
    expect(result.summary.skipped).toBe(2);
  });

  it('payoffDeclared hard-fails — payoff is null', () => {
    const g = result.gates.find(g => g.name === 'payoffDeclared');
    expect(g.pass).toBe(false);
    expect(g.hard).toBe(true);
    expect(g.skip).toBe(false);
    expect(g.measured).toBeNull();
  });

  it('payoffLandsLate skips — no payoff to check position for', () => {
    const g = result.gates.find(g => g.name === 'payoffLandsLate');
    expect(g.skip).toBe(true);
    expect(g.hard).toBe(true);
    expect(g.skipReason).toMatch(/no payoff/);
  });

  it('payoffRendered skips (advisory) — no payoff declared', () => {
    const g = result.gates.find(g => g.name === 'payoffRendered');
    expect(g.skip).toBe(true);
    expect(g.advisory).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Payoff before promise → C2 HARD FAIL (not after promise)
// ---------------------------------------------------------------------------

const earlyPayoff = { text: 'Early resolution', frame: 30 }; // 30 < promise.frame=52

describe('evaluate — payoff before promise (frame=30 < promise.frame=52) → C2 FAIL', () => {
  const result = evaluate({ promise, payoff: earlyPayoff, climaxFrame: CLIMAX, totalDurationInFrames: TOTAL });

  it('hardGatesPass is false', () => {
    expect(result.hardGatesPass).toBe(false);
  });

  it('payoffDeclared passes — payoff exists', () => {
    const g = result.gates.find(g => g.name === 'payoffDeclared');
    expect(g.pass).toBe(true);
  });

  it('payoffLandsLate hard-fails — 30 is not > 52', () => {
    const g = result.gates.find(g => g.name === 'payoffLandsLate');
    expect(g.pass).toBe(false);
    expect(g.hard).toBe(true);
    expect(g.skip).toBe(false);
    expect(g.measured.payoffFrame).toBe(30);
    expect(g.measured.promiseFrame).toBe(52);
  });
});

// ---------------------------------------------------------------------------
// Payoff after promise but not in closing region → C2 HARD FAIL
//
// payoff.frame=500 > promise.frame=52 ✓ BUT 500 < climaxFrame=720 ✗
// ---------------------------------------------------------------------------

const midVideoPayoff = { text: 'Mid resolution', frame: 500 };

describe('evaluate — payoff after promise but mid-video (frame=500 < climaxFrame=720) → C2 FAIL', () => {
  const result = evaluate({ promise, payoff: midVideoPayoff, climaxFrame: CLIMAX, totalDurationInFrames: TOTAL });

  it('hardGatesPass is false', () => {
    expect(result.hardGatesPass).toBe(false);
  });

  it('payoffLandsLate hard-fails — 500 < closingStart=720', () => {
    const g = result.gates.find(g => g.name === 'payoffLandsLate');
    expect(g.pass).toBe(false);
    expect(g.hard).toBe(true);
    expect(g.measured.payoffFrame).toBe(500);
    expect(g.measured.closingStart).toBe(720);
  });
});

// ---------------------------------------------------------------------------
// No climax: closing region = floor(totalDurationInFrames * 0.75) = 720
//
// payoff.frame=750 > promise.frame=52 ✓ AND 750 >= 720 ✓ → PASS
// ---------------------------------------------------------------------------

describe('evaluate — no climax: closing region by 75% threshold (total=960, closingStart=720)', () => {
  const noClimaxPayoff = { text: 'Resolution', frame: 750 };
  const result = evaluate({ promise, payoff: noClimaxPayoff, climaxFrame: null, totalDurationInFrames: 960 });

  it('hardGatesPass is true', () => {
    expect(result.hardGatesPass).toBe(true);
  });

  it('payoffLandsLate passes — 750 >= floor(960*0.75)=720', () => {
    const g = result.gates.find(g => g.name === 'payoffLandsLate');
    expect(g.pass).toBe(true);
    expect(g.measured.closingStart).toBe(720);
  });
});

// ---------------------------------------------------------------------------
// No climax: payoff before 75% threshold → C2 FAIL
// ---------------------------------------------------------------------------

describe('evaluate — no climax: payoff at frame=600 < floor(960*0.75)=720 → C2 FAIL', () => {
  const tooEarlyPayoff = { text: 'Too early', frame: 600 };
  const result = evaluate({ promise, payoff: tooEarlyPayoff, climaxFrame: null, totalDurationInFrames: 960 });

  it('hardGatesPass is false', () => {
    expect(result.hardGatesPass).toBe(false);
  });

  it('payoffLandsLate fails — 600 < closingStart=720', () => {
    const g = result.gates.find(g => g.name === 'payoffLandsLate');
    expect(g.pass).toBe(false);
    expect(g.measured.closingStart).toBe(720);
    expect(g.measured.payoffFrame).toBe(600);
  });
});

// ---------------------------------------------------------------------------
// Boundary: payoffFrame === closingStart passes (>= is inclusive)
// ---------------------------------------------------------------------------

describe('evaluate — boundary: payoff lands exactly at closingStart (frame=720, climaxFrame=720)', () => {
  const exactPayoff = { text: 'Exact', frame: 720 };
  const result = evaluate({ promise, payoff: exactPayoff, climaxFrame: 720, totalDurationInFrames: TOTAL });

  it('payoffLandsLate passes — 720 >= 720 (inclusive)', () => {
    const g = result.gates.find(g => g.name === 'payoffLandsLate');
    expect(g.pass).toBe(true);
  });

  it('hardGatesPass is true', () => {
    expect(result.hardGatesPass).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// C3: payoffRendered with text frame → PASS (advisory)
// ---------------------------------------------------------------------------

describe('evaluate — C3 payoffRendered: text frame → active cells PASS', () => {
  const result = evaluate(
    { promise, payoff, climaxFrame: CLIMAX, totalDurationInFrames: TOTAL },
    textFrame,
  );

  it('hardGatesPass is true', () => {
    expect(result.hardGatesPass).toBe(true);
  });

  it('payoffRendered passes (advisory) — central band has active cells', () => {
    const g = result.gates.find(g => g.name === 'payoffRendered');
    expect(g.pass).toBe(true);
    expect(g.advisory).toBe(true);
    expect(g.skip).toBe(false);
    expect(g.measured.activeCells).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// C3: payoffRendered with flat frame → advisory FAIL; hardGatesPass still true
// ---------------------------------------------------------------------------

describe('evaluate — C3 payoffRendered: flat frame → advisory FAIL (hardGatesPass unaffected)', () => {
  const result = evaluate(
    { promise, payoff, climaxFrame: CLIMAX, totalDurationInFrames: TOTAL },
    flatFrame,
  );

  it('hardGatesPass is true — advisory failure does not block', () => {
    expect(result.hardGatesPass).toBe(true);
  });

  it('payoffRendered advisory-fails — 0 active cells in flat central band', () => {
    const g = result.gates.find(g => g.name === 'payoffRendered');
    expect(g.pass).toBe(false);
    expect(g.advisory).toBe(true);
    expect(g.skip).toBe(false);
    expect(g.measured.activeCells).toBe(0);
  });

  it('C1 and C2 still pass', () => {
    expect(result.gates.find(g => g.name === 'payoffDeclared').pass).toBe(true);
    expect(result.gates.find(g => g.name === 'payoffLandsLate').pass).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Payoff text = null (text-optional, structural closure still works)
// ---------------------------------------------------------------------------

describe('evaluate — payoff with text=null (structural closure only)', () => {
  const noTextPayoff = { text: null, frame: 840 };
  const result = evaluate({ promise, payoff: noTextPayoff, climaxFrame: CLIMAX, totalDurationInFrames: TOTAL });

  it('hardGatesPass is true', () => {
    expect(result.hardGatesPass).toBe(true);
  });

  it('payoffDeclared passes — payoff is non-null even with no text', () => {
    const g = result.gates.find(g => g.name === 'payoffDeclared');
    expect(g.pass).toBe(true);
    expect(g.measured).toBeNull();
  });
});
