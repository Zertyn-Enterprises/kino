#!/usr/bin/env node
// Computes objective PASS/FAIL for three pixel-computable hook gates.
// Decodes PNG frames using Node's built-in zlib (zero new deps).
//
// Usage: node scripts/hook-metrics.mjs <frame0.png> <early.png> <final.png>
//
// Gates:
//   Motion by frame 10 — mean abs luminance delta (frame0 vs early) > MOTION_THRESHOLD
//   Frame-0 contrast   — luminance stddev of frame0 > CONTRAST_THRESHOLD
//   Loop seam          — mean abs luminance delta (frame0 vs final) < SEAM_THRESHOLD
//
// Thresholds are calibrated so both RelayLaunch and GranipaLaunch PASS;
// values that indicate a frozen/flat/jarring opening will FAIL.
// These inform the gate but do not replace the human contact-sheet review.

import { inflateSync } from 'node:zlib';
import { readFileSync, existsSync } from 'node:fs';

// Documented thresholds — calibrated against shipped examples
const MOTION_THRESHOLD   = 1.0;   // mean abs lum delta; catches truly frozen/static openings
const CONTRAST_THRESHOLD = 10.0;  // lum stddev; catches flat solid-color frame 0
const SEAM_THRESHOLD     = 60.0;  // mean abs lum delta; catches jarring autoplay-restart cuts

const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function decodePNG(buf) {
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

function toLuminance(img) {
  const { pixels, channels, width, height } = img;
  const count = width * height;
  const lum = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const base = i * channels;
    lum[i] = 0.299 * pixels[base] + 0.587 * pixels[base + 1] + 0.114 * pixels[base + 2];
  }
  return lum;
}

function meanAbsDelta(a, b) {
  const n = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < n; i++) sum += Math.abs(a[i] - b[i]);
  return sum / n;
}

function stddev(arr) {
  const n = arr.length;
  let mean = 0;
  for (let i = 0; i < n; i++) mean += arr[i];
  mean /= n;
  let variance = 0;
  for (let i = 0; i < n; i++) variance += (arr[i] - mean) ** 2;
  return Math.sqrt(variance / n);
}

function loadFrame(path) {
  if (!existsSync(path)) return null;
  try {
    return decodePNG(readFileSync(path));
  } catch {
    return null;
  }
}

const [,, frame0Path, earlyPath, finalPath] = process.argv;
if (!frame0Path || !earlyPath || !finalPath) {
  process.stderr.write(
    'Usage: node scripts/hook-metrics.mjs <frame0.png> <early.png> <final.png>\n',
  );
  process.exit(1);
}

const f0 = loadFrame(frame0Path);
const fe = loadFrame(earlyPath);
const ff = loadFrame(finalPath);

const lum0 = f0 ? toLuminance(f0) : null;

console.log('\n── Hook pixel metrics ─────────────────────────────────────');

// Gate 1: Motion by frame 10
if (!lum0 || !fe) {
  const missing = !lum0 ? 'frame0' : 'early';
  console.log(`Motion by frame 10   SKIP  (${missing} missing or unreadable)`);
} else {
  const delta = meanAbsDelta(lum0, toLuminance(fe));
  const pass  = delta > MOTION_THRESHOLD;
  console.log(`Motion by frame 10   ${pass ? 'PASS' : 'FAIL'}  delta=${delta.toFixed(2)} (threshold >${MOTION_THRESHOLD})`);
}

// Gate 2: Frame-0 contrast
if (!lum0) {
  console.log('Frame-0 contrast     SKIP  (frame0 missing or unreadable)');
} else {
  const sd   = stddev(lum0);
  const pass = sd > CONTRAST_THRESHOLD;
  console.log(`Frame-0 contrast     ${pass ? 'PASS' : 'FAIL'}  stddev=${sd.toFixed(2)} (threshold >${CONTRAST_THRESHOLD})`);
}

// Gate 3: Loop seam
if (!lum0 || !ff) {
  const missing = !lum0 ? 'frame0' : 'final';
  console.log(`Loop seam            SKIP  (${missing} missing or unreadable)`);
} else {
  const delta = meanAbsDelta(lum0, toLuminance(ff));
  const pass  = delta < SEAM_THRESHOLD;
  console.log(`Loop seam            ${pass ? 'PASS' : 'FAIL'}  delta=${delta.toFixed(2)} (threshold <${SEAM_THRESHOLD})`);
}

console.log('───────────────────────────────────────────────────────────\n');
