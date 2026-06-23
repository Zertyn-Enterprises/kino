#!/usr/bin/env node
// Dogfood regression harness: run ship-gate for relay+granipa, normalize verdict,
// compare to a committed golden.
//
// Modes:
//   --update   Re-run ship-gate for all canonical videos and write dogfood.golden.json.
//   --check    Re-run ship-gate, diff against golden; exit 0 on match, non-zero + readable
//              drift report on mismatch.
//
// Exported pure functions (no I/O; tested in dogfood.test.mjs):
//   normalize(report, gateMetrics) → stable snapshot
//   diff(compId, golden, current) → Array<drift>
//
// NOT wired into .github/workflows/checks.yml — full renders are too heavy for PR CI.
// Run locally before merging any gate-spine (*-metrics.mjs, ship-metrics.mjs,
// structure.mjs) or src/lib change.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const GOLDEN_PATH = 'scripts/dogfood.golden.json';

// Epsilon for float metric comparisons — absorbs sub-pixel render noise across runs.
// Strict equality is used for shipReady, hard verdicts, coverage, and blockers.
export const METRIC_EPSILON = 0.01;

// Canonical video set with exact ship-gate invocations.
// Palette flags match ship.md recorded snapshots exactly.
// --audio-not-bundled: acknowledges the musicsync coverage-gap (audio unbundled);
//   non-blocking, but surfaced. Applies even when analysis exists — if it does,
//   musicsync runs and produces a real verdict; the flag only matters when absent.
const VIDEOS = [
  {
    compId: 'RelayLaunch',
    slug: 'relay',
    paletteFlags: [
      '--bg=#0A0E0B', '--surface=#131A14', '--text=#F2F5F0',
      '--textDim=#8FA098', '--accent=#B6F22E', '--accentAlt=#E5484D',
    ],
    audioNotBundled: true,
  },
  {
    compId: 'GranipaLaunch',
    slug: 'granipa',
    paletteFlags: [
      '--bg=#0A0B0E', '--surface=#14161D', '--text=#F1F2F6',
      '--textDim=#8E93A3', '--accent=#3D8BFF', '--accentAlt=#F4604C',
    ],
    audioNotBundled: true,
  },
];

// ---------------------------------------------------------------------------
// Numeric leaf extractor — no I/O; used by loadGateMetrics
// ---------------------------------------------------------------------------

/**
 * Recursively extract all numeric (finite) leaf values from a value,
 * using dot-notation keys prefixed by `prefix`.
 * @param {*} value
 * @param {string} prefix
 * @returns {{ [key: string]: number }}
 */
function extractNumericLeaves(value, prefix) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { [prefix]: value };
  }
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const result = {};
    for (const [k, v] of Object.entries(value)) {
      const sub = extractNumericLeaves(v, prefix ? `${prefix}.${k}` : k);
      Object.assign(result, sub);
    }
    return result;
  }
  return {};
}

// ---------------------------------------------------------------------------
// Gate metrics loader — reads per-gate metrics.json files; I/O isolated here
// ---------------------------------------------------------------------------

/** Load and parse a JSON file; returns null on missing/unreadable. */
function loadJson(p) {
  if (!p || !existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; }
}

/**
 * Read individual gate metrics.json files and extract all numeric leaf values.
 * Returns an object keyed by gate name, each with { [metricKey]: number }.
 * Only gates with measurable numeric data are included.
 *
 * @param {string} compId - Remotion composition ID (e.g. 'RelayLaunch')
 * @param {string} slug   - Video slug (e.g. 'relay')
 * @returns {{ [gateName: string]: { [metricKey: string]: number } }}
 */
export function loadGateMetrics(compId, slug) {
  const rev = `out/review`;
  const result = {};

  // Gates with gates[].measured structure
  const gatesWithMeasured = [
    ['hook',           `${rev}/${compId}/hook/metrics.json`],
    ['retention',      `${rev}/${compId}/retention/metrics.json`],
    ['motion',         `${rev}/${compId}/motion/metrics.json`],
    ['legibility',     `${rev}/${compId}/legibility/metrics.json`],
    ['musicsync',      `${rev}/${compId}/musicsync/metrics.json`],
    ['payoff',         `${rev}/${compId}/payoff/metrics.json`],
  ];
  for (const [gate, jsonPath] of gatesWithMeasured) {
    const data = loadJson(jsonPath);
    if (!data?.gates) continue;
    const nums = {};
    for (const g of data.gates) {
      if (g.measured == null) continue;
      Object.assign(nums, extractNumericLeaves(g.measured, g.name));
    }
    const keys = Object.keys(nums).sort();
    if (keys.length > 0) {
      result[gate] = {};
      for (const k of keys) result[gate][k] = nums[k];
    }
  }

  // Contrast: pairs[].ratio structure
  const contrast = loadJson(`${rev}/${slug}/contrast/metrics.json`);
  if (contrast?.pairs) {
    const nums = {};
    for (const p of contrast.pairs) {
      if (typeof p.ratio === 'number' && Number.isFinite(p.ratio)) {
        nums[p.role] = p.ratio;
      }
    }
    const keys = Object.keys(nums).sort();
    if (keys.length > 0) {
      result.contrast = {};
      for (const k of keys) result.contrast[k] = nums[k];
    }
  }

  // remotionCorrect and codeCraft have no numeric measured values → omitted.
  // distinct has integer counts; omit — they are proxies for identity change,
  // better caught by the hard verdict (distinct is a source-only gate).

  return result;
}

