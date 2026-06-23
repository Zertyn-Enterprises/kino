/**
 * Regression tests for computeHookMetrics.
 *
 * Fixture sets:
 *   - Golden positive:   16×16 synthetic frame engineered to PASS all 5 gates.
 *   - Golden negative:   16×16 synthetic frame engineered to FAIL gates 1 and 4;
 *                        gate 5 now PASSES via concentrated-focal path (row-1 cells stddev=75).
 *                        (gates 2 and 3 pass; hardGatesPass=false via gate-1 FAIL).
 *   - Focal-liveness PASS: concentrated single-row/single-region fixtures that
 *                        pass via the focal path (gates 4 and 5 independently).
 *   - Regression guards: anti-static-card (flat frame → gate 5 FAIL) and
 *                        anti-frozen-bg (weak single region → gate 4 FAIL).
 *   - Reference videos:  loadFrame from out/review/<CompId>/hook/; tests are
 *                        skipped if those files are not present — run
 *                        `scripts/hook.sh <CompId>` to populate them.
 *
 * Frames are { width, height, channels, pixels } objects — the same shape
 * decodePNG returns — so we exercise the pure-computation path without PNG I/O.
 *
 * 16×16 grid: 4×4 cells of floor(16/4)=4 × floor(16/4)=4 pixels each.
 * For R=G=B=v, luminance = 0.299v + 0.587v + 0.114v = v (coefficients sum to 1).
 */

import { describe, expect, it } from "vitest";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { computeHookMetrics, loadFrame } from "./hook-metrics.mjs";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

// ---------------------------------------------------------------------------
// Synthetic frame factory
// ---------------------------------------------------------------------------

const W = 16;
const H = 16;

/** Build a 16×16 RGB frame where every channel equals fillFn(x, y). */
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

// ---------------------------------------------------------------------------
// Golden positive fixture — all 5 gates pass
//
// 4×4 grid layout (each cell = 4×4 pixels):
//   Row 0 (y 0-3):   all cells flat 200   — gate4 baseline for corner (0,0)
//   Row 1, cols 0-1: alternating 50/200   — stddev=75 → gate5 content (row=1)
//   Row 1, cols 2-3: flat 100
//   Row 2, cols 0-1: flat 100
//   Row 2, cols 2-3: alternating 50/200   — stddev=75 → gate5 content (row=2)
//   Row 3 (y 12-15): all cells flat 50    — gate4 baseline for corner (3,3)
//
// Gate 1 (motion >0.1):   early=all-255; mean|frame0−255| ≈ 136 >> 0.1       PASS
// Gate 2 (contrast >5):   frame0 stddev ≈ 66                                  PASS
// Gate 3 (seam <60):      final=frame0; delta=0                                PASS
// Gate 4 (≥2 sep. cells): mid changes (0,0)→170 and (3,3)→80; delta=30>5,
//                         Chebyshev distance=3 ≥ 2 → separated                PASS
// Gate 5 (≥2 rows, ≥2):  content cells (1,0),(1,1),(2,2),(2,3); rows={1,2}   PASS
// ---------------------------------------------------------------------------

function posPixel(x, y) {
  const row = Math.floor(y / 4);
  const col = Math.floor(x / 4);
  if (row === 0) return 200;
  if (row === 3) return 50;
  if (row === 1 && col <= 1) return (x + y) % 2 === 0 ? 200 : 50;
  if (row === 2 && col >= 2) return (x + y) % 2 === 0 ? 200 : 50;
  return 100;
}

const posFrame0 = makeFrame(posPixel);
const posEarly = makeFrame(() => 255);
const posMid = makeFrame((x, y) => {
  const row = Math.floor(y / 4);
  const col = Math.floor(x / 4);
  if (row === 0 && col === 0) return 170; // was 200, delta=30 > threshold of 5 → active
  if (row === 3 && col === 3) return 80; // was 50,  delta=30 > threshold of 5 → active
  return posPixel(x, y);
});
const posFinal = makeFrame(posPixel); // identical to frame0 → seam delta=0

// ---------------------------------------------------------------------------
// Golden negative fixture — gate 1 hard-FAIL; gate 4 advisory-FAIL
//
// Layout:
//   Row 0: flat 100
//   Row 1: alternating 50/200 across all 4 columns → stddev=75 in every cell
//   Row 2: flat 100
//   Row 3: flat 100
//
// Gate 1 (motion >0.1):  early=frame0; delta=0                              FAIL (hard)
// Gate 2 (contrast >5):  overall stddev ≈ 39 > 5                            PASS (hard)
// Gate 3 (seam <60):     final=frame0; delta=0 < 60                         PASS (hard)
// Gate 4 (advisory):     mid=frame0; all cell deltas=0; active=0            FAIL
// Gate 5 (advisory):     4 content cells in row 1; maxStddev=75 > 20.0      PASS (focal path)
// hardGatesPass = false (gate 1 fails)
// ---------------------------------------------------------------------------

