#!/usr/bin/env node
// Scaffold-smoke: render-verify the gate-green-by-construction scaffold claim.
// Scaffolds a throwaway --hook/--body/--distinct video, exercises the real
// identity-seed path (not a hardcoded stub), renders it via render-bearing gate
// scripts, asserts all HARD gates + hook advisory 4+5 + retention dead-air PASS.
// Also render-verifies each non-strips ambient motif (motes/grid-pulse/ember-rise)
// through hook.sh frame-0 liveness + background-activity.
// Tears down cleanly in finally (Root.tsx + registry restored, dirs removed).
//
// Usage: node scripts/scaffold-smoke.mjs
//   No arguments. Writes to out/review/ScaffoldSmoke/ and out/review/scaffold-smoke/.
//   Full Chromium renders required — local only, not CI.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { computeIdentitySeed } from './identity-seed.mjs';

const __filename = fileURLToPath(import.meta.url);
void __filename; // used for is-main guard below

// ── Constants ──────────────────────────────────────────────────────────────────

const SLUG     = 'scaffold-smoke';
const COMP_ID  = 'ScaffoldSmoke';
const HOOK_KEY = 'mid-action-demo';
const BODY_KEY = 'back-loaded-climax';

// Non-strips motifs to render-verify independently via hook.sh.
const NON_STRIPS_MOTIFS = ['motes', 'grid-pulse', 'ember-rise'];

// Paths
const ROOT_TSX    = 'src/Root.tsx';
const REGISTRY_MD = 'src/videos/_registry.md';
const VIDEO_DIR   = `src/videos/${SLUG}`;
const PUBLIC_DIR  = `public/${SLUG}`;
const OUT_COMP    = `out/review/${COMP_ID}`;
const OUT_SLUG    = `out/review/${SLUG}`;

// ── Cleanup ────────────────────────────────────────────────────────────────────

let rootTsxSnapshot   = null;
let registrySnapshot  = null;

function cleanup() {
  if (rootTsxSnapshot !== null) {
    try { writeFileSync(ROOT_TSX, rootTsxSnapshot); } catch { /* best-effort */ }
    rootTsxSnapshot = null;
  }
  if (registrySnapshot !== null) {
    try { writeFileSync(REGISTRY_MD, registrySnapshot); } catch { /* best-effort */ }
    registrySnapshot = null;
  }
  for (const dir of [VIDEO_DIR, PUBLIC_DIR, OUT_COMP, OUT_SLUG]) {
    try { if (existsSync(dir)) rmSync(dir, { recursive: true }); } catch { /* best-effort */ }
  }
}

/** Reset filesystem to clean snapshot state between test passes. */
function resetToSnapshot() {
  writeFileSync(ROOT_TSX, rootTsxSnapshot);
  writeFileSync(REGISTRY_MD, registrySnapshot);
  for (const dir of [VIDEO_DIR, PUBLIC_DIR]) {
    if (existsSync(dir)) rmSync(dir, { recursive: true });
  }
}

// ── Registry entry builder ─────────────────────────────────────────────────────

/**
 * Append a seed-accurate registry entry for SLUG so:
 *   - registry-completeness HARD gate passes (entry exists for buildable folder)
 *   - registry-axis-drift HARD gate passes (bg/accent/luminance/grain match theme.ts)
 *   - ≥4-axis anti-template HARD gate passes (seed was computed to guarantee this)
 *
 * Call AFTER new-video.mjs (which does not modify _registry.md) and BEFORE distinct.sh.
 * Reads the current registry file to derive the correct section index.
 */
