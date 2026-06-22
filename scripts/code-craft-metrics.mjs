#!/usr/bin/env node
// Static source-craft analyzer — no render required.
// Scans src/videos/<slug>/scenes/** and src/videos/<slug>/theme.ts for
// four source-level AI-tells the pixel gates cannot see.
//
// Usage:
//   node scripts/code-craft-metrics.mjs <slug> [--json]
//   --json   emit structured JSON verdict instead of human-readable table
//
// Gates (all advisory — see calibration notes):
//   C1-emoji  (advisory): emoji codepoints (U+1F000-U+1FFFF, U+2600-U+26FF) in
//                         string literals in scene/theme files.
//                         Calibration: relay ProofShare.tsx contains 🔥 (U+1F525) in
//                         a mock social-proof comment (@deniz tweet) — intentional
//                         authentic mock UGC, not an AI shortcut. Forces advisory.
//   C1-font   (advisory): system-ui / -apple-system / BlinkMacSystemFont / Segoe UI /
//                         Roboto / Helvetica / Arial / bare sans-serif / serif / Inter
//                         as the PRIMARY (first) fontFamily in scene/theme code.
//                         Calibration: relay NorraSite.tsx uses "system-ui, -apple-system,
//                         sans-serif" as primary to simulate a real browser UI (intentional
//                         mock site design). Forces advisory.
//   C2-hex    (advisory): raw #rgb / #rrggbb / #rrggbbaa literals in scenes/** (theme.ts
//                         allowlisted — that is the correct home for palette hex).
//                         Calibration: both relay and granipa scenes contain raw hex for
//                         mock UI elements (terminal traffic lights #ff5f57/#febc2e/#28c840,
//                         browser chrome #101511, Norra brand product colors, SVG fills).
//                         Distinguishing intentional mock-UI values from theme drift requires
//                         context the static scanner cannot determine. Forces advisory.
//   C3-easing (advisory): interpolate() calls whose options object has no easing: key, and
//                         Easing.linear usage. Advisory by spec design — pixel gate M2 already
//                         covers easing; this is the code-level complement.
//
// Output shape (matches ship-metrics.mjs contract):
//   { hardGatesPass: boolean,
//     gates: [{ name, advisory, pass, skip, detail }],
//     violations: [{ gate, file, line, snippet }] }
//
// hardGatesPass is true iff no non-advisory gate fails.
// Since all four gates are advisory, hardGatesPass is always true when files are found.
// Exit code: 0 when hardGatesPass; non-zero otherwise.

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Emoji detection ──────────────────────────────────────────────────────────
// U+1F000-U+1FFFF: main emoji plane (emoticons, transport, objects, symbols).
// U+2600-U+26FF:   Miscellaneous Symbols (weather, misc pictographs).
// Excludes U+2700-U+27BF (Dingbats) — ✓ (U+2713) and ❯ (U+276F) used in relay
// are typographic symbols, not emoji AI-tells.
const EMOJI_RE = /[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}]/u;

// Matches single- or double-quoted string literals (single-line, no template literals).
// Template literals handled by line-level scan below.
const QUOTED_STRING_RE = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g;

// ── Font detection ───────────────────────────────────────────────────────────
// fontFamily property or JSX attribute — value may be double- or single-quoted.
const FONT_FAMILY_RE = /fontFamily\s*[:=]\s*["']([^"']+)["']/g;

const BAD_FONT_PRIMARIES = [
  'system-ui',
  '-apple-system',
  'blinkmacsystemfont',
  'segoe ui',
  'roboto',
  'helvetica',
  'arial',
  'sans-serif',
  'serif',
  'inter',
];

// ── Hex color detection ──────────────────────────────────────────────────────
// Matches #RGB (3), #RRGGBB (6), #RRGGBBAA (8) — case-insensitive.
// Preceded by a word boundary or punctuation to avoid matching hex in comments.
const HEX_COLOR_RE = /#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Return true if a line is a code comment (trimmed line starts with // or *).
 */
function isCommentLine(line) {
  const t = line.trimStart();
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*');
}

/**
 * Collect all .ts/.tsx/.js/.jsx files under a directory tree.
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
 * Given source content and the index of the opening '(' of an interpolate(...)
 * call, return the full call text up to (and including) the matching ')'.
 * Handles single/double-quoted strings and line comments so parens inside them
 * are not counted.
 *
 * @param {string} content
 * @param {number} openIdx  index of the '(' character
 * @returns {string}
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

// ── Pure gate implementations ─────────────────────────────────────────────────

/**
 * C1-emoji: emoji codepoints in string literals (quoted strings, JSX attributes).
 * @param {{ path: string, content: string }[]} files
 * @returns {{ violations: Array, pass: boolean }}
 */
