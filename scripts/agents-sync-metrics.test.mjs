/**
 * Unit tests for computeAgentsSync.
 *
 * Fixtures cover:
 *   AS1 (HARD): CLAUDE.md script commands absent from AGENTS.md
 *   AS2 (HARD): Hard-Rule count mismatch / anchor keyword missing
 *   AS3 (HARD): AGENTS.md references a script that does not exist on disk
 *
 * Positive fixture: synced pair passes all three gates.
 *
 * Golden calibration:
 *   real CLAUDE.md + AGENTS.md + actual scripts/ → hardGatesPass: true
 */

import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeAgentsSync } from './agents-sync-metrics.mjs';

const __dirname    = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

// ── Fixture data ─────────────────────────────────────────────────────────────

const CLAUDE_COMMANDS = `
\`\`\`bash
scripts/stills.sh <CompId> <frames...>   # stills
scripts/filmstrip.sh <CompId> [step]     # contact sheets
node scripts/gen-music.mjs <slug>        # music bed
\`\`\`
`;

const AGENTS_COMMANDS_SYNCED = `
- \`scripts/stills.sh <CompId> <frames...>\` — full-res review stills
- \`scripts/filmstrip.sh <CompId> [step]\` — contact sheets
- \`node scripts/gen-music.mjs <slug>\` — music bed
`;

const CLAUDE_RULES = `
1. Never ship a scene you haven't rendered and looked at (stills + filmstrip).
2. All timing flows from the video's \`timeline.ts\` — no hardcoded frames in scenes.
3. Read \`src/videos/_registry.md\` before any new treatment; differ on ≥4 axes.
`;

const AGENTS_RULES_SYNCED = `
1. Never ship a scene you haven't rendered and looked at (stills + filmstrip).
2. All timing flows from the video's \`timeline.ts\` — no hardcoded frames in scenes.
3. Read \`src/videos/_registry.md\` before any new treatment; differ on ≥4 axes.
`;

const SCRIPTS_ON_DISK = new Set(['stills.sh', 'filmstrip.sh', 'gen-music.mjs']);

function makeClaudeMd(commands = CLAUDE_COMMANDS, rules = CLAUDE_RULES) {
  return `# Kino\n\n## Commands\n${commands}\n## Structure\n\nsome text\n\n## Hard rules\n${rules}\n`;
}

function makeAgentsMd(commands = AGENTS_COMMANDS_SYNCED, rules = AGENTS_RULES_SYNCED) {
  return `# AGENTS.md\n\n## Commands\n${commands}\n## Structure\n\nsome text\n\n## Hard rules\n${rules}\n`;
}

function passingOpts() {
  return {
    claudeMdContent: makeClaudeMd(),
    agentsMdContent: makeAgentsMd(),
    scriptsOnDisk: SCRIPTS_ON_DISK,
  };
}

// ── Contract ─────────────────────────────────────────────────────────────────

describe('computeAgentsSync — contract (output shape)', () => {
  const verdict = computeAgentsSync(passingOpts());

  it('has hardGatesPass boolean and gates array', () => {
    expect(typeof verdict.hardGatesPass).toBe('boolean');
    expect(Array.isArray(verdict.gates)).toBe(true);
  });

  it('has exactly 3 gates', () => {
    expect(verdict.gates).toHaveLength(3);
  });

  it('gate names are AS1, AS2, AS3 in order', () => {
    expect(verdict.gates.map(g => g.name)).toEqual([
      'AS1-commands-parity',
      'AS2-hard-rules-parity',
      'AS3-commands-exist',
    ]);
  });

  it('each gate has name, advisory, pass, skip, detail of correct types', () => {
    for (const g of verdict.gates) {
      expect(typeof g.name).toBe('string');
      expect(typeof g.advisory).toBe('boolean');
      expect(typeof g.pass).toBe('boolean');
      expect(typeof g.skip).toBe('boolean');
      expect(typeof g.detail).toBe('string');
    }
  });

  it('all three gates are hard (advisory: false)', () => {
    for (const g of verdict.gates) {
      expect(g.advisory).toBe(false);
    }
  });
});

// ── Positive fixture — all gates pass ────────────────────────────────────────

