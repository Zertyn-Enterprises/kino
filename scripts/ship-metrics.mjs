#!/usr/bin/env node
// Aggregates hook, retention, contrast, motion, legibility, code-craft, musicsync, payoff, remotion-correct, and distinct gate verdicts into a single ship verdict.
//
// Usage:
//   node scripts/ship-metrics.mjs <hook-metrics.json> <retention-metrics.json> <contrast-metrics.json> <motion-metrics.json> <legibility-metrics.json> <code-craft-metrics.json> [<musicsync-metrics.json>] [<payoff-metrics.json>] [<remotion-correct-metrics.json>] [<distinct-metrics.json>] [--declares-music] [--audio-acknowledged] [--registry-count=N] [--json]
//   --declares-music       Video has an <Audio>/staticFile("<slug>/music...") reference in Main.tsx.
//   --audio-acknowledged   Acknowledges the music coverage-gap (audio unbundled); non-blocking but surfaced.
//   --registry-count=N     Number of entries in _registry.md (distinct skip-na when N < 2).
//   --json                 emit structured JSON verdict instead of human-readable table
//
// shipReady is true iff every gate ran AND every gate's hardGatesPass is true AND
// no unacknowledged coverage-gap exists.
//
// Three coverage states per gate:
//   ran          — produced a real verdict; PASS/FAIL as normal.
//   skip-na      — dimension is not applicable to this video (no music declared; <2 registry entries).
//   coverage-gap — a HARD-gated dimension was needed but not verified; blocks ship unless acknowledged.
//
// Exit code: 0 when shipReady; non-zero otherwise.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildRemediations } from './remediation.mjs';

/**
 * Extract advisory failure names from a gate's metrics.json object.
 * Hook/retention/motion/legibility/codeCraft: { gates: [{advisory, pass, skip, name}] }
 * Contrast:                                   { pairs: [{hard, pass, role}] }
 * @param {object} metrics
 * @returns {string[]}
 */
function extractAdvisoryFailures(metrics) {
  if (Array.isArray(metrics.gates)) {
    return metrics.gates
      .filter(g => g.advisory && !g.pass && !g.skip)
      .map(g => g.name);
  }
  if (Array.isArray(metrics.pairs)) {
    return metrics.pairs
      .filter(p => !p.hard && !p.pass)
      .map(p => p.role);
  }
  return [];
}

/** Returns true when all musicsync gates are in SKIP state (no audio analysis). */
function isMusicSyncAllSkip(metrics) {
  return (
    metrics !== null &&
    Array.isArray(metrics.gates) &&
    metrics.gates.length > 0 &&
    metrics.gates.every(g => g.skip)
  );
}

/**
 * Pure computation: evaluate the overall ship verdict from the ten gate metrics.
 *
 * @param {{
 *   hook: object|null, retention: object|null, contrast: object|null,
 *   motion: object|null, legibility: object|null, codeCraft: object|null,
 *   musicsync: object|null, payoff: object|null, remotionCorrect: object|null,
 *   distinct: object|null,
 *   declaresMusic: boolean,
 *   audioAcknowledged: boolean,
 *   registryEntryCount: number,
 * }} opts
 * @returns {{
 *   shipReady: boolean,
 *   gates: {
 *     [name]: {
 *       ran: boolean, hardGatesPass: boolean, advisoryFailures: string[],
 *       justified: boolean, coverage: 'ran'|'skip-na'|'coverage-gap',
 *     },
 *   },
 *   blockers: string[],
 *   coverageGaps: string[],
 *   remediations: Array<{ gate, symptom, severity, likelyCause, fix, docRef, inspect }>,
 * }}
 */
