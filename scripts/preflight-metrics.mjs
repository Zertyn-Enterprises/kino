#!/usr/bin/env node
// Static preflight structural-integrity analyzer — no render required.
// Checks that a video is correctly wired before any render spend:
//   P1 (HARD): composition registered in src/Root.tsx with correct dims/fps/timeline binding
//   P2 (HARD): required files present in src/videos/<slug>/
//   P3 (advisory): treatment.md contains Status: APPROVED
//   P4 (advisory): theme tokens present; public/<slug>/MANIFEST.md present; storyboard status table present
//
// Usage:
//   node scripts/preflight-metrics.mjs <CompId> <slug> [--json]
//   --json   emit structured JSON verdict instead of human-readable table
//
// Output shape (matches ship-metrics.mjs contract):
//   { hardGatesPass: boolean, gates: [{ name, advisory, pass, skip, detail }] }
//
// hardGatesPass is true iff all non-advisory gates pass (or are skipped).
// Exit code: 0 when hardGatesPass; non-zero otherwise.

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseRegistry } from './distinct-metrics.mjs';
import { computeRegistrySync } from './registry-sync-metrics.mjs';

// ── P1 helpers ────────────────────────────────────────────────────────────────

/**
 * Find the text block for <Composition id="compId" ... /> in Root.tsx text.
 * Scans backward from id="compId" to find <Composition, then forward to find
 * the self-closing /> (tracking JSX expression depth to skip nested braces).
 * @param {string} content  text content of Root.tsx
 * @param {string} compId   composition ID to look for
 * @returns {string|null}   the block text, or null if not found
 */
function findCompositionBlock(content, compId) {
  const idPat = new RegExp(`\\bid\\s*=\\s*["']${compId}["']`);
  const idMatch = idPat.exec(content);
  if (!idMatch) return null;

  const before = content.slice(0, idMatch.index);
  const compStart = before.lastIndexOf('<Composition');
  if (compStart === -1) return null;

  // Scan forward from <Composition to find the closing />, tracking {} depth
  // so that /> inside JSX expression values is not mistaken for the tag close.
  let i = compStart;
  let depth = 0;
  while (i < content.length - 1) {
    const ch = content[i];
    if (ch === '{') { depth++; i++; continue; }
    if (ch === '}') { depth--; i++; continue; }
    if (ch === '/' && content[i + 1] === '>' && depth === 0) {
      return content.slice(compStart, i + 2);
    }
    i++;
  }
  return null;
}

/**
 * Extract a JSX prop value from a Composition block:  propName={value}
 * Returns the raw value string (no surrounding braces), or null if not found.
 * Only handles single-level braces — sufficient for width/height/fps/durationInFrames.
 * @param {string} block
 * @param {string} name
 * @returns {string|null}
 */
function extractJsxProp(block, name) {
  const re = new RegExp(`\\b${name}\\s*=\\s*\\{([^{}]+)\\}`);
  const m = re.exec(block);
  return m ? m[1].trim() : null;
}

// ── Gate implementations ──────────────────────────────────────────────────────

/**
 * P1 (HARD): Composition registered in Root.tsx with correct dims/fps/timeline.
 * @param {{ compId: string, rootTsxContent: string|null }} opts
 * @returns {{ pass: boolean, skip: boolean, detail: string }}
 */
function checkP1({ compId, rootTsxContent }) {
  if (rootTsxContent === null) {
    return { pass: false, skip: false, detail: 'src/Root.tsx not found' };
  }

  const block = findCompositionBlock(rootTsxContent, compId);
  if (!block) {
    return {
      pass: false,
      skip: false,
      detail: `Composition id="${compId}" not registered in Root.tsx`,
    };
  }

  const issues = [];

  const widthVal = extractJsxProp(block, 'width');
  if (widthVal !== '1920') {
    issues.push(`width must be 1920 (found: ${widthVal ?? 'absent'})`);
  }

  const heightVal = extractJsxProp(block, 'height');
  if (heightVal !== '1080') {
    issues.push(`height must be 1080 (found: ${heightVal ?? 'absent'})`);
  }

  // fps: accept literal 30 or a property reference ending in .fps (e.g. timeline.fps)
  const fpsVal = extractJsxProp(block, 'fps');
  if (!fpsVal) {
    issues.push('fps prop not found');
  } else if (fpsVal !== '30' && !/\.fps$/.test(fpsVal)) {
    issues.push(`fps must be 30 or bound to a timeline .fps property (found: ${fpsVal})`);
  }

  // durationInFrames: must NOT be a bare integer literal
  const durVal = extractJsxProp(block, 'durationInFrames');
  if (!durVal) {
    issues.push('durationInFrames prop not found');
  } else if (/^\d+$/.test(durVal)) {
    issues.push(
      `durationInFrames must reference a timeline object, not a hardcoded integer (found: ${durVal})`,
    );
  }

  if (issues.length > 0) {
    return { pass: false, skip: false, detail: issues.join('; ') };
  }

  return {
    pass: true,
    skip: false,
    detail: `Composition "${compId}" registered: 1920×1080, fps 30, durationInFrames bound to timeline`,
  };
}

