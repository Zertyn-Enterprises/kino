#!/usr/bin/env node
// WCAG relative-luminance + contrast-ratio gate for a declared video palette.
// Takes explicit resolved hex flags (director-supplied; no theme.ts parsing).
//
// Usage:
//   node scripts/contrast-metrics.mjs \
//     --bg=#.. --surface=#.. --text=#.. --textDim=#.. --accent=#.. [--accentAlt=#..] [--json]
//
// Role-aware floors:
//   text on bg AND text on surface        HARD >=7:1  (body copy floor)
//   textDim on bg AND textDim on surface  HARD >=4.5:1 (secondary / large-text floor)
//   accent / accentAlt on bg              advisory >=4.5:1 (often graphical; never affects exit)
//
// Exit code: 0 iff all HARD pairs pass; non-zero on any HARD FAIL.
// Advisory fails never affect the exit code.
//
// Thresholds calibrated so both shipped videos PASS all HARD gates:
//   relay (bg #0A0E0B surface #131A14 text #F2F5F0 textDim #8FA098 accent #B6F22E accentAlt #E5484D):
//     text-on-bg=17.67:1 PASS  text-on-surface=16.11:1 PASS
//     textDim-on-bg=7.08:1 PASS  textDim-on-surface=6.45:1 PASS
//     accent-on-bg=14.56:1 PASS (advisory)  accentAlt-on-bg=4.97:1 PASS (advisory)
//   granipa (bg #0A0B0E surface #14161D text #F1F2F6 textDim #8E93A3 accent #3D8BFF accentAlt #F4604C):
//     text-on-bg=17.59:1 PASS  text-on-surface=16.15:1 PASS
//     textDim-on-bg=6.42:1 PASS  textDim-on-surface=5.90:1 PASS
//     accent-on-bg=5.94:1 PASS (advisory)  accentAlt-on-bg=6.21:1 PASS (advisory)

import { fileURLToPath } from 'node:url';

const BODY_FLOOR      = 7.0;   // text-on-bg, text-on-surface (HARD)
const SECONDARY_FLOOR = 4.5;   // textDim-on-bg, textDim-on-surface (HARD)
const ACCENT_FLOOR    = 4.5;   // accent/accentAlt-on-bg (advisory only)

/** Parse a hex color string to [r, g, b] (0–255). */
function parseHex(hex) {
  const h = hex.replace('#', '');
  if (h.length !== 6) throw new Error(`Invalid hex color: ${hex}`);
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/** sRGB channel value (0–255) to linear light. */
function toLinear(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance of an [r, g, b] triple (0–255). */
export function relativeLuminance([r, g, b]) {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** WCAG contrast ratio between two hex colors. Always returns a value >=1. */
export function contrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(parseHex(hex1));
  const l2 = relativeLuminance(parseHex(hex2));
  const lighter = Math.max(l1, l2);
  const darker  = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Evaluate all role-aware contrast pairs for a palette.
 * @param {{ bg, surface, text, textDim, accent, accentAlt? }} palette — resolved hex strings
 * @returns {{ hardGatesPass: boolean, pairs: Array }}
 */
export function computeContrastMetrics({ bg, surface, text, textDim, accent, accentAlt }) {
  const pairs = [];

  function addPair(fg, bg_, role, floor, hard) {
    const ratio = contrastRatio(fg, bg_);
    const pass  = ratio >= floor;
    pairs.push({ fg, bg: bg_, role, ratio: +ratio.toFixed(2), floor, hard, pass });
  }

  // HARD pairs — failing any of these blocks the video
  addPair(text,    bg,      'text-on-bg',           BODY_FLOOR,      true);
  addPair(text,    surface, 'text-on-surface',       BODY_FLOOR,      true);
  addPair(textDim, bg,      'textDim-on-bg',         SECONDARY_FLOOR, true);
  addPair(textDim, surface, 'textDim-on-surface',    SECONDARY_FLOOR, true);

  // Advisory pairs — reported but never affect exit code
  addPair(accent,  bg, 'accent-on-bg',    ACCENT_FLOOR, false);
  if (accentAlt) {
    addPair(accentAlt, bg, 'accentAlt-on-bg', ACCENT_FLOOR, false);
  }

  const hardGatesPass = pairs.filter(p => p.hard).every(p => p.pass);
  return { hardGatesPass, pairs };
}

function printHumanReadable({ hardGatesPass, pairs }) {
  console.log('\n── Contrast metrics ────────────────────────────────────────');
  for (const p of pairs) {
    const adv    = p.hard ? '' : '  (advisory)';
    const status = p.pass ? 'PASS' : 'FAIL';
    const ratioStr = `${p.ratio.toFixed(2)}:1`;
    console.log(`${p.role.padEnd(22)}${status}  ratio=${ratioStr.padEnd(8)} floor=${p.floor}:1${adv}`);
  }
  console.log('───────────────────────────────────────────────────────────');
  console.log(`HARD GATES: ${hardGatesPass ? 'PASS' : 'FAIL'}\n`);
}

// CLI — only runs when this file is the entry point, not when imported.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');

  function getFlag(name) {
    const a = args.find(a => a.startsWith(`--${name}=`));
    return a ? a.slice(name.length + 3) : null;
  }

  const bg       = getFlag('bg');
  const surface  = getFlag('surface');
  const text     = getFlag('text');
  const textDim  = getFlag('textDim');
  const accent   = getFlag('accent');
  const accentAlt = getFlag('accentAlt');

  if (!bg || !surface || !text || !textDim || !accent) {
    process.stderr.write(
      'Usage: node scripts/contrast-metrics.mjs --bg=#.. --surface=#.. --text=#.. --textDim=#.. --accent=#.. [--accentAlt=#..] [--json]\n',
    );
    process.exit(1);
  }

  const verdict = computeContrastMetrics({ bg, surface, text, textDim, accent, accentAlt });

  if (jsonMode) {
    process.stdout.write(JSON.stringify(verdict, null, 2) + '\n');
  } else {
    printHumanReadable(verdict);
  }

  process.exit(verdict.hardGatesPass ? 0 : 1);
}