export function computeShipVerdict({
  hook,
  retention,
  contrast,
  motion = null,
  legibility = null,
  codeCraft = null,
  musicsync = null,
  payoff = null,
  remotionCorrect = null,
  distinct = null,
  declaresMusic = false,
  audioAcknowledged = false,
  registryEntryCount = 0,
}) {
  const blockers = [];
  // Unacknowledged coverage-gap gate names (also added to blockers).
  const coverageGaps = [];

  // ── Helper: summarize a required gate ─────────────────────────────────────
  function summarize(name, metrics) {
    if (metrics == null) {
      blockers.push(`${name} gate not run`);
      coverageGaps.push(name);
      return { ran: false, hardGatesPass: false, advisoryFailures: [], justified: false, coverage: 'coverage-gap' };
    }
    const advisoryFailures = extractAdvisoryFailures(metrics);
    if (!metrics.hardGatesPass) {
      blockers.push(`${name} hard gates failed`);
    }
    return {
      ran: true,
      hardGatesPass: metrics.hardGatesPass,
      advisoryFailures,
      justified: advisoryFailures.length === 0,
      coverage: 'ran',
    };
  }

  // ── Six required base gates ────────────────────────────────────────────────
  const gates = {
    hook:       summarize('hook', hook),
    retention:  summarize('retention', retention),
    contrast:   summarize('contrast', contrast),
    motion:     summarize('motion', motion),
    legibility: summarize('legibility', legibility),
    codeCraft:  summarize('codeCraft', codeCraft),
  };

  // ── musicsync: three-state coverage ───────────────────────────────────────
  // !declaresMusic             → skip-na (N/A, non-blocking)
  // declaresMusic + not-run/SKIP + !audioAcknowledged → coverage-gap (BLOCKS)
  // declaresMusic + not-run/SKIP + audioAcknowledged  → coverage-gap (surfaced, non-blocking)
  // declaresMusic + real verdict                       → ran (PASS/FAIL as normal)
  {
    const notVerified = musicsync === null || isMusicSyncAllSkip(musicsync);
    if (!declaresMusic) {
      gates.musicsync = { ran: false, hardGatesPass: true, advisoryFailures: [], justified: true, coverage: 'skip-na' };
    } else if (notVerified) {
      if (audioAcknowledged) {
        // Acknowledged: surface the gap but do not block ship.
        // coverageGaps is intentionally NOT populated (acknowledged → non-blocking).
        gates.musicsync = { ran: false, hardGatesPass: true, advisoryFailures: [], justified: true, coverage: 'coverage-gap' };
      } else {
        blockers.push('musicsync coverage-gap');
        coverageGaps.push('musicsync');
        gates.musicsync = { ran: false, hardGatesPass: true, advisoryFailures: [], justified: true, coverage: 'coverage-gap' };
      }
    } else {
      gates.musicsync = summarize('musicsync', musicsync);
    }
  }

  // ── payoff: absent metrics → coverage-gap ─────────────────────────────────
  if (payoff === null) {
    blockers.push('payoff coverage-gap');
    coverageGaps.push('payoff');
    gates.payoff = { ran: false, hardGatesPass: true, advisoryFailures: [], justified: true, coverage: 'coverage-gap' };
  } else {
    gates.payoff = summarize('payoff', payoff);
  }

  // ── remotionCorrect: absent metrics → coverage-gap ────────────────────────
  if (remotionCorrect === null) {
    blockers.push('remotionCorrect coverage-gap');
    coverageGaps.push('remotionCorrect');
    gates.remotionCorrect = { ran: false, hardGatesPass: true, advisoryFailures: [], justified: true, coverage: 'coverage-gap' };
  } else {
    gates.remotionCorrect = summarize('remotionCorrect', remotionCorrect);
  }

  // ── distinct: skip-na when <2 registry entries; coverage-gap otherwise ────
  // distinct.skip=true (from metrics) also means <2 entries at runtime → skip-na.
  if (distinct === null) {
    if (registryEntryCount < 2) {
      gates.distinct = { ran: false, hardGatesPass: true, advisoryFailures: [], justified: true, coverage: 'skip-na' };
    } else {
      blockers.push('distinct coverage-gap');
      coverageGaps.push('distinct');
      gates.distinct = { ran: false, hardGatesPass: true, advisoryFailures: [], justified: true, coverage: 'coverage-gap' };
    }
  } else if (distinct.skip === true) {
    // Gate ran but found <2 registry entries → skip-na.
    const raw = summarize('distinct', distinct);
    gates.distinct = { ...raw, coverage: 'skip-na' };
  } else {
    gates.distinct = summarize('distinct', distinct);
  }

  const shipReady = blockers.length === 0;
  const base = { shipReady, gates, blockers, coverageGaps };
  return { ...base, remediations: buildRemediations(base) };
}

