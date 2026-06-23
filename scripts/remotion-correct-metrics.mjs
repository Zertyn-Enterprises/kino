#!/usr/bin/env node
// Static Remotion-correctness analyzer — no render required.
// Scans src/videos/<slug>/scenes/**, theme.ts, and Main.tsx for render-breaking
// API misuse and advisory correctness smells.
//
// Usage:
//   node scripts/remotion-correct-metrics.mjs <slug> [--json]
//   --json   emit structured JSON verdict instead of human-readable table
//
// Gates:
//   R1-determinism  (HARD): Math.random() / Date.now() / new Date() (argless) /
//                           performance.now() in scanned source.
//                           Fix: use random(seed) from 'remotion'.
//   R2-media        (HARD): raw <img / <video / <audio JSX tags.
//                           Fix: use Img/Video/OffthreadVideo/Audio from 'remotion'.
//   R3-interpolate-clamp (advisory): interpolate(...) whose options omit
//                           extrapolateLeft/Right (overshoot risk).
//   R4-spring-fps   (advisory): spring(...) call whose options lack fps.
//   R5-wallclock    (advisory): setTimeout/setInterval/requestAnimationFrame or
//                           useEffect/useState in scene code.
//
// Output shape (matches ship-metrics / code-craft contract):
//   { hardGatesPass: boolean,
//     gates: [{ name, advisory, pass, skip, detail }],
//     violations: [{ gate, file, line, snippet }] }
//
// hardGatesPass is true iff no R1/R2 violation exists.
// SKIP cleanly when no files are provided (slug has no scene files).
// Exit code: 0 when hardGatesPass; non-zero otherwise.

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// ── R1: Nondeterminism ────────────────────────────────────────────────────────

