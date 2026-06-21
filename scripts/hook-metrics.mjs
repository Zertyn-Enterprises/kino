#!/usr/bin/env node
// Computes objective PASS/FAIL for five pixel-computable hook gates.
// Decodes PNG frames using Node's built-in zlib (zero new deps).
//
// Usage: node scripts/hook-metrics.mjs <frame0.png> <early.png> <mid.png> <final.png> [--json]
//        --json  emit structured JSON verdict instead of human-readable table
//
// Gates (1–3 HARD block on FAIL; 4–5 advisory, never affect exit code):
//   1. Motion by frame 10      — mean abs luminance delta (frame0 vs early) > MOTION_THRESHOLD
//   2. Frame-0 contrast        — luminance stddev of frame0 > CONTRAST_THRESHOLD
//   3. Loop seam               — mean abs luminance delta (frame0 vs final) < SEAM_THRESHOLD
//   4. Background activity     — ≥2 spatially-separated 4×4 grid cells with mean-abs-delta
//                                (frame0 vs mid) > GRID_MOTION_THRESHOLD
//   5. Frame-0 liveness        — 4×4 grid cells on frame0 with local stddev > GRID_STDDEV_THRESHOLD
//                                span ≥2 rows and total ≥ LIVENESS_MIN_CELLS
//
// Exit code: 0 when all HARD gates pass or are skipped; non-zero only on HARD gate FAIL.
// Advisory gate failures (4, 5) never affect the exit code.
//
// Thresholds are calibrated so both RelayLaunch and GranipaLaunch PASS gates 1–3;
// gates 4–5 are calibrated to flag the two named defects as FAIL:
//   RelayLaunch gate 4: background static (single active region) → FAIL
//   GranipaLaunch gate 5: frame-0 text-only card (content in one band) → FAIL
// Measured values (RelayLaunch): motion=0.29, contrast=7.45, seam=6.56,
//                                g4 active=1/16 separated=false (FAIL — documented defect: single terminal region),
//                                g5 cells=2/16 rows=1 (FAIL — terminal occupies 1 row of 4×4 grid)
// Measured values (GranipaLaunch): motion=1.40, contrast=20.64, seam=9.46,
//                                  g4 active=3/16 separated=true (PASS — text+settle spans ≥2 cols),
//                                  g5 cells=3/16 rows=1 (FAIL — known title-card defect: text band in 1 row)
// These inform the gate but do not replace the human contact-sheet review.

import { inflateSync } from 'node:zlib';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Gate 1–3 thresholds — unchanged, calibrated against both shipped examples.
const MOTION_THRESHOLD   = 0.1;   // mean abs lum delta; catches truly frozen/static openings
const CONTRAST_THRESHOLD = 5.0;   // lum stddev; catches flat solid-color frame 0
const SEAM_THRESHOLD     = 60.0;  // mean abs lum delta; catches jarring autoplay-restart cuts

// 4×4 grid parameters for gates 4–5.
const GRID_ROWS = 4;
const GRID_COLS = 4;

// Gate 4: Background/parallel activity — per-cell mean-abs-lum-delta (frame0 vs mid).
// Measured at mid=60% of hook: RelayLaunch f89 peak=(1,1)=12.2 only;
// GranipaLaunch f43: (1,0)=6.1, (1,1)=8.0x, (1,2)=6.2 all exceed floor, Chebyshev-separated.
// Threshold 5.0 passes GranipaLaunch (icon settle spread, cells separated by col≥2)
// and fails RelayLaunch (single terminal cell > floor, adjacent cell drops below).
const GRID_MOTION_THRESHOLD = 5.0;   // mean abs lum delta per cell; catches single-region motion

// Gate 5: Frame-0 liveness (anti-static-card) — per-cell luminance stddev on frame0.
// Measured: GranipaLaunch f0 text-band cells (1,0–2)=43–49, bg cells <7;
// RelayLaunch f0 terminal cells (1,0)=11.7, (1,1)=23.4, bg cells <3.
// Threshold 10.0 surfaces: GranipaLaunch cells=3 rows=1 (title-card text band);
// RelayLaunch cells=2 rows=1 (terminal focused in single row area).
const GRID_STDDEV_THRESHOLD = 10.0;  // lum stddev per cell; distinguishes structure from flat bg
const LIVENESS_MIN_CELLS    = 2;     // minimum content cells; content must also span ≥2 rows

const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