function checkEmoji(files) {
  const violations = [];
  for (const { path: filePath, content } of files) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (isCommentLine(line)) continue;

      // Check double/single-quoted string literals on this line.
      let m;
      QUOTED_STRING_RE.lastIndex = 0;
      while ((m = QUOTED_STRING_RE.exec(line)) !== null) {
        if (EMOJI_RE.test(m[0])) {
          violations.push({ gate: 'C1-emoji', file: filePath, line: i + 1, snippet: line.trim() });
          break;
        }
      }
    }
  }
  return { violations, pass: violations.length === 0 };
}

/**
 * C1-font: system/default-stack/Inter as PRIMARY fontFamily in scene/theme files.
 * Bare fallbacks at the END of a brand font stack are intentional; only the FIRST
 * (primary) family in the stack is checked.
 * @param {{ path: string, content: string }[]} files
 * @returns {{ violations: Array, pass: boolean }}
 */
function checkFont(files) {
  const violations = [];
  for (const { path: filePath, content } of files) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (isCommentLine(line)) continue;

      let m;
      FONT_FAMILY_RE.lastIndex = 0;
      while ((m = FONT_FAMILY_RE.exec(line)) !== null) {
        const stackValue = m[1];
        // Primary family = first token before the first comma.
        const primary = stackValue.split(',')[0].trim().replace(/^['"]|['"]$/g, '').toLowerCase();
        if (BAD_FONT_PRIMARIES.includes(primary)) {
          violations.push({ gate: 'C1-font', file: filePath, line: i + 1, snippet: line.trim() });
        }
      }
    }
  }
  return { violations, pass: violations.length === 0 };
}

/**
 * C2-hex: raw #rgb / #rrggbb / #rrggbbaa literals in scene files.
 * theme.ts is the correct home for palette hex — only scene files are checked.
 * @param {{ path: string, content: string }[]} sceneFiles  (theme files excluded)
 * @returns {{ violations: Array, pass: boolean }}
 */
function checkHex(sceneFiles) {
  const violations = [];
  for (const { path: filePath, content } of sceneFiles) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (isCommentLine(line)) continue;

      let m;
      HEX_COLOR_RE.lastIndex = 0;
      while ((m = HEX_COLOR_RE.exec(line)) !== null) {
        violations.push({ gate: 'C2-hex', file: filePath, line: i + 1, snippet: line.trim() });
        break; // one violation per line is enough
      }
    }
  }
  return { violations, pass: violations.length === 0 };
}

/**
 * C3-easing: interpolate() without easing: in options, and Easing.linear usage.
 * Uses lightweight paren-balancing to extract each call's full text and checks for
 * an `easing:` key. Named-constant options objects without easing: (e.g. CLAMP =
 * { extrapolateLeft: 'clamp' }) are also flagged since they produce linear easing.
 * @param {{ path: string, content: string }[]} sceneFiles
 * @returns {{ violations: Array, pass: boolean }}
 */
function checkEasing(sceneFiles) {
  const violations = [];
  const EASING_LINEAR_RE = /\bEasing\.linear\b/g;

  for (const { path: filePath, content } of sceneFiles) {
    const lines = content.split('\n');

    // C3b: Easing.linear explicit usage.
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (isCommentLine(line)) continue;
      EASING_LINEAR_RE.lastIndex = 0;
      if (EASING_LINEAR_RE.test(line)) {
        violations.push({ gate: 'C3-easing', file: filePath, line: i + 1, snippet: line.trim() });
      }
    }

    // C3a: interpolate() without easing: in options.
    let pos = 0;
    while (pos < content.length) {
      const idx = content.indexOf('interpolate(', pos);
      if (idx === -1) break;

      // Skip if inside a line comment.
      const lineStart = content.lastIndexOf('\n', idx) + 1;
      const prefix = content.slice(lineStart, idx).trimStart();
      if (prefix.startsWith('//') || prefix.startsWith('*')) {
        pos = idx + 1;
        continue;
      }

      const openParen = idx + 'interpolate'.length; // index of '('
      const callText = extractCallText(content, openParen);

      if (!callText.includes('easing:')) {
        const lineNum = content.slice(0, idx).split('\n').length;
        const lineContent = lines[lineNum - 1] ?? '';
        violations.push({ gate: 'C3-easing', file: filePath, line: lineNum, snippet: lineContent.trim() });
      }

      pos = openParen + callText.length;
    }
  }

  return { violations, pass: violations.length === 0 };
}

// ── Main pure export ──────────────────────────────────────────────────────────

/**
 * Evaluate the four code-craft gates for a set of source files.
 *
 * @param {{ files: Array<{ path: string, content: string }> }} opts
 *   files — source files to scan. Paths containing '/scenes/' are treated as scene
 *   files (scanned by all four gates). Other files (theme.ts, fonts.ts) are scanned
 *   by C1-emoji and C1-font only (not C2-hex or C3-easing).
 *
 * @returns {{
 *   hardGatesPass: boolean,
 *   gates: Array<{ name: string, advisory: boolean, pass: boolean, skip: boolean, detail: string }>,
 *   violations: Array<{ gate: string, file: string, line: number, snippet: string }>
 * }}
 */