function negPixel(x, y) {
  const row = Math.floor(y / 4);
  if (row === 1) return (x + y) % 2 === 0 ? 200 : 50;
  return 100;
}

const negFrame0 = makeFrame(negPixel);
const negEarly = makeFrame(negPixel); // identical → gate1 delta=0 FAIL
const negMid = makeFrame(negPixel); // identical → gate4 no active cells FAIL
const negFinal = makeFrame(negPixel); // identical → gate3 delta=0 PASS

// ---------------------------------------------------------------------------
// Concentrated-focal-liveness PASS fixtures
//
// Gate 5 focal PASS — title-card-band: reuse negFrame0 (row-1 band, 4 cells, stddev=75 > 20)
//   Models GranipaLaunch: wide text band, cells=3–4, maxStddev=49.3 > FOCAL_STRENGTH_THRESHOLD=20
// Gate 5 focal PASS — terminal-in-one-row: cols 0–1 of row 1 alternating (stddev=75), rest flat.
//   Models RelayLaunch: narrow focal region, cells=2, rows=1, maxStddev=75 > FOCAL_STRENGTH_THRESHOLD=20
//   contentCells.length=2 ≥ LIVENESS_MIN_CELLS=2; passA: rows=1 < 2 → false; passB: 75 > 20 → PASS
// Gate 4 focal PASS: flat frame0 + mid with single strong-motion cell (delta=15 > FOCAL_MOTION_THRESHOLD=10)
//   activeCell (1,1): all 16 pixels shift from 100 → 115 → meanDelta=15
//   passA: active=1, separated=false → false; passB: maxDelta=15>10 → true → PASS
// ---------------------------------------------------------------------------

const terminalFrame0 = makeFrame((x, y) => {
  const row = Math.floor(y / 4);
  const col = Math.floor(x / 4);
  if (row === 1 && col <= 1) return (x + y) % 2 === 0 ? 200 : 50; // cells (1,0),(1,1) stddev=75
  return 100;
});

const focalMotionFrame0 = makeFrame(() => 100);
const focalMotionMid = makeFrame((x, y) => {
  const row = Math.floor(y / 4);
  const col = Math.floor(x / 4);
  return row === 1 && col === 1 ? 115 : 100; // delta=15 in cell (1,1)
});

// ---------------------------------------------------------------------------
// Regression guard fixtures (anti-static-card / anti-frozen-bg)
//
// Gate 5 FAIL (anti-static-card): flat uniform frame → 0 content cells → both paths fail
// Gate 4 FAIL (anti-frozen-bg):   single weak-motion cell (delta=7); 7 > GRID_MOTION_THRESHOLD=5
//   but 7 < FOCAL_MOTION_THRESHOLD=10; passA: active=1,separated=false → false;
//   passB: maxDelta=7 < 10 → false → FAIL
// ---------------------------------------------------------------------------

const flatFrame = makeFrame(() => 100);
const weakRegionMid = makeFrame((x, y) => {
  const row = Math.floor(y / 4);
  const col = Math.floor(x / 4);
  return row === 1 && col === 1 ? 107 : 100; // delta=7 in cell (1,1)
});

// ---------------------------------------------------------------------------
// Reference video frames — loaded now; null when not yet rendered
// ---------------------------------------------------------------------------

function hookFrames(compId) {
  const dir = join(projectRoot, "out/review", compId, "hook");
  return {
    frame0: loadFrame(join(dir, "frame0.png")),
    early: loadFrame(join(dir, "early.png")),
    mid: loadFrame(join(dir, "mid.png")),
    final: loadFrame(join(dir, "final.png")),
  };
}

const relay = hookFrames("RelayLaunch");
const relayAvailable = Object.values(relay).every((f) => f !== null);

const granipa = hookFrames("GranipaLaunch");
const granipaAvailable = Object.values(granipa).every((f) => f !== null);

const ambientCheck = hookFrames("AmbientCheck");
const ambientCheckAvailable = Object.values(ambientCheck).every(
  (f) => f !== null,
);

// ---------------------------------------------------------------------------
// Tests: golden positive
// ---------------------------------------------------------------------------