const R1_PATTERNS = [
  { re: /\bMath\.random\s*\(/g,          label: 'Math.random()' },
  { re: /\bDate\.now\s*\(/g,             label: 'Date.now()' },
  { re: /\bnew\s+Date\s*\(\s*\)/g,       label: 'new Date()' },
  { re: /\bperformance\.now\s*\(/g,      label: 'performance.now()' },
];

// ── R2: Raw media JSX tags ────────────────────────────────────────────────────

// Matches lowercase HTML media opening tags in JSX (not Remotion's Img/Video/Audio).
const R2_PATTERNS = [
  { re: /<img[\s/>`'"]/g,   label: '<img>' },
  { re: /<video[\s/>`'"]/g, label: '<video>' },
  { re: /<audio[\s/>`'"]/g, label: '<audio>' },
];

// ── R3: interpolate without clamp ─────────────────────────────────────────────

// We look for `interpolate(` calls and check if the call text contains
// extrapolateLeft or extrapolateRight. Named constants (e.g. CLAMP spread) are
// NOT resolved — the static scanner cannot see through identifiers, so calls
// using a named reference are flagged as advisory.
const INTERPOLATE_TRIGGER = 'interpolate(';

// ── R4: spring without fps ────────────────────────────────────────────────────

const SPRING_TRIGGER = 'spring(';
const FPS_RE = /\bfps\b/;

// ── R5: wallclock APIs ────────────────────────────────────────────────────────

const R5_RE = /\b(setTimeout|setInterval|requestAnimationFrame|useEffect|useState)\s*[(<]/g;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Return true if a trimmed line starts with a JS line or block comment marker. */
function isCommentLine(line) {
  const t = line.trimStart();
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*');
}

/**
 * Collect all .ts/.tsx files under a directory tree.
 * @param {string} dir  absolute path
 * @returns {string[]}  absolute paths
 */
function collectSourceFiles(dir) {
  const results = [];
  function walk(d) {
    let entries;
    try { entries = readdirSync(d, { withFileTypes: true }); }
    catch { return; }
    for (const e of entries) {
      const full = join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (/\.(tsx?|jsx?)$/.test(e.name)) results.push(full);
    }
  }
  walk(dir);
  return results;
}

/**
 * Given source content and the index of the opening '(' of a call, return the
 * full call text up to (and including) the matching ')'.
 * Handles quoted strings and line comments so parens inside them are not counted.
 */
function extractCallText(content, openIdx) {
  let depth = 0;
  let i = openIdx;
  let inString = false;
  let stringChar = '';
  let inLineComment = false;

  while (i < content.length) {
    const ch = content[i];

    if (inLineComment) {
      if (ch === '\n') inLineComment = false;
      i++;
      continue;
    }

    if (inString) {
      if (ch === '\\') { i += 2; continue; }
      if (ch === stringChar) inString = false;
      i++;
      continue;
    }

    if (ch === '/' && content[i + 1] === '/') {
      inLineComment = true;
      i += 2;
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = true;
      stringChar = ch;
      i++;
      continue;
    }

    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) return content.slice(openIdx, i + 1);
    }

    i++;
  }
  return content.slice(openIdx);
}

// ── Pure gate implementations ──────────────────────────────────────────────────

/**
 * R1-determinism: Math.random / Date.now / new Date() / performance.now in source.
 * @param {{ path: string, content: string }[]} files
 * @returns {{ violations: Array, pass: boolean }}
 */
function checkR1(files) {
  const violations = [];
  for (const { path: filePath, content } of files) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (isCommentLine(line)) continue;
      for (const { re } of R1_PATTERNS) {
        re.lastIndex = 0;
        if (re.test(line)) {
          violations.push({ gate: 'R1-determinism', file: filePath, line: i + 1, snippet: line.trim() });
          break; // one violation per line per gate
        }
      }
    }
  }
  return { violations, pass: violations.length === 0 };
}

/**
 * R2-media: raw <img / <video / <audio JSX tags in source.
 * @param {{ path: string, content: string }[]} files
 * @returns {{ violations: Array, pass: boolean }}
 */
function checkR2(files) {
  const violations = [];
  for (const { path: filePath, content } of files) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (isCommentLine(line)) continue;
      for (const { re } of R2_PATTERNS) {
        re.lastIndex = 0;
        if (re.test(line)) {
          violations.push({ gate: 'R2-media', file: filePath, line: i + 1, snippet: line.trim() });
          break;
        }
      }
    }
  }
  return { violations, pass: violations.length === 0 };
}

/**
 * R3-interpolate-clamp: interpolate() calls whose options lack extrapolateLeft/Right.
 * Uses paren-balancing to capture each full call and checks for the clamp keywords.
 * @param {{ path: string, content: string }[]} files
 * @returns {{ violations: Array, pass: boolean }}
 */
function checkR3(files) {
  const violations = [];

  for (const { path: filePath, content } of files) {
    const lines = content.split('\n');
    let pos = 0;

    while (pos < content.length) {
      const idx = content.indexOf(INTERPOLATE_TRIGGER, pos);
      if (idx === -1) break;

      // Skip if inside a line comment.
      const lineStart = content.lastIndexOf('\n', idx) + 1;
      const prefix = content.slice(lineStart, idx).trimStart();
      if (prefix.startsWith('//') || prefix.startsWith('*')) {
        pos = idx + 1;
        continue;
      }

      const openParen = idx + INTERPOLATE_TRIGGER.length - 1; // index of '('
      const callText = extractCallText(content, openParen);

      // Flag if neither extrapolateLeft nor extrapolateRight appears in the call text.
      if (!callText.includes('extrapolateLeft') && !callText.includes('extrapolateRight')) {
        const lineNum = content.slice(0, idx).split('\n').length;
        const lineContent = lines[lineNum - 1] ?? '';
        violations.push({ gate: 'R3-interpolate-clamp', file: filePath, line: lineNum, snippet: lineContent.trim() });
      }

      pos = openParen + callText.length;
    }
  }

  return { violations, pass: violations.length === 0 };
}

/**
 * R4-spring-fps: spring() calls whose options lack fps.
 * @param {{ path: string, content: string }[]} files
 * @returns {{ violations: Array, pass: boolean }}
 */
function checkR4(files) {
  const violations = [];

  for (const { path: filePath, content } of files) {
    const lines = content.split('\n');
    let pos = 0;

    while (pos < content.length) {
      const idx = content.indexOf(SPRING_TRIGGER, pos);
      if (idx === -1) break;

      // Skip if inside a line comment.
      const lineStart = content.lastIndexOf('\n', idx) + 1;
      const prefix = content.slice(lineStart, idx).trimStart();
      if (prefix.startsWith('//') || prefix.startsWith('*')) {
        pos = idx + 1;
        continue;
      }

      // Also skip if this is `useSpring(` or `springConfig(` or similar — only `spring(`.
      // Check the character just before 'spring(' to ensure it's not a word character.
      if (idx > 0 && /\w/.test(content[idx - 1])) {
        pos = idx + 1;
        continue;
      }

      const openParen = idx + SPRING_TRIGGER.length - 1; // index of '('
      const callText = extractCallText(content, openParen);

      if (!FPS_RE.test(callText)) {
        const lineNum = content.slice(0, idx).split('\n').length;
        const lineContent = lines[lineNum - 1] ?? '';
        violations.push({ gate: 'R4-spring-fps', file: filePath, line: lineNum, snippet: lineContent.trim() });
      }

      pos = openParen + callText.length;
    }
  }

  return { violations, pass: violations.length === 0 };
}

/**
 * R5-wallclock: setTimeout / setInterval / requestAnimationFrame / useEffect /
 * useState in scene files — signals non-frame-driven animation.
 * @param {{ path: string, content: string }[]} files
 * @returns {{ violations: Array, pass: boolean }}
 */
function checkR5(files) {
  const violations = [];

  for (const { path: filePath, content } of files) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (isCommentLine(line)) continue;
      R5_RE.lastIndex = 0;
      if (R5_RE.test(line)) {
        violations.push({ gate: 'R5-wallclock', file: filePath, line: i + 1, snippet: line.trim() });
      }
    }
  }

  return { violations, pass: violations.length === 0 };
}

// ── Main pure export ──────────────────────────────────────────────────────────

/**
 * Evaluate the five Remotion-correctness gates for a set of source files.
 *
 * @param {{ files: Array<{ path: string, content: string }> }} opts
 *   files — source files to scan. Typically scenes/**, theme.ts, Main.tsx.
 *
 * @returns {{
 *   hardGatesPass: boolean,
 *   gates: Array<{ name: string, advisory: boolean, pass: boolean, skip: boolean, detail: string }>,
 *   violations: Array<{ gate: string, file: string, line: number, snippet: string }>
 * }}
 */
export function computeRemotionCorrectMetrics({ files }) {
  const skip = files.length === 0;
  const SKIP_DETAIL = 'no source files provided';

  const r1 = skip ? { violations: [], pass: true } : checkR1(files);
  const r2 = skip ? { violations: [], pass: true } : checkR2(files);
  const r3 = skip ? { violations: [], pass: true } : checkR3(files);
  const r4 = skip ? { violations: [], pass: true } : checkR4(files);
  const r5 = skip ? { violations: [], pass: true } : checkR5(files);

  const gates = [
    {
      name: 'R1-determinism',
      advisory: false,
      pass: r1.pass,
      skip,
      detail: skip
        ? SKIP_DETAIL
        : r1.pass
          ? 'no Math.random/Date.now/new Date()/performance.now in source'
          : `${r1.violations.length} nondeterministic call(s) — use random(seed) from 'remotion'`,
    },
    {
      name: 'R2-media',
      advisory: false,
      pass: r2.pass,
      skip,
      detail: skip
        ? SKIP_DETAIL
        : r2.pass
          ? 'no raw <img>/<video>/<audio> JSX tags'
          : `${r2.violations.length} raw media tag(s) — use Img/Video/OffthreadVideo/Audio from 'remotion'`,
    },
    {
      name: 'R3-interpolate-clamp',
      advisory: true,
      pass: r3.pass,
      skip,
      detail: skip
        ? SKIP_DETAIL
        : r3.pass
          ? 'all interpolate() calls include extrapolateLeft/Right or named clamp reference'
          : `${r3.violations.length} interpolate() call(s) without explicit clamp options (advisory — named CLAMP refs are not resolved)`,
    },
    {
      name: 'R4-spring-fps',
      advisory: true,
      pass: r4.pass,
      skip,
      detail: skip
        ? SKIP_DETAIL
        : r4.pass
          ? 'all spring() calls reference fps'
          : `${r4.violations.length} spring() call(s) without fps in options (advisory — fps may arrive via spread)`,
    },
    {
      name: 'R5-wallclock',
      advisory: true,
      pass: r5.pass,
      skip,
      detail: skip
        ? SKIP_DETAIL
        : r5.pass
          ? 'no wallclock APIs (setTimeout/setInterval/rAF/useEffect/useState) in scene code'
          : `${r5.violations.length} wallclock API usage(s) — prefer frame-driven animation`,
    },
  ];

  // hardGatesPass: true iff all non-advisory gates pass (or are skipped).
  const hardGatesPass = gates
    .filter(g => !g.advisory)
    .every(g => g.skip || g.pass);

  const violations = [
    ...r1.violations,
    ...r2.violations,
    ...r3.violations,
    ...r4.violations,
    ...r5.violations,
  ];

  return { hardGatesPass, gates, violations };
}

// ── CLI ───────────────────────────────────────────────────────────────────────

function printHumanReadable({ gates, violations }) {
  console.log('\n── Remotion-correctness source metrics ─────────────────────');
  for (const g of gates) {
    const status = g.skip ? 'SKIP' : (g.pass ? 'PASS' : 'FAIL');
    const tier   = g.advisory ? ' (advisory)' : ' (HARD)';
    console.log(`${g.name.padEnd(22)} ${status.padEnd(5)} ${g.detail}${tier}`);
  }
  if (violations.length > 0) {
    console.log('\nViolations:');
    for (const v of violations) {
      console.log(`  [${v.gate}] ${v.file}:${v.line}  ${v.snippet}`);
    }
  }
  console.log('─────────────────────────────────────────────────────────────\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args     = process.argv.slice(2);
  const jsonMode = args.includes('--json');
  const slug     = args.find(a => !a.startsWith('--'));

  if (!slug) {
    process.stderr.write('Usage: node scripts/remotion-correct-metrics.mjs <slug> [--json]\n');
    process.exit(1);
  }

  const videoDir = join(process.cwd(), 'src', 'videos', slug);
  if (!existsSync(videoDir)) {
    process.stderr.write(`ERROR: video directory not found: ${videoDir}\n`);
    process.exit(1);
  }

  // Collect scoped files: scenes/**, theme.ts, Main.tsx.
  const scenesDir   = join(videoDir, 'scenes');
  const scenePaths  = existsSync(scenesDir) ? collectSourceFiles(scenesDir) : [];

  const ROOT_TARGETS = ['theme.ts', 'Main.tsx'];
  const rootPaths = ROOT_TARGETS
    .map(name => join(videoDir, name))
    .filter(p => existsSync(p));

  const allPaths = [...scenePaths, ...rootPaths];
  const files = allPaths.map(p => ({
    path: relative(process.cwd(), p),
    content: readFileSync(p, 'utf8'),
  }));

  const verdict = computeRemotionCorrectMetrics({ files });

  if (jsonMode) {
    process.stdout.write(JSON.stringify(verdict, null, 2) + '\n');
  } else {
    printHumanReadable(verdict);
  }

  process.exit(verdict.hardGatesPass ? 0 : 1);
}
