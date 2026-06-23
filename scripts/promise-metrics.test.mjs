/**
 * Tests for promise-metrics.mjs — hook "Promise by 2.5s" gate.
 *
 * Fixture sets:
 *   - Positive (declared + legible):    all 4 gates pass; hardGatesPass=true.
 *   - Negative (missing declaration):   promiseDeclared HARD FAIL; wordCount/promiseFrame/
 *                                       promiseRendered all SKIP; hardGatesPass=false.
 *   - Negative (over-6-words):          wordCount HARD FAIL; hardGatesPass=false.
 *   - Negative (late-frame):            promiseFrame HARD FAIL; hardGatesPass=false.
 *   - Negative (blank-render):          promiseRendered advisory FAIL only; hardGatesPass=true.
 *   - Boundary: frame=threshold passes  (frame <= round(2.5*fps) is inclusive).
 *   - Boundary: wordCount=6 passes      (≤6 is inclusive).
 *   - fps derivation: non-30 fps        (threshold = round(2.5*24)=60, not 75).
 *   - Reference videos:                 skip if promise.png not yet rendered by hook.sh.
 *
 * Frames are { width, height, channels, pixels } objects — same shape as decodePNG —
 * so we exercise the pure-computation path without PNG I/O.
 *
 * 16×16 frame with 4×4 grid (4 pixels per cell):
 *   Central band = rows 1–2 (y 4–11) — the region where text is expected.
 *   For R=G=B=v, luminance = v (coefficients sum to 1).
 */

import { describe, expect, it } from 'vitest';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluate } from './promise-metrics.mjs';
import { loadFrame } from './hook-metrics.mjs';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------------------
// Synthetic frame factory
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

// Frame with legible text in central band: rows 1–2 alternate 50/200 (stddev≈75 > threshold 10)
const textFrame = makeFrame((x, y) => {
  const row = Math.floor(y / 4);
  if (row === 1 || row === 2) return (x + y) % 2 === 0 ? 200 : 50;
  return 100;
});

// Flat frame: no variation anywhere → stddev=0 in every cell → promiseRendered FAIL
const flatFrame = makeFrame(() => 100);

// ---------------------------------------------------------------------------
// Positive fixture — all 4 gates pass
//
// promise.wordCount=4 ≤ 6               → wordCount PASS
// promise.frame=50 ≤ round(2.5×30)=75  → promiseFrame PASS
// textFrame central band has active cells → promiseRendered PASS (advisory)
// ---------------------------------------------------------------------------

const passPromise = { text: 'Queued now ready fast', frame: 50, wordCount: 4 };