describe("computeHookMetrics — golden positive control (all 5 gates pass)", () => {
  const verdict = computeHookMetrics({
    frame0: posFrame0,
    early: posEarly,
    mid: posMid,
    final: posFinal,
  });

  it("hardGatesPass is true", () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it("summary: 5 passed, 0 failed, 0 skipped", () => {
    expect(verdict.summary.passed).toBe(5);
    expect(verdict.summary.failed).toBe(0);
    expect(verdict.summary.skipped).toBe(0);
  });

  it("gate 1 (motion >0.1) passes with measurable delta", () => {
    const g = verdict.gates.find((g) => g.id === 1);
    expect(g.pass).toBe(true);
    expect(g.skip).toBe(false);
    expect(g.hard).toBe(true);
    expect(g.measured).toBeGreaterThan(0.1);
  });

  it("gate 2 (contrast >5) passes", () => {
    const g = verdict.gates.find((g) => g.id === 2);
    expect(g.pass).toBe(true);
    expect(g.measured).toBeGreaterThan(5);
  });

  it("gate 3 (seam <60) passes with delta=0 (final=frame0)", () => {
    const g = verdict.gates.find((g) => g.id === 3);
    expect(g.pass).toBe(true);
    expect(g.measured).toBeLessThan(60);
  });

  it("gate 4 (background activity, advisory) passes with ≥2 spatially-separated active cells", () => {
    const g = verdict.gates.find((g) => g.id === 4);
    expect(g.pass).toBe(true);
    expect(g.advisory).toBe(true);
    expect(g.measured.active).toBeGreaterThanOrEqual(2);
    expect(g.measured.separated).toBe(true);
  });

  it("gate 5 (frame-0 liveness, advisory) passes with content in ≥2 grid rows", () => {
    const g = verdict.gates.find((g) => g.id === 5);
    expect(g.pass).toBe(true);
    expect(g.advisory).toBe(true);
    expect(g.measured.rows).toBeGreaterThanOrEqual(2);
    expect(g.measured.cells).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// Tests: golden negative
// ---------------------------------------------------------------------------

describe("computeHookMetrics — golden negative control (gate 1 hard-FAIL, gate 4 advisory-FAIL)", () => {
  const verdict = computeHookMetrics({
    frame0: negFrame0,
    early: negEarly,
    mid: negMid,
    final: negFinal,
  });

  it("hardGatesPass is false (gate 1 hard FAIL)", () => {
    expect(verdict.hardGatesPass).toBe(false);
  });

  it("gate 1 (motion) fails — early identical to frame0", () => {
    const g = verdict.gates.find((g) => g.id === 1);
    expect(g.pass).toBe(false);
    expect(g.hard).toBe(true);
    expect(g.measured).toBeLessThanOrEqual(0.1);
  });

  it("gate 2 (contrast) passes — alternating row gives stddev >5", () => {
    const g = verdict.gates.find((g) => g.id === 2);
    expect(g.pass).toBe(true);
    expect(g.measured).toBeGreaterThan(5);
  });

  it("gate 3 (seam) passes — final identical to frame0, delta=0 <60", () => {
    const g = verdict.gates.find((g) => g.id === 3);
    expect(g.pass).toBe(true);
    expect(g.measured).toBeLessThan(60);
  });

  it("gate 4 (advisory) fails — mid identical to frame0, no active cells", () => {
    const g = verdict.gates.find((g) => g.id === 4);
    expect(g.pass).toBe(false);
    expect(g.advisory).toBe(true);
    expect(g.measured.active).toBe(0);
  });

  it("gate 5 (advisory) passes via focal path — row-1 cells stddev=75 > FOCAL_STRENGTH_THRESHOLD=20", () => {
    const g = verdict.gates.find((g) => g.id === 5);
    expect(g.pass).toBe(true);
    expect(g.advisory).toBe(true);
    expect(g.measured.rows).toBe(1);
    expect(g.measured.cells).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// Tests: concentrated focal liveness — gate 5 (single-row, high-stddev)
// ---------------------------------------------------------------------------

describe("computeHookMetrics — gate 5 concentrated-focal PASS (title-card-band pattern)", () => {
  // negFrame0: full row-1 band with stddev=75 in all 4 cells; models GranipaLaunch text band.
  // contentCells=4, rows=1; passA: rows=1 < 2 → false; passB: maxStddev=75 > 20 → PASS
  const verdict = computeHookMetrics({
    frame0: negFrame0,
    early: makeFrame(() => 255),
    mid: focalMotionMid,
    final: negFrame0,
  });

  it("gate 5 passes — full row-1 band (title-card) passes via focal path", () => {
    const g = verdict.gates.find((g) => g.id === 5);
    expect(g.pass).toBe(true);
    expect(g.advisory).toBe(true);
    expect(g.measured.rows).toBe(1);
    expect(g.measured.cells).toBeGreaterThanOrEqual(2);
  });
});

describe("computeHookMetrics — gate 5 concentrated-focal PASS (terminal-in-one-row pattern)", () => {
  // terminalFrame0: cells (1,0) and (1,1) alternating (stddev=75), rest flat; models RelayLaunch.
  // contentCells=2, rows=1; passA: rows=1 < 2 → false; passB: maxStddev=75 > 20, cells=2 ≥ 2 → PASS
  const verdict = computeHookMetrics({
    frame0: terminalFrame0,
    early: makeFrame(() => 255),
    mid: focalMotionMid,
    final: terminalFrame0,
  });

  it("gate 5 passes — 2-cell single-row terminal passes via focal path", () => {
    const g = verdict.gates.find((g) => g.id === 5);
    expect(g.pass).toBe(true);
    expect(g.advisory).toBe(true);
    expect(g.measured.rows).toBe(1);
    expect(g.measured.cells).toBe(2);
  });
});

describe("computeHookMetrics — gate 4 concentrated-focal PASS (single-strong-region pattern)", () => {
  // focalMotionMid: cell(1,1) delta=15 > FOCAL_MOTION_THRESHOLD=10; only 1 active cell (not separated)
  const verdict = computeHookMetrics({
    frame0: focalMotionFrame0,
    early: makeFrame(() => 255),
    mid: focalMotionMid,
    final: focalMotionFrame0,
  });

  it("gate 4 passes — single active cell with maxDelta > FOCAL_MOTION_THRESHOLD", () => {
    const g = verdict.gates.find((g) => g.id === 4);
    expect(g.pass).toBe(true);
    expect(g.advisory).toBe(true);
    expect(g.measured.active).toBe(1);
    expect(g.measured.separated).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: regression guards — anti-static-card (gate 5) and anti-frozen-bg (gate 4)
// ---------------------------------------------------------------------------

describe("computeHookMetrics — gate 5 regression guard: flat frame-0 fails (anti-static-card)", () => {
  // flatFrame: all pixels=100, stddev=0 in every cell → 0 content cells → both paths fail
  const verdict = computeHookMetrics({
    frame0: flatFrame,
    early: makeFrame(() => 255),
    mid: flatFrame,
    final: flatFrame,
  });

  it("gate 5 fails — all cells flat, 0 content cells, focal path also fails", () => {
    const g = verdict.gates.find((g) => g.id === 5);
    expect(g.pass).toBe(false);
    expect(g.advisory).toBe(true);
    expect(g.measured.cells).toBe(0);
  });
});

describe("computeHookMetrics — gate 4 regression guard: single weak region fails (anti-frozen-bg)", () => {
  // weakRegionMid: cell(1,1) delta=7; 7 > GRID_MOTION_THRESHOLD=5 but 7 < FOCAL_MOTION_THRESHOLD=10
  // passA: active=1, separated=false → false; passB: maxDelta=7 < 10 → false → FAIL
  const verdict = computeHookMetrics({
    frame0: flatFrame,
    early: makeFrame(() => 255),
    mid: weakRegionMid,
    final: flatFrame,
  });

  it("gate 4 fails — single active region with delta below FOCAL_MOTION_THRESHOLD", () => {
    const g = verdict.gates.find((g) => g.id === 4);
    expect(g.pass).toBe(false);
    expect(g.advisory).toBe(true);
    expect(g.measured.active).toBe(1);
    expect(g.measured.separated).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: reference videos (skip if frames not yet rendered)
//
// Updated verdicts after focal-liveness recalibration:
//   RelayLaunch:   g1=PASS(δ=0.29) g2=PASS(σ=7.45) g3=PASS(δ=6.56)
//                  g4=PASS(active=1,separated=false,maxDelta=12.2 > FOCAL_MOTION_THRESHOLD=10)
//                  g5=PASS(cells=2,rows=1,maxStddev=23.4 > FOCAL_STRENGTH_THRESHOLD=20)
//   GranipaLaunch: g1=PASS(δ=1.40) g2=PASS(σ=20.64) g3=PASS(δ=9.46)
//                  g4=PASS(active=3,separated=true — spread path unchanged)
//                  g5=PASS(cells=3,rows=1,maxStddev=49.3 > FOCAL_STRENGTH_THRESHOLD=20)
// All 5 gates now PASS for both reference videos. hardGatesPass=true.
// ---------------------------------------------------------------------------

describe(
  "computeHookMetrics — RelayLaunch reference (skip if not rendered)",
  () => {
    const verdict = relayAvailable ? computeHookMetrics(relay) : null;

    it.skipIf(!relayAvailable)(
      "hard gates 1–3 all pass; hardGatesPass=true",
      () => {
        expect(verdict.hardGatesPass).toBe(true);
        expect(verdict.gates.find((g) => g.id === 1).pass).toBe(true);
        expect(verdict.gates.find((g) => g.id === 2).pass).toBe(true);
        expect(verdict.gates.find((g) => g.id === 3).pass).toBe(true);
      },
    );

    it.skipIf(!relayAvailable)(
      "gate 4 (advisory) passes — single terminal region passes focal path (maxDelta=12.2 > 10.0)",
      () => {
        const g = verdict.gates.find((g) => g.id === 4);
        expect(g.pass).toBe(true);
        expect(g.measured.separated).toBe(false);
        expect(g.measured.active).toBe(1);
      },
    );

    it.skipIf(!relayAvailable)(
      "gate 5 (advisory) passes — terminal in single row passes focal path (maxStddev=23.4 > 20.0)",
      () => {
        const g = verdict.gates.find((g) => g.id === 5);
        expect(g.pass).toBe(true);
        expect(g.measured.rows).toBe(1);
      },
    );
  },
);

describe(
  "computeHookMetrics — GranipaLaunch reference (skip if not rendered)",
  () => {
    const verdict = granipaAvailable ? computeHookMetrics(granipa) : null;

    it.skipIf(!granipaAvailable)(
      "hard gates 1–3 all pass; hardGatesPass=true",
      () => {
        expect(verdict.hardGatesPass).toBe(true);
        expect(verdict.gates.find((g) => g.id === 1).pass).toBe(true);
        expect(verdict.gates.find((g) => g.id === 2).pass).toBe(true);
        expect(verdict.gates.find((g) => g.id === 3).pass).toBe(true);
      },
    );

    it.skipIf(!granipaAvailable)(
      "gate 4 (advisory) passes — text settle spans separated cells (spread path unchanged)",
      () => {
        const g = verdict.gates.find((g) => g.id === 4);
        expect(g.pass).toBe(true);
        expect(g.measured.separated).toBe(true);
      },
    );

    it.skipIf(!granipaAvailable)(
      "gate 5 (advisory) passes — title-card text band passes focal path (maxStddev=49.3 > 20.0)",
      () => {
        const g = verdict.gates.find((g) => g.id === 5);
        expect(g.pass).toBe(true);
        expect(g.measured.rows).toBe(1);
      },
    );
  },
);

// ---------------------------------------------------------------------------
// Tests: AmbientCheck (gate-pass reference — skip if frames not yet rendered)
//
// Documented verdicts from hook.md §2 (recorded 2026-06-21):
//   AmbientCheck: g1=PASS(δ=1.80) g2=PASS(σ=16.40) g3=PASS(δ=4.52)
//                 g4=PASS(active=6,separated=true) g5=PASS(cells=11,rows=4)
// hardGatesPass=true. First composition to PASS both advisory gates 4 and 5.
// ---------------------------------------------------------------------------

describe(
  "computeHookMetrics — AmbientCheck reference (skip if not rendered)",
  () => {
    const verdict = ambientCheckAvailable
      ? computeHookMetrics(ambientCheck)
      : null;

    it.skipIf(!ambientCheckAvailable)(
      "hard gates 1–3 all pass; hardGatesPass=true",
      () => {
        expect(verdict.hardGatesPass).toBe(true);
        expect(verdict.gates.find((g) => g.id === 1).pass).toBe(true);
        expect(verdict.gates.find((g) => g.id === 2).pass).toBe(true);
        expect(verdict.gates.find((g) => g.id === 3).pass).toBe(true);
      },
    );

    it.skipIf(!ambientCheckAvailable)(
      "gate 4 (advisory) passes — AmbientField strips activate ≥2 separated cells",
      () => {
        const g = verdict.gates.find((g) => g.id === 4);
        expect(g.pass).toBe(true);
        expect(g.measured.separated).toBe(true);
        expect(g.measured.active).toBeGreaterThanOrEqual(2);
      },
    );

    it.skipIf(!ambientCheckAvailable)(
      "gate 5 (advisory) passes — AmbientField distributes content across ≥2 grid rows",
      () => {
        const g = verdict.gates.find((g) => g.id === 5);
        expect(g.pass).toBe(true);
        expect(g.measured.rows).toBeGreaterThanOrEqual(2);
        expect(g.measured.cells).toBeGreaterThanOrEqual(2);
      },
    );
  },
);
