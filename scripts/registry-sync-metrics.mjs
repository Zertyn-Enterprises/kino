#!/usr/bin/env node
// Registry↔filesystem sync gate — ensures _registry.md stays in sync with src/videos/.
// Render-free: reads treatment.md for status, parses _registry.md, diffs against dirs.
//
// Exported pure function:
//   computeRegistrySync({ videoDirs, registryEntries, candidateSlug, treatmentStatuses })
//     → { missingEntries[], orphanEntries[], candidateResolved, hardGatesPass, gates[] }
//
// HARD gates:
//   1. An APPROVED video (treatment.md has Status: APPROVED) with no _registry.md entry.
//   2. A candidateSlug was passed but does not resolve to a registry entry.
// Advisory:
//   - A registry entry whose slug has no matching src/videos/<slug>/ directory.
// OK (not flagged):
//   - A DRAFT or absent-treatment video with no registry entry.
//
// Usage (CLI):
//   node scripts/registry-sync-metrics.mjs [<slug>] [--registry=<path>] [--json]
//   <slug>           candidate slug to check for registry resolution (optional)
//   --registry=<p>   path to _registry.md (default: src/videos/_registry.md)
//   --json           emit structured JSON instead of human-readable output

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseRegistry } from './distinct-metrics.mjs';

// ── Pure computation ──────────────────────────────────────────────────────────

/**
 * Compute the registry↔filesystem sync verdict.
 *
 * @param {{
 *   videoDirs: string[],
 *   registryEntries: object[],
 *   candidateSlug: string|null,
 *   treatmentStatuses: Map<string, string|null>,
 * }} opts
 *   videoDirs         slugs present under src/videos/ (lowercased)
 *   registryEntries   parsed registry records from parseRegistry()
 *   candidateSlug     slug to check for resolution (null = no check)
 *   treatmentStatuses map of slug → 'APPROVED'|'DRAFT'|null (null = absent treatment)
 *
 * @returns {{
 *   missingEntries: string[],
 *   orphanEntries: string[],
 *   candidateResolved: boolean,
 *   hardGatesPass: boolean,
 *   gates: Array<{ name: string, hard: boolean, advisory: boolean, pass: boolean, skip: boolean, detail: string }>,
 * }}
 */
export function computeRegistrySync({ videoDirs, registryEntries, candidateSlug, treatmentStatuses }) {
  const registrySlugs = new Set(registryEntries.map(r => r.slug));
  const dirSet = new Set(videoDirs.map(s => s.toLowerCase()));

  // HARD: APPROVED videos with no registry entry.
  const missingEntries = videoDirs
    .map(s => s.toLowerCase())
    .filter(slug => treatmentStatuses.get(slug) === 'APPROVED' && !registrySlugs.has(slug));

  // Advisory: registry entries with no matching video directory.
  const orphanEntries = registryEntries
    .map(r => r.slug)
    .filter(slug => !dirSet.has(slug));

  // HARD: candidateSlug not in registry (only checked when candidateSlug is non-null).
  const candidateResolved = candidateSlug == null || registrySlugs.has(candidateSlug.toLowerCase());

  // Gate 1 (HARD): APPROVED videos must have registry entries.
  const missingGate = {
    name: 'HARD: APPROVED videos have registry entries',
    hard: true,
    advisory: false,
    pass: missingEntries.length === 0,
    skip: false,
    detail: missingEntries.length === 0
      ? 'all APPROVED videos have registry entries'
      : `APPROVED video(s) missing registry entry: ${missingEntries.join(', ')} — append to src/videos/_registry.md`,
  };

  // Gate 2 (HARD): candidate slug must resolve.
  const candidateGate = {
    name: 'HARD: candidate slug resolves in registry',
    hard: true,
    advisory: false,
    pass: candidateResolved,
    skip: candidateSlug == null,
    detail: candidateSlug == null
      ? 'no candidate slug specified'
      : candidateResolved
        ? `candidate "${candidateSlug}" found in registry`
        : `candidate "${candidateSlug}" not found in registry — append to src/videos/_registry.md`,
  };

  // Gate 3 (advisory): no orphan registry entries.
  const orphanGate = {
    name: 'Advisory: no orphan registry entries',
    hard: false,
    advisory: true,
    pass: orphanEntries.length === 0,
    skip: false,
    detail: orphanEntries.length === 0
      ? 'no orphan registry entries'
      : `orphan registry entries (no matching src/videos/): ${orphanEntries.join(', ')}`,
  };

  const gates = [missingGate, candidateGate, orphanGate];
  const hardGatesPass = gates
    .filter(g => !g.advisory)
    .every(g => g.skip || g.pass);

  return { missingEntries, orphanEntries, candidateResolved, hardGatesPass, gates };
}

// ── Human-readable output ─────────────────────────────────────────────────────

function printHumanReadable({ missingEntries, orphanEntries, candidateResolved, hardGatesPass, gates }) {
  console.log('\n── Registry sync metrics ───────────────────────────────────');
  for (const g of gates) {
    const status = g.skip ? 'SKIP' : (g.pass ? 'PASS' : 'FAIL');
    const tier   = g.advisory ? ' (advisory)' : ' (HARD)';
    console.log(`  ${g.name.padEnd(44)} ${status}  ${g.detail}${tier}`);
  }
  console.log('─────────────────────────────────────────────────────────────');
  console.log(`HARD GATES: ${hardGatesPass ? 'PASS' : 'FAIL'}\n`);
}

// ── CLI ───────────────────────────────────────────────────────────────────────

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');

  function getFlag(name) {
    const a = args.find(a => a.startsWith(`--${name}=`));
    return a ? a.slice(name.length + 3) : null;
  }

  const registryPath = getFlag('registry') ?? 'src/videos/_registry.md';
  const positional = args.filter(a => !a.startsWith('--'));
  const candidateSlug = getFlag('slug') ?? positional[0] ?? null;

  if (!existsSync(registryPath)) {
    process.stderr.write(`ERROR: registry not found: ${registryPath}\n`);
    process.exit(1);
  }

  const registryText = readFileSync(registryPath, 'utf8');
  const registryEntries = parseRegistry(registryText);

  // Scan src/videos/*/ for video directories.
  const videosDir = 'src/videos';
  let rawDirs = [];
  if (existsSync(videosDir)) {
    rawDirs = readdirSync(videosDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && !d.name.startsWith('_') && !d.name.startsWith('.'))
      .map(d => d.name.toLowerCase());
  }

  // Read treatment status for each video dir.
  const treatmentStatuses = new Map();
  for (const slug of rawDirs) {
    const treatmentPath = join(videosDir, slug, 'treatment.md');
    if (!existsSync(treatmentPath)) {
      treatmentStatuses.set(slug, null);
      continue;
    }
    const text = readFileSync(treatmentPath, 'utf8');
    if (/^Status:\s*APPROVED/m.test(text) || /^##\s*Status:\s*APPROVED/m.test(text)) {
      treatmentStatuses.set(slug, 'APPROVED');
    } else if (/Status:\s*DRAFT/i.test(text)) {
      treatmentStatuses.set(slug, 'DRAFT');
    } else {
      treatmentStatuses.set(slug, null);
    }
  }

  const verdict = computeRegistrySync({
    videoDirs: rawDirs,
    registryEntries,
    candidateSlug,
    treatmentStatuses,
  });

  if (jsonMode) {
    process.stdout.write(JSON.stringify(verdict, null, 2) + '\n');
  } else {
    printHumanReadable(verdict);
  }

  process.exit(verdict.hardGatesPass ? 0 : 1);
}