/** Load and parse a JSON file; returns null if the path is absent or unreadable. */
function loadMetrics(path) {
  if (!path || !existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function printHumanReadable(verdict) {
  const { shipReady, gates, blockers, remediations, coverageGaps } = verdict;
  console.log('\n── Ship verdict ────────────────────────────────────────────');
  for (const [name, g] of Object.entries(gates)) {
    let status;
    if (g.coverage === 'skip-na') {
      status = 'SKIP-NA ';
    } else if (g.coverage === 'coverage-gap') {
      const acknowledged = !coverageGaps.includes(name);
      status = acknowledged ? 'GAP(ack)' : 'GAP     ';
    } else {
      status = g.hardGatesPass ? 'PASS    ' : 'FAIL    ';
    }
    const adv = g.advisoryFailures.length > 0
      ? `  advisory: [${g.advisoryFailures.join(', ')}]`
      : '';
    console.log(`${name.padEnd(15)} ${status}${adv}`);
  }
  if (blockers.length > 0) {
    console.log('\nBlockers:');
    for (const b of blockers) console.log(`  • ${b}`);
  }
  console.log('───────────────────────────────────────────────────────────');
  const blockedPointer = !shipReady && remediations && remediations.length > 0
    ? ' — see ## How to fix below'
    : '';
  console.log(`SHIP: ${shipReady ? 'READY' : 'BLOCKED'}${blockedPointer}\n`);

  // Surface acknowledged coverage-gaps even though they don't block.
  const acknowledgedGates = Object.entries(gates)
    .filter(([name, g]) => g.coverage === 'coverage-gap' && !coverageGaps.includes(name))
    .map(([name]) => name);
  if (acknowledgedGates.length > 0) {
    console.log('## Acknowledged coverage gaps (non-blocking)\n');
    for (const name of acknowledgedGates) {
      console.log(`  • ${name} — coverage-gap acknowledged; run the gate when audio is available`);
    }
    console.log('');
  }

  if (remediations && remediations.length > 0) {
    console.log('## How to fix\n');
    for (const r of remediations) {
      console.log(`[${r.gate}] ${r.symptom}`);
      console.log(`  → ${r.fix}`);
      console.log(`  ref: ${r.docRef}`);
      console.log(`  inspect: ${r.inspect}`);
      console.log('');
    }
    if (!shipReady) {
      console.log('Fix the items above and re-run `scripts/ship-gate.sh` to clear blockers.\n');
    }
  }
}

// CLI — only runs when this file is the entry point, not when imported.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args         = process.argv.slice(2);
  const jsonMode     = args.includes('--json');
  const declaresMusic    = args.includes('--declares-music');
  const audioAcknowledged = args.includes('--audio-acknowledged');
  const regCountArg  = args.find(a => a.startsWith('--registry-count='));
  const registryEntryCount = regCountArg ? parseInt(regCountArg.split('=')[1], 10) : 0;
  const positional   = args.filter(a => !a.startsWith('--'));
  const [hookPath, retentionPath, contrastPath, motionPath, legibilityPath, codeCraftPath, musicSyncPath, payoffPath, remotionCorrectPath, distinctPath] = positional;

  if (!hookPath || !retentionPath || !contrastPath || !motionPath || !legibilityPath || !codeCraftPath) {
    process.stderr.write(
      'Usage: node scripts/ship-metrics.mjs <hook-metrics.json> <retention-metrics.json> <contrast-metrics.json> <motion-metrics.json> <legibility-metrics.json> <code-craft-metrics.json> [<musicsync-metrics.json>] [<payoff-metrics.json>] [<remotion-correct-metrics.json>] [<distinct-metrics.json>] [--declares-music] [--audio-acknowledged] [--registry-count=N] [--json]\n',
    );
    process.exit(1);
  }

  const hook           = loadMetrics(hookPath);
  const retention      = loadMetrics(retentionPath);
  const contrast       = loadMetrics(contrastPath);
  const motion         = loadMetrics(motionPath);
  const legibility     = loadMetrics(legibilityPath);
  const codeCraft      = loadMetrics(codeCraftPath);
  const musicsync      = loadMetrics(musicSyncPath);
  const payoff         = loadMetrics(payoffPath);
  const remotionCorrect = loadMetrics(remotionCorrectPath);
  const distinct       = loadMetrics(distinctPath);

  const verdict = computeShipVerdict({
    hook, retention, contrast, motion, legibility, codeCraft,
    musicsync, payoff, remotionCorrect, distinct,
    declaresMusic, audioAcknowledged, registryEntryCount,
  });

  if (jsonMode) {
    process.stdout.write(JSON.stringify(verdict, null, 2) + '\n');
  } else {
    printHumanReadable(verdict);
  }

  process.exit(verdict.shipReady ? 0 : 1);
}
