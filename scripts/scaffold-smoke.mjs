#!/usr/bin/env node
// Scaffold-smoke: render-verify the gate-green-by-construction scaffold claim.
// Scaffolds a throwaway --hook/--body video, renders it via render-bearing gate
// scripts, asserts all HARD gates + hook advisory 4+5 + retention dead-air PASS,
// then tears down cleanly in finally (Root.tsx + registry restored, dirs removed).
//
// Usage: node scripts/scaffold-smoke.mjs
//   No arguments. Writes to out/review/ScaffoldSmoke/ and out/review/scaffold-smoke/.
//   Full Chromium renders required — local only, not CI.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
void __filename; // used for is-main guard below

// ── Constants ──────────────────────────────────────────────────────────────────

const SLUG     = 'scaffold-smoke';
const COMP_ID  = 'ScaffoldSmoke';
const HOOK_KEY = 'mid-action-demo';
const BODY_KEY = 'back-loaded-climax';

// Starter palette constants — must match what new-video.mjs writes to theme.ts.
const STARTER_BG     = '#0a0a0f';
const STARTER_ACCENT = '#7effc9';

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

let exitCode = 0;
try {
  // 1. Remove any stale leftovers from a prior failed run.
  for (const dir of [VIDEO_DIR, PUBLIC_DIR, OUT_COMP, OUT_SLUG]) {
    if (existsSync(dir)) rmSync(dir, { recursive: true });
  }

  // 2. Snapshot Root.tsx and _registry.md so cleanup can restore them.
  rootTsxSnapshot  = readFileSync(ROOT_TSX, 'utf8');
  registrySnapshot = readFileSync(REGISTRY_MD, 'utf8');

  // 3. Scaffold the throwaway video (new-video.mjs modifies Root.tsx in-place).
  process.stdout.write('\n==> Scaffolding...\n');
  const scaffoldOut = execFileSync(
    'node',
    ['scripts/new-video.mjs', SLUG, COMP_ID, `--hook=${HOOK_KEY}`, `--body=${BODY_KEY}`],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] },
  );
  process.stdout.write(scaffoldOut);

  // 4. Append _registry.md stub so distinct gate's completeness + drift HARD checks pass.
  //    Derives 5 code-grounded axes from the scaffold's theme.ts values so registry-axis-drift=0.
  //    4 non-derivable axes are TODO(director) tokens — rhythm+moves + transitions token-Jaccard
  //    diverges from all 3 priors (relay/granipa/sereno), giving ≥4 differing axes.
  const existingCount = (registrySnapshot.match(/^## \d+\s*·/gm) ?? []).length;
  const today = new Date().toISOString().slice(0, 10);
  const registryStub = `
## ${existingCount + 1} · ${SLUG} / ${COMP_ID} (${today})

> **Throwaway smoke-test fixture.** Auto-removed by scripts/scaffold-smoke.mjs.

| field           | value                                         |
| --------------- | --------------------------------------------- |
| product         | scaffold-smoke.mjs fixture                    |
| arc             | TODO(director)                                |
| rhythm          | TODO(director)                                |
| luminance       | dark                                          |
| palette         | bg ${STARTER_BG} · accent ${STARTER_ACCENT}   |
| type            | TODO display / TODO body                      |
| signature moves | TODO(director)                                |
| texture         | clean — grain 0%, vignette 0%                 |
| transitions     | TODO(director)                                |
| music           | TODO(director)                                |
`;
  writeFileSync(REGISTRY_MD, registrySnapshot.trimEnd() + '\n' + registryStub);

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

  // ── Assertion pass ───────────────────────────────────────────────────────────

  const failures = [];

  // HARD gates — all must pass.
  failures.push(...assertHard('hook',             `${OUT_COMP}/hook/metrics.json`));
  failures.push(...assertHard('retention',        `${OUT_COMP}/retention/metrics.json`));
  failures.push(...assertHard('motion',           `${OUT_COMP}/motion/metrics.json`));
  failures.push(...assertHard('legibility',       `${OUT_COMP}/legibility/metrics.json`));
  failures.push(...assertHard('preflight',        `${OUT_COMP}/preflight/metrics.json`));
  failures.push(...assertHard('distinct',         `${OUT_SLUG}/distinct/metrics.json`));
  failures.push(...assertHard('code-craft',       `${OUT_COMP}/code-craft/metrics.json`));
  failures.push(...assertHard('remotion-correct', `${OUT_COMP}/remotion-correct/metrics.json`));

  // By-construction advisory gates: hook 4+5 (AmbientField guarantees background-activity
  // + frame-0 liveness pass from frame 0).
  failures.push(...assertAdvisory('hook', `${OUT_COMP}/hook/metrics.json`, [4, 5]));

  // ── Report ────────────────────────────────────────────────────────────────────

  if (failures.length > 0) {
    process.stderr.write('\n=== scaffold-smoke FAIL ===\n');
    for (const f of failures) process.stderr.write(`  ${f}\n`);
    exitCode = 1;
  } else {
    process.stdout.write('\n=== scaffold-smoke PASS ===\n');
    process.stdout.write('  All HARD gates pass.\n');
    process.stdout.write('  Hook advisory 4+5 (AmbientField) pass.\n');
    process.stdout.write('  Retention dead-air (HARD, --body by-construction) passes.\n');
    process.stdout.write('  The --hook/--body scaffold is gate-green in pixels.\n');
  }
} catch (err) {
  process.stderr.write(`\nERROR: ${err.message}\n`);
  exitCode = 1;
} finally {
  cleanup();
}

process.exit(exitCode);