export function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

export function decodePNG(buf) {
  if (!PNG_SIG.equals(buf.subarray(0, 8))) throw new Error('Not a PNG');

  let offset = 8;
  let width, height, bitDepth, colorType;
  const idatChunks = [];

  while (offset + 12 <= buf.length) {
    const chunkLen = buf.readUInt32BE(offset);
    const type = buf.subarray(offset + 4, offset + 8).toString('ascii');
    const data = buf.subarray(offset + 8, offset + 8 + chunkLen);
    offset += 12 + chunkLen;

    if (type === 'IHDR') {
      width      = data.readUInt32BE(0);
      height     = data.readUInt32BE(4);
      bitDepth   = data[8];
      colorType  = data[9];
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }

  if (!width || !height) throw new Error('IHDR not found');
  if (bitDepth !== 8) throw new Error(`Unsupported bit depth: ${bitDepth}`);

  // channels per colorType: 0=gray(1) 2=RGB(3) 3=indexed(1) 4=gray+alpha(2) 6=RGBA(4)
  const CHANNELS_BY_TYPE = [1, 0, 3, 1, 2, 0, 4];
  const channels = CHANNELS_BY_TYPE[colorType];
  if (!channels) throw new Error(`Unsupported color type: ${colorType}`);

  const raw    = inflateSync(Buffer.concat(idatChunks));
  const stride = width * channels;
  const pixels = Buffer.alloc(height * stride);

  let rawOff = 0;
  for (let y = 0; y < height; y++) {
    const filter     = raw[rawOff++];
    const rowOff     = y * stride;
    const prevRowOff = (y - 1) * stride;
    for (let x = 0; x < stride; x++) {
      const v = raw[rawOff++];
      const a = x >= channels            ? pixels[rowOff + x - channels]     : 0;
      const b = y > 0                    ? pixels[prevRowOff + x]             : 0;
      const c = x >= channels && y > 0   ? pixels[prevRowOff + x - channels] : 0;
      let out;
      switch (filter) {
        case 0: out = v;                                           break;
        case 1: out = (v + a) & 0xff;                             break;
        case 2: out = (v + b) & 0xff;                             break;
        case 3: out = (v + ((a + b) >> 1)) & 0xff;                break;
        case 4: out = (v + paethPredictor(a, b, c)) & 0xff;       break;
        default: throw new Error(`Unknown PNG filter type: ${filter}`);
      }
      pixels[rowOff + x] = out;
    }
  }

  return { width, height, channels, pixels };
}

export function toLuminance(img) {
  const { pixels, channels, width, height } = img;
  const count = width * height;
  const lum = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const base = i * channels;
    lum[i] = 0.299 * pixels[base] + 0.587 * pixels[base + 1] + 0.114 * pixels[base + 2];
  }
  return lum;
}

export function meanAbsDelta(a, b) {
  const n = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < n; i++) sum += Math.abs(a[i] - b[i]);
  return sum / n;
}

export function stddev(arr) {
  const n = arr.length;
  let mean = 0;
  for (let i = 0; i < n; i++) mean += arr[i];
  mean /= n;
  let variance = 0;
  for (let i = 0; i < n; i++) variance += (arr[i] - mean) ** 2;
  return Math.sqrt(variance / n);
}

// Computes per-cell stats for the 4×4 grid.
// Returns array of { row, col, stddev0, meanDelta } where meanDelta is vs lumMid
// (0 if lumMid is null). Cells cover floor(width/4) × floor(height/4) pixels each.
export function computeGrid(lum0, lumMid, width, height) {
  const cellH = Math.floor(height / GRID_ROWS);
  const cellW = Math.floor(width  / GRID_COLS);
  const cells = [];

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const y0 = r * cellH;
      const y1 = Math.min(y0 + cellH, height);
      const x0 = c * cellW;
      const x1 = Math.min(x0 + cellW, width);

      let sum = 0, sumSq = 0, deltaSum = 0, count = 0;

      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const idx = y * width + x;
          const v   = lum0[idx];
          sum     += v;
          sumSq   += v * v;
          if (lumMid) deltaSum += Math.abs(v - lumMid[idx]);
          count++;
        }
      }

      const mean  = sum / count;
      const sd    = Math.sqrt(Math.max(0, sumSq / count - mean * mean));
      cells.push({ row: r, col: c, stddev0: sd, meanDelta: lumMid ? deltaSum / count : 0 });
    }
  }

  return cells;
}