function appendSeedRegistryEntry(seed, ambientKey) {
  const currentRegistry = readFileSync(REGISTRY_MD, 'utf8');
  const existingCount = (currentRegistry.match(/^## \d+\s*·/gm) ?? []).length;
  const today = new Date().toISOString().slice(0, 10);
  const textureVal = seed.grainPct > 0
    ? `filmic — grain ${seed.grainPct}%, vignette 0`
    : `clean — grain 0%, vignette 0%`;
  const registryEntry = `
## ${existingCount + 1} · ${SLUG} / ${COMP_ID} (${today})

> **Throwaway smoke-test fixture.** Auto-removed by scripts/scaffold-smoke.mjs.

| field           | value                                               |
| --------------- | --------------------------------------------------- |
| product         | scaffold-smoke.mjs fixture                          |
| arc             | ${seed.arc}                                         |
| rhythm          | TODO(director)                                      |
| luminance       | ${seed.luminance}                                   |
| palette         | bg ${seed.bg} · accent ${seed.accent}               |
| type            | ${seed.displayFamily} display / ${seed.bodyFamily} body |
| signature moves | TODO(director)                                      |
| texture         | ${textureVal}                                       |
| transitions     | TODO(director)                                      |
| music           | ${seed.bpmBpm}bpm TODO(director)                    |
| ambient-motif   | ${ambientKey}                                       |
`;
  writeFileSync(REGISTRY_MD, currentRegistry.trimEnd() + '\n' + registryEntry);
}

// ── Gate runner ────────────────────────────────────────────────────────────────

function runGate(script, args) {
  process.stdout.write(`\n==> ${script} ${args.join(' ')}\n`);
  try {
    const out = execFileSync(script, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    process.stdout.write(out);
  } catch (err) {
    // non-zero exit on HARD fail — still show output and continue to read metrics
    if (err.stdout) process.stdout.write(err.stdout);
  }
}

// ── Assertion helpers ──────────────────────────────────────────────────────────

function loadJson(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; }
}

/** Assert all HARD gates pass. Returns array of failure strings. */
function assertHard(gateName, metricsPath) {
  const m = loadJson(metricsPath);
  if (!m) return [`${gateName}: metrics.json not found at ${metricsPath}`];
  if (m.hardGatesPass) return [];
  const failed = (m.gates ?? []).filter(g => g.hard && !g.skip && !g.pass);
  if (failed.length === 0) return [`${gateName}: hardGatesPass=false but no failed HARD gate found`];
  return failed.map(g => `${gateName} HARD "${g.name}" FAIL — ${g.detail ?? '(no detail)'}`);
}

/**
 * Assert specific advisory gates pass by gate id.
 * These are "by-construction" advisories guaranteed by AmbientField / --body flag.
 */
function assertAdvisory(gateName, metricsPath, ids) {
  const m = loadJson(metricsPath);
  if (!m) return [`${gateName}: metrics.json not found at ${metricsPath}`];
  const failures = [];
  for (const id of ids) {
    const gate = (m.gates ?? []).find(g => g.id === id);
    if (!gate) {
      failures.push(`${gateName}: advisory gate id=${id} not found in metrics`);
    } else if (!gate.skip && !gate.pass) {
      failures.push(`${gateName} advisory "${gate.name}" FAIL — ${gate.detail ?? '(no detail)'}`);
    }
  }
  return failures;
}

// ── Main ───────────────────────────────────────────────────────────────────────

process.stdout.write(`\n=== scaffold-smoke ===\n`);
process.stdout.write(`  slug=${SLUG}  comp=${COMP_ID}\n`);
process.stdout.write(`  hook=${HOOK_KEY}  body=${BODY_KEY}\n`);
process.stdout.write(`  distinct=true  motifs=${NON_STRIPS_MOTIFS.join(',')}\n`);

let exitCode = 0;
const allFailures = [];

try {
  // 1. Remove any stale leftovers from a prior failed run.
  for (const dir of [VIDEO_DIR, PUBLIC_DIR, OUT_COMP, OUT_SLUG]) {
    if (existsSync(dir)) rmSync(dir, { recursive: true });
  }

  // 2. Snapshot Root.tsx and _registry.md so cleanup can restore them.
  rootTsxSnapshot  = readFileSync(ROOT_TSX, 'utf8');
  registrySnapshot = readFileSync(REGISTRY_MD, 'utf8');

  // ── Pass A: Full gate suite with --distinct (auto-selects non-strips motif) ──

  process.stdout.write('\n=== Pass A: --hook --body --distinct (full gate suite) ===\n');

  // 3. Compute the identity seed from the pre-scaffold registry.
  //    new-video.mjs reads the same registry state, so the seed matches exactly.
  const seed = computeIdentitySeed(registrySnapshot);
  const autoMotif = seed.ambientMotifKey; // what --distinct auto-selected

  process.stdout.write(`  seed: luminance=${seed.luminance} bg=${seed.bg} accent=${seed.accent}\n`);
  process.stdout.write(`  seed: display=${seed.displayFamily} body=${seed.bodyFamily}\n`);
  process.stdout.write(`  seed: arc=${seed.arc} bpm=${seed.bpmBpm} grain=${seed.grainPct}%\n`);
  process.stdout.write(`  seed: ambient=${autoMotif} (auto-selected)\n`);

  // 4. Scaffold with --distinct (generates anti-convergence theme.ts).
  process.stdout.write('\n==> Scaffolding with --distinct...\n');
  const scaffoldOut = execFileSync(
    'node',
    ['scripts/new-video.mjs', SLUG, COMP_ID, `--hook=${HOOK_KEY}`, `--body=${BODY_KEY}`, '--distinct'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] },
  );
  process.stdout.write(scaffoldOut);

  // 5. Append seed-accurate registry entry so distinct.sh completeness + drift gates pass.
  //    Registry entry derives bg/accent/luminance/grain from the same seed as theme.ts,
  //    so registry-axis-drift ΔE94 = 0 and band matches exactly.
  appendSeedRegistryEntry(seed, autoMotif);

  // ── Render-bearing gates ─────────────────────────────────────────────────────

  runGate('scripts/hook.sh', [COMP_ID]);
  runGate('scripts/retention.sh', [COMP_ID, '5', '', `--slug=${SLUG}`]);
  runGate('scripts/motion.sh', [COMP_ID]);
  runGate('scripts/legibility.sh', [COMP_ID]);

  // ── Render-free source gates ─────────────────────────────────────────────────

  runGate('scripts/preflight.sh', [COMP_ID, SLUG]);
  runGate('scripts/distinct.sh', [SLUG]);
  runGate('scripts/code-craft.sh', [COMP_ID, SLUG]);
  runGate('scripts/remotion-correct.sh', [COMP_ID, SLUG]);

  // ── Assertion pass A ─────────────────────────────────────────────────────────

  const passAFailures = [];

  // HARD gates — all must pass.
  passAFailures.push(...assertHard('hook',             `${OUT_COMP}/hook/metrics.json`));
  passAFailures.push(...assertHard('retention',        `${OUT_COMP}/retention/metrics.json`));
  passAFailures.push(...assertHard('motion',           `${OUT_COMP}/motion/metrics.json`));
  passAFailures.push(...assertHard('legibility',       `${OUT_COMP}/legibility/metrics.json`));
  passAFailures.push(...assertHard('preflight',        `${OUT_COMP}/preflight/metrics.json`));
  passAFailures.push(...assertHard('distinct',         `${OUT_SLUG}/distinct/metrics.json`));
  passAFailures.push(...assertHard('code-craft',       `${OUT_COMP}/code-craft/metrics.json`));
  passAFailures.push(...assertHard('remotion-correct', `${OUT_COMP}/remotion-correct/metrics.json`));

  // By-construction advisory gates: hook 4+5 (AmbientField guarantees background-activity
  // + frame-0 liveness pass from frame 0).
  passAFailures.push(...assertAdvisory('hook', `${OUT_COMP}/hook/metrics.json`, [4, 5]));

  if (passAFailures.length > 0) {
    process.stderr.write('\nPass A failures:\n');
    for (const f of passAFailures) process.stderr.write(`  ${f}\n`);
  } else {
    process.stdout.write('\nPass A: all HARD gates + advisory 4+5 PASS\n');
  }
  allFailures.push(...passAFailures);

  // ── Pass B–D: Each non-strips motif — scaffold + hook.sh only ─────────────────

  for (const motif of NON_STRIPS_MOTIFS) {
    process.stdout.write(`\n=== Pass: --ambient=${motif} hook gate ===\n`);

    // Reset filesystem to clean state before each motif run.
    resetToSnapshot();

    // Scaffold with --distinct + explicit ambient override.
    process.stdout.write(`\n==> Scaffolding with --distinct --ambient=${motif}...\n`);
    const motifScaffoldOut = execFileSync(
      'node',
      ['scripts/new-video.mjs', SLUG, COMP_ID, `--hook=${HOOK_KEY}`, `--body=${BODY_KEY}`,
       '--distinct', `--ambient=${motif}`],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] },
    );
    process.stdout.write(motifScaffoldOut);

    // Render hook window and assert liveness + background-activity (advisory 4+5).
    runGate('scripts/hook.sh', [COMP_ID]);

    const motifFailures = [];
    motifFailures.push(...assertHard(`hook[${motif}]`,     `${OUT_COMP}/hook/metrics.json`));
    motifFailures.push(...assertAdvisory(`hook[${motif}]`, `${OUT_COMP}/hook/metrics.json`, [4, 5]));

    if (motifFailures.length > 0) {
      process.stderr.write(`\nPass ${motif} failures:\n`);
      for (const f of motifFailures) process.stderr.write(`  ${f}\n`);
    } else {
      process.stdout.write(`Pass ${motif}: hook HARD gates + advisory 4+5 PASS\n`);
    }
    allFailures.push(...motifFailures);
  }

  // ── Report ────────────────────────────────────────────────────────────────────

  if (allFailures.length > 0) {
    process.stderr.write('\n=== scaffold-smoke FAIL ===\n');
    for (const f of allFailures) process.stderr.write(`  ${f}\n`);
    exitCode = 1;
  } else {
    process.stdout.write('\n=== scaffold-smoke PASS ===\n');
    process.stdout.write('  Pass A: all HARD gates pass on --distinct scaffold.\n');
    process.stdout.write('  Pass A: distinct.sh HARD-passes on genuine identity-seed output.\n');
    process.stdout.write('  Pass A: hook advisory 4+5 (AmbientField) pass.\n');
    process.stdout.write('  Pass A: retention dead-air (HARD, --body by-construction) passes.\n');
    for (const motif of NON_STRIPS_MOTIFS) {
      process.stdout.write(`  Pass ${motif}: hook HARD gates + advisory 4+5 pass.\n`);
    }
    process.stdout.write('  The --hook/--body/--distinct/--ambient scaffold is gate-green in pixels.\n');
  }
} catch (err) {
  process.stderr.write(`\nERROR: ${err.message}\n`);
  exitCode = 1;
} finally {
  cleanup();
}

process.exit(exitCode);