// ---------------------------------------------------------------------------
// normalize() — pure exported function
// ---------------------------------------------------------------------------

const GATE_ORDER = [
  'hook', 'retention', 'contrast', 'motion', 'legibility', 'codeCraft',
  'musicsync', 'payoff', 'remotionCorrect', 'distinct', 'registrySync',
];

/**
 * Derive the human-readable hard verdict label from a gate entry.
 * @param {{ ran?: boolean, hardGatesPass?: boolean, coverage?: string }} gate
 * @returns {'PASS'|'FAIL'|'SKIP-NA'|'GAP'}
 */
function hardVerdictLabel(gate) {
  const cov = gate.coverage ?? (gate.ran ? 'ran' : 'coverage-gap');
  if (cov === 'skip-na') return 'SKIP-NA';
  if (cov === 'coverage-gap') return 'GAP';
  return gate.hardGatesPass ? 'PASS' : 'FAIL';
}

/**
 * Normalize a ship report + gate metrics into a stable, deterministically-ordered snapshot.
 * Pure function: no I/O.
 *
 * Strict equality applies to shipReady, hardVerdict, coverage, and blockers.
 * Numeric metrics in the returned snapshot are compared with METRIC_EPSILON tolerance
 * by diff() to absorb sub-pixel render noise.
 *
 * @param {object} report      - Parsed report.json content (from ship-gate.sh output).
 * @param {object} [gateMetrics={}] - Per-gate numeric metrics from loadGateMetrics().
 * @returns {{
 *   shipReady: boolean,
 *   gates: { [name]: { hardVerdict: string, coverage: string } },
 *   blockers: string[],
 *   metrics: { [gate]: { [key]: number } },
 * }}
 */
export function normalize(report, gateMetrics = {}) {
  const gates = {};
  for (const name of GATE_ORDER) {
    const g = report.gates?.[name];
    if (!g) continue;
    gates[name] = {
      hardVerdict: hardVerdictLabel(g),
      coverage: g.coverage ?? (g.ran ? 'ran' : 'coverage-gap'),
    };
  }

  // Metrics in deterministic gate order, keys sorted within each gate.
  const metrics = {};
  for (const name of GATE_ORDER) {
    const gm = gateMetrics[name];
    if (!gm) continue;
    const keys = Object.keys(gm).sort();
    if (keys.length > 0) {
      metrics[name] = {};
      for (const k of keys) metrics[name][k] = gm[k];
    }
  }

  return {
    shipReady: report.shipReady,
    gates,
    blockers: [...(report.blockers ?? [])].sort(),
    metrics,
  };
}

// ---------------------------------------------------------------------------
// diff() — pure exported function
// ---------------------------------------------------------------------------

/**
 * Diff two normalized snapshots for one video.
 * Pure function: no I/O.
 *
 * Drift policy:
 *   - shipReady, hardVerdict, coverage, blockers: strict equality.
 *   - numeric metrics: |golden - actual| ≤ METRIC_EPSILON is a match.
 *
 * @param {string} compId   - Video composition ID (for readable drift entries).
 * @param {object} golden   - Golden snapshot from normalize().
 * @param {object} current  - Current snapshot from normalize().
 * @returns {Array<{ video: string, gate: string|null, field: string, golden: *, actual: * }>}
 */