describe('computeAgentsSync — all gates pass (synced pair)', () => {
  const verdict = computeAgentsSync(passingOpts());

  it('hardGatesPass is true', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('all 3 gates pass', () => {
    expect(verdict.gates.every(g => g.pass)).toBe(true);
  });
});

// ── AS1: command parity ───────────────────────────────────────────────────────

describe('computeAgentsSync — AS1 HARD FAIL: CLAUDE.md command absent from AGENTS.md', () => {
  const agentsMd = makeAgentsMd(
    `\n- \`scripts/stills.sh <CompId>\` — stills\n- \`scripts/filmstrip.sh\` — strips\n`,
  );
  const verdict = computeAgentsSync({
    ...passingOpts(),
    agentsMdContent: agentsMd,
  });

  it('hardGatesPass is false', () => {
    expect(verdict.hardGatesPass).toBe(false);
  });

  it('AS1 fails and names the missing command', () => {
    const g = verdict.gates.find(g => g.name === 'AS1-commands-parity');
    expect(g.pass).toBe(false);
    expect(g.detail).toMatch(/gen-music\.mjs/);
  });

  it('AS2 and AS3 are not affected by the missing command', () => {
    expect(verdict.gates.find(g => g.name === 'AS2-hard-rules-parity').pass).toBe(true);
  });
});

describe('computeAgentsSync — AS1 PASS: commands match (order and wording differ)', () => {
  // AGENTS.md can rephrase; only the script path must appear
  const agentsMd = makeAgentsMd(
    `\n- \`scripts/filmstrip.sh <CompId>\` — any wording here\n` +
    `- \`scripts/stills.sh <CompId> <frames...> --props\` — differently worded\n` +
    `- \`node scripts/gen-music.mjs <slug> "<brief>"\` — music generation\n`,
  );
  const verdict = computeAgentsSync({
    ...passingOpts(),
    agentsMdContent: agentsMd,
  });

  it('AS1 passes even with different ordering/wording', () => {
    expect(verdict.gates.find(g => g.name === 'AS1-commands-parity').pass).toBe(true);
  });

  it('hardGatesPass is true', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });
});

// ── AS2: hard-rule parity ─────────────────────────────────────────────────────

describe('computeAgentsSync — AS2 HARD FAIL: rule count differs', () => {
  const agentsMd = makeAgentsMd(
    AGENTS_COMMANDS_SYNCED,
    `\n1. Never ship a scene you haven't rendered (stills + filmstrip).\n2. All timing flows from \`timeline.ts\`.\n`,
  );
  const verdict = computeAgentsSync({
    ...passingOpts(),
    agentsMdContent: agentsMd,
  });

  it('hardGatesPass is false', () => {
    expect(verdict.hardGatesPass).toBe(false);
  });

  it('AS2 fails with count mismatch', () => {
    const g = verdict.gates.find(g => g.name === 'AS2-hard-rules-parity');
    expect(g.pass).toBe(false);
    expect(g.detail).toMatch(/count differs/);
    expect(g.detail).toMatch(/3/);
    expect(g.detail).toMatch(/2/);
  });
});

describe('computeAgentsSync — AS2 HARD FAIL: anchor keyword missing', () => {
  // AGENTS.md has 3 rules but the 3rd has completely different anchor keywords
  const agentsMd = makeAgentsMd(
    AGENTS_COMMANDS_SYNCED,
    `\n1. Never ship a scene you haven't rendered and looked at (stills + filmstrip).\n` +
    `2. All timing flows from the video's \`timeline.ts\` — no hardcoded frames.\n` +
    `3. Use \`completely-different-invariant.md\` for identity — differ on 4 axes.\n`,
  );
  const verdict = computeAgentsSync({
    ...passingOpts(),
    agentsMdContent: agentsMd,
  });

  it('hardGatesPass is false', () => {
    expect(verdict.hardGatesPass).toBe(false);
  });

  it('AS2 fails and names the unmatched rule', () => {
    const g = verdict.gates.find(g => g.name === 'AS2-hard-rules-parity');
    expect(g.pass).toBe(false);
    // CLAUDE.md rule 3 anchor (src/videos/_registry.md) is missing from AGENTS.md
    expect(g.detail).toMatch(/CLAUDE\.md rule 3/);
  });
});

describe('computeAgentsSync — AS2 PASS: rules may be in different order', () => {
  // AGENTS.md lists the same rules in a different order — still passes
  const agentsMd = makeAgentsMd(
    AGENTS_COMMANDS_SYNCED,
    `\n1. Read \`src/videos/_registry.md\` before any new treatment; differ on ≥4 axes.\n` +
    `2. All timing flows from the video's \`timeline.ts\` — no hardcoded frames in scenes.\n` +
    `3. Never ship a scene you haven't rendered and looked at (stills + filmstrip).\n`,
  );
  const verdict = computeAgentsSync({
    ...passingOpts(),
    agentsMdContent: agentsMd,
  });

  it('AS2 passes when rules are reordered', () => {
    expect(verdict.gates.find(g => g.name === 'AS2-hard-rules-parity').pass).toBe(true);
  });

  it('hardGatesPass is true', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });
});