/**
 * P2 (HARD): Required files present in src/videos/<slug>/.
 * Checks for: treatment.md, storyboard.md, theme.ts, timeline.ts, Main.tsx, non-empty scenes/.
 * @param {{ treatmentContent: string|null, storyboardContent: string|null,
 *           themeContent: string|null, timelineExists: boolean,
 *           mainExists: boolean, scenesNonEmpty: boolean }} opts
 * @returns {{ pass: boolean, skip: boolean, detail: string }}
 */
function checkP2({
  treatmentContent,
  storyboardContent,
  themeContent,
  timelineExists,
  mainExists,
  scenesNonEmpty,
}) {
  const missing = [];
  if (treatmentContent === null)  missing.push('treatment.md');
  if (storyboardContent === null) missing.push('storyboard.md');
  if (themeContent === null)      missing.push('theme.ts');
  if (!timelineExists)            missing.push('timeline.ts');
  if (!mainExists)                missing.push('Main.tsx');
  if (!scenesNonEmpty)            missing.push('scenes/ (empty or absent)');

  if (missing.length > 0) {
    return {
      pass: false,
      skip: false,
      detail: `required files missing: ${missing.join(', ')}`,
    };
  }

  return {
    pass: true,
    skip: false,
    detail: 'all required files present (treatment.md, storyboard.md, theme.ts, timeline.ts, Main.tsx, scenes/)',
  };
}

/**
 * P3 (advisory): treatment.md contains "Status: APPROVED".
 * Warns (not blocks) when Status: DRAFT so preflight can run early.
 * @param {{ treatmentContent: string|null }} opts
 * @returns {{ pass: boolean, skip: boolean, detail: string }}
 */
function checkP3({ treatmentContent }) {
  if (treatmentContent === null) {
    return {
      pass: false,
      skip: false,
      detail: 'treatment.md absent — cannot check approval status',
    };
  }

  if (/^Status:\s*APPROVED/m.test(treatmentContent) ||
      /^##\s*Status:\s*APPROVED/m.test(treatmentContent)) {
    return { pass: true, skip: false, detail: 'treatment.md Status: APPROVED' };
  }

  if (/Status:\s*DRAFT/i.test(treatmentContent)) {
    return {
      pass: false,
      skip: false,
      detail: 'treatment.md Status: DRAFT — get director approval before scene work (advisory)',
    };
  }

  return {
    pass: false,
    skip: false,
    detail: 'treatment.md has no Status: APPROVED marker — add "Status: APPROVED" when ready',
  };
}

/**
 * P4 (advisory): theme tokens, MANIFEST.md, storyboard status table.
 * Three sub-checks bundled as one advisory gate — all must pass for P4:PASS.
 * @param {{ themeContent: string|null, manifestExists: boolean, storyboardContent: string|null }} opts
 * @returns {{ pass: boolean, skip: boolean, detail: string }}
 */
function checkP4({ themeContent, manifestExists, storyboardContent }) {
  const issues = [];

  // theme.ts must export the five required palette tokens
  if (themeContent !== null) {
    const REQUIRED_TOKENS = ['bg', 'surface', 'text', 'textDim', 'accent'];
    const missingTokens = REQUIRED_TOKENS.filter(
      tok => !new RegExp(`\\b${tok}\\s*:`).test(themeContent),
    );
    if (missingTokens.length > 0) {
      issues.push(`theme.ts missing palette tokens: ${missingTokens.join(', ')}`);
    }
  } else {
    issues.push('theme.ts absent — cannot check palette tokens');
  }

  // public/<slug>/MANIFEST.md must exist
  if (!manifestExists) {
    issues.push('public/<slug>/MANIFEST.md not found');
  }

  // storyboard.md must contain the per-scene status table header (a row starting with | #)
  if (storyboardContent !== null) {
    if (!/^\|[\s]*#/m.test(storyboardContent)) {
      issues.push('storyboard.md missing per-scene status table (no "| #" header row)');
    }
  } else {
    issues.push('storyboard.md absent — cannot check status table');
  }

  if (issues.length > 0) {
    return { pass: false, skip: false, detail: issues.join('; ') };
  }

  return {
    pass: true,
    skip: false,
    detail: 'theme tokens present (bg/surface/text/textDim/accent); MANIFEST.md present; storyboard status table present',
  };
}