export function diff(compId, golden, current) {
  const drifts = [];

  function add(gate, field, g, a) {
    drifts.push({ video: compId, gate: gate ?? null, field, golden: g, actual: a });
  }

  // shipReady — strict
  if (golden.shipReady !== current.shipReady) {
    add(null, 'shipReady', golden.shipReady, current.shipReady);
  }

  // gates — strict on hardVerdict + coverage
  const gateNames = new Set([
    ...Object.keys(golden.gates ?? {}),
    ...Object.keys(current.gates ?? {}),
  ]);
  for (const name of [...gateNames].sort()) {
    const g = golden.gates?.[name] ?? {};
    const c = current.gates?.[name] ?? {};
    if (g.hardVerdict !== c.hardVerdict) {
      add(name, 'hardVerdict', g.hardVerdict, c.hardVerdict);
    }
    if (g.coverage !== c.coverage) {
      add(name, 'coverage', g.coverage, c.coverage);
    }
  }

  // blockers — strict (sorted arrays, compared as JSON)
  const goldenB = JSON.stringify(golden.blockers ?? []);
  const currentB = JSON.stringify(current.blockers ?? []);
  if (goldenB !== currentB) {
    add(null, 'blockers', golden.blockers ?? [], current.blockers ?? []);
  }

  // metrics — epsilon tolerance
  const metricGates = new Set([
    ...Object.keys(golden.metrics ?? {}),
    ...Object.keys(current.metrics ?? {}),
  ]);
  for (const gate of [...metricGates].sort()) {
    const gm = golden.metrics?.[gate] ?? {};
    const cm = current.metrics?.[gate] ?? {};
    const keys = new Set([...Object.keys(gm), ...Object.keys(cm)]);
    for (const k of [...keys].sort()) {
      const gv = gm[k];
      const cv = cm[k];
      if (gv === undefined || cv === undefined) {
        // Metric present in one but not the other — always a drift.
        add(gate, `metrics.${k}`, gv, cv);
        continue;
      }
      const delta = Math.abs(gv - cv);
      if (delta > METRIC_EPSILON) {
        add(gate, `metrics.${k} (delta=${delta.toFixed(4)}, eps=${METRIC_EPSILON})`, gv, cv);
      }
    }
  }

  return drifts;
}

// ---------------------------------------------------------------------------
// CLI — only active when this file is the entry point
// ---------------------------------------------------------------------------

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const mode = args.includes('--update') ? 'update' : args.includes('--check') ? 'check' : null;

  if (!mode) {
    process.stderr.write('Usage: node scripts/dogfood.mjs --update | --check\n');
    process.exit(1);
  }

  /** Run ship-gate.sh for one video and return its normalized snapshot. */
  function runVideo({ compId, slug, paletteFlags, audioNotBundled }) {
    const shipArgs = [compId, slug, ...paletteFlags];
    if (audioNotBundled) shipArgs.push('--audio-not-bundled');

    process.stdout.write(`\n==> Running ship-gate.sh for ${compId}...\n`);
    try {
      const output = execFileSync('scripts/ship-gate.sh', shipArgs, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'inherit'],
      });
      process.stdout.write(output);
    } catch (err) {
      // ship-gate.sh exits non-zero when SHIP: BLOCKED — that's OK for dogfood.
      if (err.stdout) process.stdout.write(err.stdout);
    }

    const reportPath = `out/review/${compId}/ship/report.json`;
    if (!existsSync(reportPath)) {
      process.stderr.write(`ERROR: ${reportPath} not found after ship-gate.sh run\n`);
      process.exit(1);
    }
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    const gateMetrics = loadGateMetrics(compId, slug);
    return normalize(report, gateMetrics);
  }

  if (mode === 'update') {
    const golden = {};
    for (const video of VIDEOS) {
      golden[video.compId] = runVideo(video);
    }
    writeFileSync(GOLDEN_PATH, JSON.stringify(golden, null, 2) + '\n');
    process.stdout.write(`\nGolden written → ${GOLDEN_PATH}\n`);
    process.exit(0);
  }

  if (mode === 'check') {
    if (!existsSync(GOLDEN_PATH)) {
      process.stderr.write(`ERROR: ${GOLDEN_PATH} not found — run npm run dogfood first\n`);
      process.exit(1);
    }
    const golden = JSON.parse(readFileSync(GOLDEN_PATH, 'utf8'));

    const allDrifts = [];
    for (const video of VIDEOS) {
      const current = runVideo(video);
      const goldenSnap = golden[video.compId];
      if (!goldenSnap) {
        process.stderr.write(`ERROR: ${video.compId} not in golden — run npm run dogfood first\n`);
        process.exit(1);
      }
      const drifts = diff(video.compId, goldenSnap, current);
      allDrifts.push(...drifts);
    }

    if (allDrifts.length === 0) {
      process.stdout.write('\nDogfood check PASSED — all verdicts match golden\n');
      process.exit(0);
    }

    process.stdout.write(`\nDogfood check FAILED — ${allDrifts.length} drift(s) vs golden:\n`);
    for (const d of allDrifts) {
      const gateLabel = d.gate ? `gate=${d.gate} ` : '';
      const goldenVal = JSON.stringify(d.golden);
      const actualVal = JSON.stringify(d.actual);
      process.stdout.write(`  ${d.video}  ${gateLabel}field=${d.field}  golden=${goldenVal}  actual=${actualVal}\n`);
    }
    process.stdout.write('\nFix the drifting gate(s) or run npm run dogfood to update the golden.\n');
    process.exit(1);
  }
}