// Returns true if any two cells in the array have Chebyshev distance ≥ 2
// (i.e. are not directly adjacent including diagonals — not a single contiguous blob).
export function hasSeparatedPair(cells) {
  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      const dr = Math.abs(cells[i].row - cells[j].row);
      const dc = Math.abs(cells[i].col - cells[j].col);
      if (Math.max(dr, dc) >= 2) return true;
    }
  }
  return false;
}

export function loadFrame(path) {
  if (!existsSync(path)) return null;
  try {
    return decodePNG(readFileSync(path));
  } catch {
    return null;
  }
}

/**
 * Pure computation: evaluate all five hook gates for the given decoded frames.
 * @param {{ frame0, early, mid, final }} frames — decoded PNG images (from loadFrame), or null
 * @returns {{ gates: Array, summary: Object, hardGatesPass: boolean }}
 *
 * Each gate entry: { id, name, hard, advisory, pass, skip, measured, threshold, skipReason? }
 * hardGatesPass is true when all hard gates (1–3) pass or are skipped (missing frame = not a FAIL).
 */
export function computeHookMetrics({ frame0, early, mid, final: finalFrame }) {
  const lum0 = frame0     ? toLuminance(frame0)     : null;
  const lumE = early      ? toLuminance(early)      : null;
  const lumM = mid        ? toLuminance(mid)        : null;
  const lumF = finalFrame ? toLuminance(finalFrame) : null;

  const gates = [];

  // Gate 1: Motion by frame 10 (HARD)
  if (!lum0 || !lumE) {
    gates.push({
      id: 1, name: 'Motion by frame 10', hard: true, advisory: false,
      pass: false, skip: true, measured: null, threshold: MOTION_THRESHOLD,
      skipReason: !lum0 ? 'frame0 missing or unreadable' : 'early missing or unreadable',
    });
  } else {
    const measured = meanAbsDelta(lum0, lumE);
    gates.push({
      id: 1, name: 'Motion by frame 10', hard: true, advisory: false,
      pass: measured > MOTION_THRESHOLD, skip: false, measured, threshold: MOTION_THRESHOLD,
    });
  }

  // Gate 2: Frame-0 contrast (HARD)
  if (!lum0) {
    gates.push({
      id: 2, name: 'Frame-0 contrast', hard: true, advisory: false,
      pass: false, skip: true, measured: null, threshold: CONTRAST_THRESHOLD,
      skipReason: 'frame0 missing or unreadable',
    });
  } else {
    const measured = stddev(lum0);
    gates.push({
      id: 2, name: 'Frame-0 contrast', hard: true, advisory: false,
      pass: measured > CONTRAST_THRESHOLD, skip: false, measured, threshold: CONTRAST_THRESHOLD,
    });
  }

  // Gate 3: Loop seam (HARD)
  if (!lum0 || !lumF) {
    gates.push({
      id: 3, name: 'Loop seam', hard: true, advisory: false,
      pass: false, skip: true, measured: null, threshold: SEAM_THRESHOLD,
      skipReason: !lum0 ? 'frame0 missing or unreadable' : 'final missing or unreadable',
    });
  } else {
    const measured = meanAbsDelta(lum0, lumF);
    gates.push({
      id: 3, name: 'Loop seam', hard: true, advisory: false,
      pass: measured < SEAM_THRESHOLD, skip: false, measured, threshold: SEAM_THRESHOLD,
    });
  }

  // Gate 4: Background / parallel activity (advisory)
  if (!lum0 || !lumM) {
    gates.push({
      id: 4, name: 'Background activity', hard: false, advisory: true,
      pass: false, skip: true, measured: null,
      threshold: { minActive: 2, separated: true, cellThreshold: GRID_MOTION_THRESHOLD },
      skipReason: !lum0 ? 'frame0 missing or unreadable' : 'mid missing or unreadable',
    });
  } else {
    const grid        = computeGrid(lum0, lumM, frame0.width, frame0.height);
    const activeCells = grid.filter(cell => cell.meanDelta > GRID_MOTION_THRESHOLD);
    const separated   = hasSeparatedPair(activeCells);
    const pass        = activeCells.length >= 2 && separated;
    gates.push({
      id: 4, name: 'Background activity', hard: false, advisory: true,
      pass, skip: false,
      measured: { active: activeCells.length, total: GRID_ROWS * GRID_COLS, separated },
      threshold: { minActive: 2, separated: true, cellThreshold: GRID_MOTION_THRESHOLD },
    });
  }

  // Gate 5: Frame-0 liveness (advisory)
  if (!lum0) {
    gates.push({
      id: 5, name: 'Frame-0 liveness', hard: false, advisory: true,
      pass: false, skip: true, measured: null,
      threshold: { minCells: LIVENESS_MIN_CELLS, minRows: 2, cellThreshold: GRID_STDDEV_THRESHOLD },
      skipReason: 'frame0 missing or unreadable',
    });
  } else {
    const grid         = computeGrid(lum0, null, frame0.width, frame0.height);
    const contentCells = grid.filter(cell => cell.stddev0 > GRID_STDDEV_THRESHOLD);
    const rowSpread    = new Set(contentCells.map(cell => cell.row)).size;
    const pass         = rowSpread >= 2 && contentCells.length >= LIVENESS_MIN_CELLS;
    gates.push({
      id: 5, name: 'Frame-0 liveness', hard: false, advisory: true,
      pass, skip: false,
      measured: { cells: contentCells.length, total: GRID_ROWS * GRID_COLS, rows: rowSpread },
      threshold: { minCells: LIVENESS_MIN_CELLS, minRows: 2, cellThreshold: GRID_STDDEV_THRESHOLD },
    });
  }

  const hardGatesPass = gates.filter(g => g.hard).every(g => g.skip || g.pass);
  const summary = {
    passed:  gates.filter(g => !g.skip &&  g.pass).length,
    failed:  gates.filter(g => !g.skip && !g.pass).length,
    skipped: gates.filter(g =>  g.skip).length,
  };

  return { gates, summary, hardGatesPass };
}