export function computeCodeCraftMetrics({ files }) {
  const sceneFiles = files.filter(f => f.path.includes('/scenes/'));
  const allFiles   = files;

  const skip = files.length === 0;

  const SKIP_DETAIL = 'no source files provided';

  // Run checks (no-op if skip)
  const emojiResult  = skip ? { violations: [], pass: true } : checkEmoji(allFiles);
  const fontResult   = skip ? { violations: [], pass: true } : checkFont(allFiles);
  const hexResult    = skip ? { violations: [], pass: true } : checkHex(sceneFiles);
  const easingResult = skip ? { violations: [], pass: true } : checkEasing(sceneFiles);

  const allViolations = [
    ...emojiResult.violations,
    ...fontResult.violations,
    ...hexResult.violations,
    ...easingResult.violations,
  ];

  const gates = [
    {
      name: 'C1-emoji',
      advisory: true,
      pass: emojiResult.pass,
      skip,
      detail: skip
        ? SKIP_DETAIL
        : emojiResult.pass
          ? 'no emoji in string literals'
          : `${emojiResult.violations.length} emoji violation(s) — relay social-proof mock is a documented exception`,
    },
    {
      name: 'C1-font',
      advisory: true,
      pass: fontResult.pass,
      skip,
      detail: skip
        ? SKIP_DETAIL
        : fontResult.pass
          ? 'no system/Inter primary font-family'
          : `${fontResult.violations.length} font violation(s) — relay NorraSite browser-mock is a documented exception`,
    },
    {
      name: 'C2-hex',
      advisory: true,
      pass: hexResult.pass,
      skip,
      detail: skip
        ? SKIP_DETAIL
        : hexResult.pass
          ? 'no raw hex in scene files'
          : `${hexResult.violations.length} raw-hex line(s) — mock UI elements (terminal traffic lights, browser chrome) are documented exceptions`,
    },
    {
      name: 'C3-easing',
      advisory: true,
      pass: easingResult.pass,
      skip,
      detail: skip
        ? SKIP_DETAIL
        : easingResult.pass
          ? 'no linear/absent easing in interpolate calls'
          : `${easingResult.violations.length} linear/absent-easing instance(s)`,
    },
  ];

  const hardGatesPass = gates.filter(g => !g.advisory).every(g => g.skip || g.pass);

  return { hardGatesPass, gates, violations: allViolations };
}

// ── CLI ───────────────────────────────────────────────────────────────────────

function printHumanReadable({ gates, violations }) {
  console.log('\n── Code-craft source metrics ───────────────────────────────');
  for (const g of gates) {
    const status = g.skip ? 'SKIP' : (g.pass ? 'PASS' : 'FAIL');
    const adv    = g.advisory ? ' (advisory)' : '';
    console.log(`${g.name.padEnd(12)} ${status.padEnd(5)} ${g.detail}${adv}`);
  }
  if (violations.length > 0) {
    console.log('\nViolations:');
    for (const v of violations) {
      console.log(`  [${v.gate}] ${v.file}:${v.line}  ${v.snippet}`);
    }
  }
  console.log('───────────────────────────────────────────────────────────\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args     = process.argv.slice(2);
  const jsonMode = args.includes('--json');
  const slug     = args.find(a => !a.startsWith('--'));

  if (!slug) {
    process.stderr.write('Usage: node scripts/code-craft-metrics.mjs <slug> [--json]\n');
    process.exit(1);
  }

  const videoDir = join(process.cwd(), 'src', 'videos', slug);
  if (!existsSync(videoDir)) {
    process.stderr.write(`ERROR: video directory not found: ${videoDir}\n`);
    process.exit(1);
  }

  // Collect all source files: scenes/** + theme/font files at video root.
  const scenesDir = join(videoDir, 'scenes');
  const sceneFilePaths = existsSync(scenesDir) ? collectSourceFiles(scenesDir) : [];
  const rootFilePaths  = collectSourceFiles(videoDir).filter(p => !p.startsWith(scenesDir + '/'));

  const allPaths = [...sceneFilePaths, ...rootFilePaths];
  const files = allPaths.map(p => ({
    path: relative(process.cwd(), p),
    content: readFileSync(p, 'utf8'),
  }));

  const verdict = computeCodeCraftMetrics({ files });

  if (jsonMode) {
    process.stdout.write(JSON.stringify(verdict, null, 2) + '\n');
  } else {
    printHumanReadable(verdict);
  }

  process.exit(verdict.hardGatesPass ? 0 : 1);
}
