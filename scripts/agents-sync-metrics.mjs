#!/usr/bin/env node
// Semantic parity gate — CLAUDE.md is the source of truth; AGENTS.md must match.
// Fails loud (non-zero exit) when:
//   AS1 (HARD): a scripts/*.sh or node scripts/*.mjs command in CLAUDE.md Commands
//               is absent from AGENTS.md Commands (semantic, not byte-diff).
//   AS2 (HARD): the Hard-Rule SET differs (count + each rule's anchor keywords
//               must appear in the other file's hard-rules section).
//   AS3 (HARD): a command in AGENTS.md Commands references a script that does not
//               exist on disk.
//
// Usage:
//   node scripts/agents-sync-metrics.mjs [--json]
//   --json   emit structured JSON verdict instead of human-readable table
//
// Output shape (matches ship-metrics.mjs contract):
//   { hardGatesPass: boolean, gates: [{ name, advisory, pass, skip, detail }] }

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Parsing helpers ────────────────────────────────────────────────────────────

/**
 * Extract the text of a named markdown section (## heading to next ## or EOF).
 * @param {string} content
 * @param {string} heading  exact heading text, e.g. 'Commands'
 * @returns {string}
 */
function extractSection(content, heading) {
  const re = new RegExp(`^##\\s+${heading}\\s*$`, 'm');
  const start = re.exec(content);
  if (!start) return '';
  const afterStart = content.slice(start.index + start[0].length);
  const next = /^##\s/m.exec(afterStart);
  return next ? afterStart.slice(0, next.index) : afterStart;
}

/**
 * Extract all script paths (scripts/*.sh and scripts/*.mjs) mentioned in text.
 * Matches `scripts/<name>.(sh|mjs)` but not globs or other extensions.
 * @param {string} text
 * @returns {Set<string>}
 */
function extractScriptPaths(text) {
  const paths = new Set();
  for (const m of text.matchAll(/scripts\/[\w-]+\.(?:sh|mjs)/g)) {
    paths.add(m[0]);
  }
  return paths;
}

/**
 * Extract numbered hard rules from a section.
 * Multi-line rules are joined; accumulation stops at a blank line.
 * @param {string} section
 * @returns {string[]}
 */
function extractRules(section) {
  const rules = [];
  let current = null;
  let prevWasBlank = false;
  for (const line of section.split('\n')) {
    const m = /^\s*(\d+)\.\s+(.+)/.exec(line);
    if (m) {
      if (current !== null) rules.push(current);
      current = m[2].trim();
      prevWasBlank = false;
    } else if (current !== null && !prevWasBlank) {
      const trimmed = line.trim();
      if (trimmed) {
        current += ' ' + trimmed;
      } else {
        prevWasBlank = true;
      }
    }
  }
  if (current !== null) rules.push(current);
  return rules;
}

/**
 * Extract anchor keywords from a rule.
 * Priority: backtick-quoted tokens. Fallback: words with alpha-length ≥ 8.
 * @param {string} rule
 * @returns {string[]}
 */