// ── AS3: commands exist on disk ───────────────────────────────────────────────

describe('computeAgentsSync — AS3 HARD FAIL: AGENTS.md references a non-existent script', () => {
  const agentsMd = makeAgentsMd(
    `\n- \`scripts/stills.sh\` — stills\n` +
    `- \`scripts/filmstrip.sh\` — strips\n` +
    `- \`node scripts/gen-music.mjs\` — music\n` +
    `- \`scripts/ghost-script.sh\` — this does not exist\n`,
  );
  const verdict = computeAgentsSync({
    ...passingOpts(),
    agentsMdContent: agentsMd,
  });

  it('hardGatesPass is false', () => {
    expect(verdict.hardGatesPass).toBe(false);
  });

  it('AS3 fails and names the missing script', () => {
    const g = verdict.gates.find(g => g.name === 'AS3-commands-exist');
    expect(g.pass).toBe(false);
    expect(g.detail).toMatch(/ghost-script\.sh/);
  });

  it('AS1 still passes (stills/filmstrip/gen-music are all in CLAUDE.md)', () => {
    expect(verdict.gates.find(g => g.name === 'AS1-commands-parity').pass).toBe(true);
  });
});

// ── Multiple gates can fail independently ────────────────────────────────────

describe('computeAgentsSync — multiple gates fail', () => {
  const agentsMd = makeAgentsMd(
    // AS1: gen-music.mjs missing; AS3: ghost.sh doesn't exist
    `\n- \`scripts/stills.sh\` — stills\n- \`scripts/ghost.sh\` — ghost\n`,
    // AS2: only 1 rule (CLAUDE.md has 3)
    `\n1. Never ship a scene you haven't rendered.\n`,
  );
  const verdict = computeAgentsSync({
    ...passingOpts(),
    agentsMdContent: agentsMd,
  });

  it('hardGatesPass is false', () => {
    expect(verdict.hardGatesPass).toBe(false);
  });

  it('AS1 fails (gen-music.mjs and filmstrip.sh absent)', () => {
    expect(verdict.gates.find(g => g.name === 'AS1-commands-parity').pass).toBe(false);
  });

  it('AS2 fails (rule count: 3 vs 1)', () => {
    expect(verdict.gates.find(g => g.name === 'AS2-hard-rules-parity').pass).toBe(false);
  });

  it('AS3 fails (ghost.sh not on disk)', () => {
    expect(verdict.gates.find(g => g.name === 'AS3-commands-exist').pass).toBe(false);
  });
});

// ── Golden calibration ────────────────────────────────────────────────────────

describe('computeAgentsSync — golden calibration (real CLAUDE.md + AGENTS.md)', () => {
  const claudeMdContent = readFileSync(join(PROJECT_ROOT, 'CLAUDE.md'), 'utf8');
  const agentsMdContent = readFileSync(join(PROJECT_ROOT, 'AGENTS.md'), 'utf8');
  const scriptsDir      = join(PROJECT_ROOT, 'scripts');
  const scriptsOnDisk   = existsSync(scriptsDir)
    ? new Set(readdirSync(scriptsDir))
    : new Set();

  const verdict = computeAgentsSync({ claudeMdContent, agentsMdContent, scriptsOnDisk });

  it('hardGatesPass is true (CLAUDE.md + AGENTS.md are in sync)', () => {
    expect(verdict.hardGatesPass).toBe(true);
  });

  it('AS1 passes — all CLAUDE.md script commands present in AGENTS.md', () => {
    expect(verdict.gates.find(g => g.name === 'AS1-commands-parity').pass).toBe(true);
  });

  it('AS2 passes — Hard-Rule SET matches', () => {
    expect(verdict.gates.find(g => g.name === 'AS2-hard-rules-parity').pass).toBe(true);
  });

  it('AS3 passes — all AGENTS.md script commands exist on disk', () => {
    expect(verdict.gates.find(g => g.name === 'AS3-commands-exist').pass).toBe(true);
  });

  it('3 gates returned', () => {
    expect(verdict.gates).toHaveLength(3);
  });
});