describe('evaluate — positive: all gates pass (declared + legible)', () => {
  const result = evaluate({ promise: passPromise, fps: 30 }, textFrame);

  it('hardGatesPass is true', () => {
    expect(result.hardGatesPass).toBe(true);
  });

  it('summary: 4 passed, 0 failed, 0 skipped', () => {
    expect(result.summary.passed).toBe(4);
    expect(result.summary.failed).toBe(0);
    expect(result.summary.skipped).toBe(0);
  });

  it('promiseDeclared passes — text is non-empty', () => {
    const g = result.gates.find(g => g.name === 'promiseDeclared');
    expect(g.pass).toBe(true);
    expect(g.skip).toBe(false);
    expect(g.hard).toBe(true);
    expect(g.measured).toBe(passPromise.text);
  });

  it('wordCount passes — 4 ≤ 6', () => {
    const g = result.gates.find(g => g.name === 'wordCount');
    expect(g.pass).toBe(true);
    expect(g.measured).toBe(4);
  });

  it('promiseFrame passes — frame 50 ≤ threshold 75', () => {
    const g = result.gates.find(g => g.name === 'promiseFrame');
    expect(g.pass).toBe(true);
    expect(g.measured).toBe(50);
    expect(g.threshold).toBe(75);
  });

  it('promiseRendered passes (advisory) — central band has active cells', () => {
    const g = result.gates.find(g => g.name === 'promiseRendered');
    expect(g.pass).toBe(true);
    expect(g.advisory).toBe(true);
    expect(g.measured.activeCells).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Negative: missing declaration — promiseDeclared HARD FAIL, rest SKIP
// ---------------------------------------------------------------------------

describe('evaluate — negative: missing declaration (promise=null)', () => {
  const result = evaluate({ promise: null, fps: 30 });

  it('hardGatesPass is false', () => {
    expect(result.hardGatesPass).toBe(false);
  });

  it('promiseDeclared hard-fails — null promise', () => {
    const g = result.gates.find(g => g.name === 'promiseDeclared');
    expect(g.pass).toBe(false);
    expect(g.hard).toBe(true);
    expect(g.skip).toBe(false);
    expect(g.measured).toBeNull();
  });

  it('wordCount is skipped — no promise to count', () => {
    const g = result.gates.find(g => g.name === 'wordCount');
    expect(g.skip).toBe(true);
    expect(g.hard).toBe(true);
  });

  it('promiseFrame is skipped — no promise frame', () => {
    const g = result.gates.find(g => g.name === 'promiseFrame');
    expect(g.skip).toBe(true);
    expect(g.hard).toBe(true);
  });

  it('promiseRendered is skipped (advisory) — no promise', () => {
    const g = result.gates.find(g => g.name === 'promiseRendered');
    expect(g.skip).toBe(true);
    expect(g.advisory).toBe(true);
  });

  it('summary: 0 passed, 1 failed, 3 skipped', () => {
    expect(result.summary.passed).toBe(0);
    expect(result.summary.failed).toBe(1);
    expect(result.summary.skipped).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Negative: over-6-words — wordCount HARD FAIL
// ---------------------------------------------------------------------------

const longPromise = { text: 'one two three four five six seven', frame: 50, wordCount: 7 };

describe('evaluate — negative: over-6-words (wordCount=7)', () => {
  const result = evaluate({ promise: longPromise, fps: 30 });

  it('hardGatesPass is false', () => {
    expect(result.hardGatesPass).toBe(false);
  });

  it('promiseDeclared passes', () => {
    const g = result.gates.find(g => g.name === 'promiseDeclared');
    expect(g.pass).toBe(true);
  });

  it('wordCount hard-fails — 7 > 6', () => {
    const g = result.gates.find(g => g.name === 'wordCount');
    expect(g.pass).toBe(false);
    expect(g.hard).toBe(true);
    expect(g.skip).toBe(false);
    expect(g.measured).toBe(7);
    expect(g.threshold).toBe(6);
  });

  it('promiseFrame passes — frame 50 ≤ 75', () => {
    const g = result.gates.find(g => g.name === 'promiseFrame');
    expect(g.pass).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Negative: late-frame — promiseFrame HARD FAIL (fps=30 → threshold=75)
// ---------------------------------------------------------------------------

const latePromise = { text: 'Late arrival here', frame: 80, wordCount: 3 };

describe('evaluate — negative: late-frame (frame=80 > round(2.5×30)=75)', () => {
  const result = evaluate({ promise: latePromise, fps: 30 });

  it('hardGatesPass is false', () => {
    expect(result.hardGatesPass).toBe(false);
  });

  it('wordCount passes — 3 ≤ 6', () => {
    const g = result.gates.find(g => g.name === 'wordCount');
    expect(g.pass).toBe(true);
  });

  it('promiseFrame hard-fails — frame 80 > threshold 75', () => {
    const g = result.gates.find(g => g.name === 'promiseFrame');
    expect(g.pass).toBe(false);
    expect(g.hard).toBe(true);
    expect(g.measured).toBe(80);
    expect(g.threshold).toBe(75);
  });
});

// ---------------------------------------------------------------------------
// Negative: blank-render — promiseRendered advisory FAIL; hardGatesPass still true
// ---------------------------------------------------------------------------

const shortPromise = { text: 'Fast win', frame: 50, wordCount: 2 };

describe('evaluate — negative: blank-render (flat frame → no text region)', () => {
  const result = evaluate({ promise: shortPromise, fps: 30 }, flatFrame);

  it('hardGatesPass is true — advisory failure does not block', () => {
    expect(result.hardGatesPass).toBe(true);
  });

  it('promiseDeclared, wordCount, promiseFrame all pass', () => {
    expect(result.gates.find(g => g.name === 'promiseDeclared').pass).toBe(true);
    expect(result.gates.find(g => g.name === 'wordCount').pass).toBe(true);
    expect(result.gates.find(g => g.name === 'promiseFrame').pass).toBe(true);
  });

  it('promiseRendered advisory-fails — 0 active cells in flat central band', () => {
    const g = result.gates.find(g => g.name === 'promiseRendered');
    expect(g.pass).toBe(false);
    expect(g.advisory).toBe(true);
    expect(g.skip).toBe(false);
    expect(g.measured.activeCells).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Boundary: promiseFrame=threshold passes (≤ is inclusive)
// ---------------------------------------------------------------------------

describe('evaluate — boundary: frame equals threshold (frame=75, fps=30, threshold=75)', () => {
  const result = evaluate({ promise: { text: 'Exact threshold hit', frame: 75, wordCount: 3 }, fps: 30 });

  it('promiseFrame passes — 75 ≤ 75', () => {
    const g = result.gates.find(g => g.name === 'promiseFrame');
    expect(g.pass).toBe(true);
    expect(g.measured).toBe(75);
    expect(g.threshold).toBe(75);
  });

  it('hardGatesPass is true', () => {
    expect(result.hardGatesPass).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Boundary: wordCount=6 passes (≤6 is inclusive)
// ---------------------------------------------------------------------------

describe('evaluate — boundary: wordCount equals limit (wordCount=6)', () => {
  const result = evaluate({ promise: { text: 'one two three four five six', frame: 50, wordCount: 6 }, fps: 30 });

  it('wordCount passes — 6 ≤ 6', () => {
    const g = result.gates.find(g => g.name === 'wordCount');
    expect(g.pass).toBe(true);
    expect(g.measured).toBe(6);
  });

  it('hardGatesPass is true', () => {
    expect(result.hardGatesPass).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// fps derivation: non-30 fps changes the frame threshold
// ---------------------------------------------------------------------------

describe('evaluate — fps derivation: fps=24 gives threshold=60', () => {
  const result = evaluate({ promise: { text: 'Short copy', frame: 60, wordCount: 2 }, fps: 24 });

  it('promiseFrame threshold is round(2.5×24)=60', () => {
    const g = result.gates.find(g => g.name === 'promiseFrame');
    expect(g.threshold).toBe(60);
  });

  it('promiseFrame passes — 60 ≤ 60', () => {
    const g = result.gates.find(g => g.name === 'promiseFrame');
    expect(g.pass).toBe(true);
  });
});

describe('evaluate — fps derivation: fps=24, late frame fails', () => {
  const result = evaluate({ promise: { text: 'Late fps test', frame: 61, wordCount: 3 }, fps: 24 });

  it('promiseFrame hard-fails — 61 > round(2.5×24)=60', () => {
    const g = result.gates.find(g => g.name === 'promiseFrame');
    expect(g.pass).toBe(false);
    expect(g.threshold).toBe(60);
    expect(g.measured).toBe(61);
  });
});

// ---------------------------------------------------------------------------
// promiseRendered SKIP when no frame image provided
// ---------------------------------------------------------------------------

describe('evaluate — promiseRendered skipped when frameImg is null', () => {
  const result = evaluate({ promise: shortPromise, fps: 30 }, null);

  it('promiseRendered is skipped with skip reason', () => {
    const g = result.gates.find(g => g.name === 'promiseRendered');
    expect(g.skip).toBe(true);
    expect(g.advisory).toBe(true);
    expect(g.skipReason).toMatch(/not rendered/);
  });

  it('hardGatesPass is true — advisory skip does not block', () => {
    expect(result.hardGatesPass).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Reference videos — skip if promise.png not yet rendered by hook.sh
//
// relay:   fps=30, promise.frame=52, wordCount=5 → all HARD gates PASS
// granipa: fps=30, promise.frame=8,  wordCount=8 → wordCount HARD FAIL (8 > 6)
// ---------------------------------------------------------------------------

function loadPromise(compId) {
  const dir = join(projectRoot, 'out/review', compId, 'hook');
  return {
    png: loadFrame(join(dir, 'promise.png')),
  };
}

const relayRef = loadPromise('RelayLaunch');
const relayRefAvailable = relayRef.png !== null;

describe('evaluate — RelayLaunch reference (skip if not rendered)', () => {
  const relayPromise = { text: 'Queued — waiting for runner', frame: 52, wordCount: 5 };

  it.skipIf(!relayRefAvailable)('hardGatesPass is true — wordCount=5 ≤ 6, frame=52 ≤ 75', () => {
    const result = evaluate({ promise: relayPromise, fps: 30 }, relayRef.png);
    expect(result.hardGatesPass).toBe(true);
    expect(result.gates.find(g => g.name === 'wordCount').pass).toBe(true);
    expect(result.gates.find(g => g.name === 'promiseFrame').pass).toBe(true);
  });

  it.skipIf(relayRefAvailable)('hardGatesPass is true (synthetic only — no rendered frame)', () => {
    const result = evaluate({ promise: relayPromise, fps: 30 });
    expect(result.hardGatesPass).toBe(true);
  });
});

const granipaRef = loadPromise('GranipaLaunch');
const granipaRefAvailable = granipaRef.png !== null;

describe('evaluate — GranipaLaunch reference: wordCount=8 fails gate', () => {
  const granipaPromise = { text: 'what your mac tools see in a day:', frame: 8, wordCount: 8 };

  it.skipIf(!granipaRefAvailable)('hardGatesPass is false — wordCount=8 > 6', () => {
    const result = evaluate({ promise: granipaPromise, fps: 30 }, granipaRef.png);
    expect(result.hardGatesPass).toBe(false);
    expect(result.gates.find(g => g.name === 'wordCount').pass).toBe(false);
    expect(result.gates.find(g => g.name === 'wordCount').measured).toBe(8);
  });

  it.skipIf(granipaRefAvailable)('hardGatesPass is false (synthetic — wordCount=8 > 6)', () => {
    const result = evaluate({ promise: granipaPromise, fps: 30 });
    expect(result.hardGatesPass).toBe(false);
    expect(result.gates.find(g => g.name === 'wordCount').pass).toBe(false);
  });
});