function extractAnchors(rule) {
  const backticks = [...rule.matchAll(/`([^`]+)`/g)].map(m => m[1]);
  if (backticks.length > 0) return backticks;
  return rule.split(/\s+/).filter(w => w.replace(/[^a-zA-Z]/g, '').length >= 8);
}

// ── Gate implementations ──────────────────────────────────────────────────────

/**
 * AS1 (HARD): every scripts/*.sh + node scripts/*.mjs in CLAUDE.md Commands
 * must appear in AGENTS.md Commands.
 * @param {{ claudeCommands: string, agentsCommands: string }} opts
 * @returns {{ pass: boolean, skip: boolean, detail: string }}
 */
function checkAS1({ claudeCommands, agentsCommands }) {
  const claudePaths = extractScriptPaths(claudeCommands);
  const agentsPaths = extractScriptPaths(agentsCommands);

  const missing = [...claudePaths].filter(p => !agentsPaths.has(p)).sort();
  if (missing.length > 0) {
    return {
      pass: false,
      skip: false,
      detail: `CLAUDE.md commands absent from AGENTS.md: ${missing.join(', ')}`,
    };
  }

  return {
    pass: true,
    skip: false,
    detail: `all ${claudePaths.size} CLAUDE.md script commands present in AGENTS.md`,
  };
}

/**
 * AS2 (HARD): Hard-Rule SET matches — same count, and each rule's anchor
 * keywords must appear somewhere in the other file's rules section.
 * @param {{ claudeRulesSection: string, agentsRulesSection: string }} opts
 * @returns {{ pass: boolean, skip: boolean, detail: string }}
 */
function checkAS2({ claudeRulesSection, agentsRulesSection }) {
  const claudeRules = extractRules(claudeRulesSection);
  const agentsRules = extractRules(agentsRulesSection);

  if (claudeRules.length !== agentsRules.length) {
    return {
      pass: false,
      skip: false,
      detail: `Hard-Rule count differs: CLAUDE.md has ${claudeRules.length}, AGENTS.md has ${agentsRules.length}`,
    };
  }

  const issues = [];

  for (let i = 0; i < claudeRules.length; i++) {
    const anchors = extractAnchors(claudeRules[i]);
    if (!anchors.some(a => agentsRulesSection.includes(a))) {
      issues.push(
        `CLAUDE.md rule ${i + 1} anchor not found in AGENTS.md ("${claudeRules[i].slice(0, 60)}…")`,
      );
    }
  }

  for (let i = 0; i < agentsRules.length; i++) {
    const anchors = extractAnchors(agentsRules[i]);
    if (!anchors.some(a => claudeRulesSection.includes(a))) {
      issues.push(
        `AGENTS.md rule ${i + 1} anchor not found in CLAUDE.md ("${agentsRules[i].slice(0, 60)}…")`,
      );
    }
  }

  if (issues.length > 0) {
    return { pass: false, skip: false, detail: issues.join('; ') };
  }

  return {
    pass: true,
    skip: false,
    detail: `Hard-Rule SET matches: ${claudeRules.length} rules, all anchor keywords cross-verified`,
  };
}

/**
 * AS3 (HARD): every scripts/*.sh and scripts/*.mjs referenced in AGENTS.md
 * Commands must exist on disk.
 * @param {{ agentsCommands: string, scriptsOnDisk: Set<string> }} opts
 * @returns {{ pass: boolean, skip: boolean, detail: string }}
 */
function checkAS3({ agentsCommands, scriptsOnDisk }) {
  const paths = extractScriptPaths(agentsCommands);
  const missing = [...paths]
    .filter(p => !scriptsOnDisk.has(p.replace('scripts/', '')))
    .sort();

  if (missing.length > 0) {
    return {
      pass: false,
      skip: false,
      detail: `AGENTS.md commands not on disk: ${missing.join(', ')}`,
    };
  }

  return {
    pass: true,
    skip: false,
    detail: `all ${paths.size} AGENTS.md script commands exist on disk`,
  };
}

// ── Main pure export ──────────────────────────────────────────────────────────

/**
 * Evaluate CLAUDE.md ↔ AGENTS.md semantic parity.
 *
 * @param {{
 *   claudeMdContent: string,
 *   agentsMdContent: string,
 *   scriptsOnDisk: Set<string>,  // basenames only: 'preflight.sh', 'new-video.mjs', …
 * }} opts
 *
 * @returns {{
 *   hardGatesPass: boolean,
 *   gates: Array<{ name: string, advisory: boolean, pass: boolean, skip: boolean, detail: string }>,
 * }}
 */
export function computeAgentsSync({ claudeMdContent, agentsMdContent, scriptsOnDisk }) {
  const claudeCommands     = extractSection(claudeMdContent, 'Commands');
  const agentsCommands     = extractSection(agentsMdContent, 'Commands');
  const claudeRulesSection = extractSection(claudeMdContent, 'Hard rules');
  const agentsRulesSection = extractSection(agentsMdContent, 'Hard rules');

  const as1 = checkAS1({ claudeCommands, agentsCommands });
  const as2 = checkAS2({ claudeRulesSection, agentsRulesSection });
  const as3 = checkAS3({ agentsCommands, scriptsOnDisk });

  const gates = [
    { name: 'AS1-commands-parity', advisory: false, pass: as1.pass, skip: as1.skip, detail: as1.detail },
    { name: 'AS2-hard-rules-parity', advisory: false, pass: as2.pass, skip: as2.skip, detail: as2.detail },
    { name: 'AS3-commands-exist',    advisory: false, pass: as3.pass, skip: as3.skip, detail: as3.detail },
  ];

  const hardGatesPass = gates.every(g => g.skip || g.pass);

  return { hardGatesPass, gates };
}

// ── CLI ───────────────────────────────────────────────────────────────────────

function printHumanReadable({ gates }) {
  console.log('\n── Agents-sync parity metrics ──────────────────────────────');
  for (const g of gates) {
    const status = g.skip ? 'SKIP' : g.pass ? 'PASS' : 'FAIL';
    const tier   = g.advisory ? ' (advisory)' : ' (HARD)';
    console.log(`${g.name.padEnd(22)} ${status.padEnd(5)} ${g.detail}${tier}`);
  }
  console.log('─────────────────────────────────────────────────────────────\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args     = process.argv.slice(2);
  const jsonMode = args.includes('--json');

  const cwd         = process.cwd();
  const claudeMdPath = join(cwd, 'CLAUDE.md');
  const agentsMdPath = join(cwd, 'AGENTS.md');
  const scriptsDir   = join(cwd, 'scripts');

  if (!existsSync(claudeMdPath)) {
    process.stderr.write('ERROR: CLAUDE.md not found in cwd\n');
    process.exit(1);
  }
  if (!existsSync(agentsMdPath)) {
    process.stderr.write('ERROR: AGENTS.md not found in cwd\n');
    process.exit(1);
  }

  const claudeMdContent = readFileSync(claudeMdPath, 'utf8');
  const agentsMdContent = readFileSync(agentsMdPath, 'utf8');
  const scriptsOnDisk   = existsSync(scriptsDir)
    ? new Set(readdirSync(scriptsDir))
    : new Set();

  const verdict = computeAgentsSync({ claudeMdContent, agentsMdContent, scriptsOnDisk });

  if (jsonMode) {
    process.stdout.write(JSON.stringify(verdict, null, 2) + '\n');
  } else {
    printHumanReadable(verdict);
  }

  process.exit(verdict.hardGatesPass ? 0 : 1);
}