function printHumanReadable({ gates }) {
  console.log('\n── Hook pixel metrics ─────────────────────────────────────');
  for (const gate of gates) {
    const adv    = gate.advisory ? ' (advisory)' : '';
    const status = gate.skip ? 'SKIP' : (gate.pass ? 'PASS' : 'FAIL');

    if (gate.skip) {
      console.log(`${gate.name.padEnd(21)}${status}  (${gate.skipReason})${adv}`);
      continue;
    }

    switch (gate.id) {
      case 1:
        console.log(`Motion by frame 10   ${status}  delta=${gate.measured.toFixed(2)} (threshold >${gate.threshold})`);
        break;
      case 2:
        console.log(`Frame-0 contrast     ${status}  stddev=${gate.measured.toFixed(2)} (threshold >${gate.threshold})`);
        break;
      case 3:
        console.log(`Loop seam            ${status}  delta=${gate.measured.toFixed(2)} (threshold <${gate.threshold})`);
        break;
      case 4: {
        const { active, total, separated } = gate.measured;
        console.log(`Background activity  ${status}  active=${active}/${total} separated=${separated} (threshold ≥2 separated, cell>${gate.threshold.cellThreshold})${adv}`);
        break;
      }
      case 5: {
        const { cells, total, rows } = gate.measured;
        console.log(`Frame-0 liveness     ${status}  cells=${cells}/${total} rows=${rows} (threshold ≥2 rows,≥${gate.threshold.minCells} cells, cell>${gate.threshold.cellThreshold})${adv}`);
        break;
      }
    }
  }
  console.log('───────────────────────────────────────────────────────────\n');
}

// CLI — only runs when this file is the entry point, not when imported.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args      = process.argv.slice(2);
  const jsonMode  = args.includes('--json');
  const positional = args.filter(a => !a.startsWith('--'));
  const [frame0Path, earlyPath, midPath, finalPath] = positional;

  if (!frame0Path || !earlyPath || !midPath || !finalPath) {
    process.stderr.write(
      'Usage: node scripts/hook-metrics.mjs <frame0.png> <early.png> <mid.png> <final.png> [--json]\n',
    );
    process.exit(1);
  }

  const frame0  = loadFrame(frame0Path);
  const early   = loadFrame(earlyPath);
  const mid     = loadFrame(midPath);
  const final_  = loadFrame(finalPath);

  const verdict = computeHookMetrics({ frame0, early, mid, final: final_ });

  if (jsonMode) {
    process.stdout.write(JSON.stringify(verdict, null, 2) + '\n');
  } else {
    printHumanReadable(verdict);
  }

  process.exit(verdict.hardGatesPass ? 0 : 1);
}