// ── P5 helpers ────────────────────────────────────────────────────────────────

/**
 * Extract treatment status string from treatment.md content.
 * Returns 'APPROVED' | 'DRAFT' | null.
 * @param {string|null} treatmentContent
 * @returns {'APPROVED'|'DRAFT'|null}
 */
function extractTreatmentStatus(treatmentContent) {
  if (!treatmentContent) return null;
  if (/^Status:\s*APPROVED/m.test(treatmentContent) || /^##\s*Status:\s*APPROVED/m.test(treatmentContent)) {
    return 'APPROVED';
  }
  if (/Status:\s*DRAFT/i.test(treatmentContent)) return 'DRAFT';
  return null;
}

/**
 * P5 (HARD + advisory): Registry↔filesystem sync.
 *   HARD: APPROVED video missing from _registry.md.
 *   Advisory: orphan entries in _registry.md (entries with no matching src/videos/<slug>/).
 * @param {{ slug: string, treatmentContent: string|null, registryText: string|null, allVideoDirs: string[] }} opts
 * @returns {{ hard: object, orphan: object }}
 */
function checkP5({ slug, treatmentContent, registryText, allVideoDirs }) {
  if (registryText == null) {
    const skipped = { pass: false, skip: true, detail: '_registry.md not found — P5 skipped' };
    return { hard: skipped, orphan: skipped };
  }

  const registryEntries = parseRegistry(registryText);
  const treatmentStatus = extractTreatmentStatus(treatmentContent);
  const treatmentStatuses = new Map([[slug.toLowerCase(), treatmentStatus]]);

  // Only check candidateSlug resolution when treatment is APPROVED (DRAFT is OK without entry).
  const candidateSlug = treatmentStatus === 'APPROVED' ? slug : null;

  const sync = computeRegistrySync({
    videoDirs: allVideoDirs,
    registryEntries,
    candidateSlug,
    treatmentStatuses,
  });

  // Hard gate: missing-entry or unresolved-candidate.
  const hardPass = sync.missingEntries.length === 0 && sync.candidateResolved;
  let hardDetail;
  if (!hardPass) {
    if (sync.missingEntries.length > 0) {
      hardDetail = `"${slug}" is APPROVED but missing from _registry.md — append entry before shipping`;
    } else {
      hardDetail = `candidate "${slug}" not found in _registry.md`;
    }
  } else {
    hardDetail = treatmentStatus === 'APPROVED'
      ? `"${slug}" found in _registry.md`
      : `"${slug}" not yet in registry — OK for DRAFT/unapproved treatment`;
  }

  // Advisory gate: orphan entries.
  const orphanDetail = sync.orphanEntries.length === 0
    ? 'no orphan registry entries'
    : `orphan registry entries (no matching src/videos/): ${sync.orphanEntries.join(', ')}`;

  return {
    hard: { pass: hardPass, skip: false, detail: hardDetail },
    orphan: {
      pass: sync.orphanEntries.length === 0,
      skip: false,
      detail: orphanDetail,
    },
  };
}

// ── Main pure export ──────────────────────────────────────────────────────────

/**
 * Evaluate the six preflight gates for a video.
 *
 * @param {{
 *   compId: string,
 *   slug: string,
 *   rootTsxContent: string|null,
 *   treatmentContent: string|null,
 *   storyboardContent: string|null,
 *   themeContent: string|null,
 *   timelineExists: boolean,
 *   mainExists: boolean,
 *   scenesNonEmpty: boolean,
 *   manifestExists: boolean,
 *   registryText: string|null,
 *   allVideoDirs: string[],
 * }} opts
 *
 * @returns {{
 *   hardGatesPass: boolean,
 *   gates: Array<{ name: string, advisory: boolean, pass: boolean, skip: boolean, detail: string }>,
 * }}
 */
