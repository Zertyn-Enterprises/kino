#!/usr/bin/env node
// Aggregates hook, retention, contrast, motion, and legibility gate verdicts into a single ship verdict.
//
// Usage:
//   node scripts/ship-metrics.mjs <hook-metrics.json> <retention-metrics.json> <contrast-metrics.json> <motion-metrics.json> <legibility-metrics.json> [--json]
//   --json  emit structured JSON verdict instead of human-readable table
//
// shipReady is true iff every gate ran AND every gate's hardGatesPass is true.
// A missing/null gate is a hard blocker. Advisory failures are listed but never block.
//
// Exit code: 0 when shipReady; non-zero otherwise.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Extract advisory failure names from a gate's metrics.json object.
 * Hook/retention/motion/legibility: { gates: [{advisory, pass, skip, name}] }
 * Contrast:                         { pairs: [{hard, pass, role}] }
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

/**
 * Pure computation: evaluate the overall ship verdict from the five gate metrics.
 *
 * @param {{ hook: object|null, retention: object|null, contrast: object|null, motion: object|null, legibility: object|null }} opts
 *   Each field is the parsed metrics.json for that gate, or null if the gate was not run.
 * @returns {{
 *   shipReady: boolean,
 *   gates: {
 *     hook:       { ran: boolean, hardGatesPass: boolean, advisoryFailures: string[], justified: boolean },
 *     retention:  { ran: boolean, hardGatesPass: boolean, advisoryFailures: string[], justified: boolean },
 *     contrast:   { ran: boolean, hardGatesPass: boolean, advisoryFailures: string[], justified: boolean },
 *     motion:     { ran: boolean, hardGatesPass: boolean, advisoryFailures: string[], justified: boolean },
 *     legibility: { ran: boolean, hardGatesPass: boolean, advisoryFailures: string[], justified: boolean },
 *   },
 *   blockers: string[],
 * }}
 */
export function computeShipVerdict({ hook, retention, contrast, motion = null, legibility = null }) {
  const blockers = [];

  function summarize(name, metrics) {
    if (metrics == null) {
      blockers.push(`${name} gate not run`);
      return { ran: false, hardGatesPass: false, advisoryFailures: [], justified: false };
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
    };
  }

  const gates = {
    hook:       summarize('hook', hook),
    retention:  summarize('retention', retention),
    contrast:   summarize('contrast', contrast),
    motion:     summarize('motion', motion),
    legibility: summarize('legibility', legibility),
  };

  const shipReady = blockers.length === 0;
  return { shipReady, gates, blockers };
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
  const { shipReady, gates, blockers } = verdict;
  console.log('\n── Ship verdict ────────────────────────────────────────────');
  for (const [name, g] of Object.entries(gates)) {
    const status = !g.ran ? 'NOT RUN' : (g.hardGatesPass ? 'PASS' : 'FAIL');
    const adv    = g.advisoryFailures.length > 0
      ? `  advisory: [${g.advisoryFailures.join(', ')}]`
      : '';
    console.log(`${name.padEnd(12)} ${status.padEnd(8)}${adv}`);
  }
  if (blockers.length > 0) {
    console.log('\nBlockers:');
    for (const b of blockers) console.log(`  • ${b}`);
  }
  console.log('───────────────────────────────────────────────────────────');
  console.log(`SHIP: ${shipReady ? 'READY' : 'BLOCKED'}\n`);
}

// CLI — only runs when this file is the entry point, not when imported.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args      = process.argv.slice(2);
  const jsonMode  = args.includes('--json');
  const positional = args.filter(a => !a.startsWith('--'));
  const [hookPath, retentionPath, contrastPath, motionPath, legibilityPath] = positional;

  if (!hookPath || !retentionPath || !contrastPath || !motionPath || !legibilityPath) {
    process.stderr.write(
      'Usage: node scripts/ship-metrics.mjs <hook-metrics.json> <retention-metrics.json> <contrast-metrics.json> <motion-metrics.json> <legibility-metrics.json> [--json]\n',
    );
    process.exit(1);
  }

  const hook       = loadMetrics(hookPath);
  const retention  = loadMetrics(retentionPath);
  const contrast   = loadMetrics(contrastPath);
  const motion     = loadMetrics(motionPath);
  const legibility = loadMetrics(legibilityPath);

  const verdict = computeShipVerdict({ hook, retention, contrast, motion, legibility });

  if (jsonMode) {
    process.stdout.write(JSON.stringify(verdict, null, 2) + '\n');
  } else {
    printHumanReadable(verdict);
  }

  process.exit(verdict.shipReady ? 0 : 1);
}