export function computePreflightVerdict({
  compId,
  slug,
  rootTsxContent,
  treatmentContent,
  storyboardContent,
  themeContent,
  timelineExists,
  mainExists,
  scenesNonEmpty,
  manifestExists,
  registryText = null,
  allVideoDirs = [],
}) {
  const p1 = checkP1({ compId, rootTsxContent });
  const p2 = checkP2({ treatmentContent, storyboardContent, themeContent, timelineExists, mainExists, scenesNonEmpty });
  const p3 = checkP3({ treatmentContent });
  const p4 = checkP4({ themeContent, manifestExists, storyboardContent });
  const p5 = checkP5({ slug: slug ?? '', treatmentContent, registryText, allVideoDirs });

  const gates = [
    { name: 'P1-registration',    advisory: false, pass: p1.pass, skip: p1.skip, detail: p1.detail },
    { name: 'P2-files',           advisory: false, pass: p2.pass, skip: p2.skip, detail: p2.detail },
    { name: 'P3-approved',        advisory: true,  pass: p3.pass, skip: p3.skip, detail: p3.detail },
    { name: 'P4-metadata',        advisory: true,  pass: p4.pass, skip: p4.skip, detail: p4.detail },
    { name: 'P5-registry-sync',   advisory: false, pass: p5.hard.pass,   skip: p5.hard.skip,   detail: p5.hard.detail },
    { name: 'P5-registry-orphan', advisory: true,  pass: p5.orphan.pass, skip: p5.orphan.skip, detail: p5.orphan.detail },
  ];

  const hardGatesPass = gates
    .filter(g => !g.advisory)
    .every(g => g.skip || g.pass);

  return { hardGatesPass, gates };
}

// ── CLI ───────────────────────────────────────────────────────────────────────

function printHumanReadable({ gates }) {
  console.log('\n── Preflight structural-integrity metrics ───────────────────');
  for (const g of gates) {
    const status = g.skip ? 'SKIP' : (g.pass ? 'PASS' : 'FAIL');
    const tier   = g.advisory ? ' (advisory)' : ' (HARD)';
    console.log(`${g.name.padEnd(18)} ${status.padEnd(5)} ${g.detail}${tier}`);
  }
  console.log('─────────────────────────────────────────────────────────────\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args     = process.argv.slice(2);
  const jsonMode = args.includes('--json');
  const posArgs  = args.filter(a => !a.startsWith('--'));

  const [compId, slug] = posArgs;

  if (!compId || !slug) {
    process.stderr.write('Usage: node scripts/preflight-metrics.mjs <CompId> <slug> [--json]\n');
    process.exit(1);
  }

  const cwd      = process.cwd();
  const videoDir = join(cwd, 'src', 'videos', slug);
  const rootPath = join(cwd, 'src', 'Root.tsx');

  const read = p => (existsSync(p) ? readFileSync(p, 'utf8') : null);

  const rootTsxContent    = read(rootPath);
  const treatmentContent  = read(join(videoDir, 'treatment.md'));
  const storyboardContent = read(join(videoDir, 'storyboard.md'));
  const themeContent      = read(join(videoDir, 'theme.ts'));
  const timelineExists    = existsSync(join(videoDir, 'timeline.ts'));
  const mainExists        = existsSync(join(videoDir, 'Main.tsx'));

  const scenesDir    = join(videoDir, 'scenes');
  const scenesNonEmpty = existsSync(scenesDir) &&
    readdirSync(scenesDir).some(f => !f.startsWith('.'));

  const manifestExists = existsSync(join(cwd, 'public', slug, 'MANIFEST.md'));

  // P5: registry sync — read _registry.md and scan all video dirs.
  const registryPath = join(cwd, 'src', 'videos', '_registry.md');
  const registryText = existsSync(registryPath) ? readFileSync(registryPath, 'utf8') : null;
  const videosDir    = join(cwd, 'src', 'videos');
  const allVideoDirs = existsSync(videosDir)
    ? readdirSync(videosDir, { withFileTypes: true })
        .filter(d => d.isDirectory() && !d.name.startsWith('_') && !d.name.startsWith('.'))
        .map(d => d.name.toLowerCase())
    : [];

  const verdict = computePreflightVerdict({
    compId,
    slug,
    rootTsxContent,
    treatmentContent,
    storyboardContent,
    themeContent,
    timelineExists,
    mainExists,
    scenesNonEmpty,
    manifestExists,
    registryText,
    allVideoDirs,
  });

  if (jsonMode) {
    process.stdout.write(JSON.stringify(verdict, null, 2) + '\n');
  } else {
    printHumanReadable(verdict);
  }

  process.exit(verdict.hardGatesPass ? 0 : 1);
}
