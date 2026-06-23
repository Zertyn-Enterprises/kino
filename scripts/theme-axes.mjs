#!/usr/bin/env node
// Load src/videos/<slug>/theme.ts via esbuild and derive code-grounded
// distinctiveness axes — the 5 palette/type/texture values that live in source
// and can be verified mechanically.
//
// Usage:
//   node scripts/theme-axes.mjs <slug>
//
// Output (stdout, JSON):
//   {
//     bg:          string|null   — palette.bg hex
//     accent:      string|null   — palette.accent hex
//     fonts:       string[]      — unique font families, lowercased, sorted
//     grainPct:    number|null   — texture.grainOpacity * 100
//     luminance:   string        — 'dark'|'tonal'|'light'|'unknown'
//     derivable:   string[]      — axes successfully derived from code
//     nonDerivable:string[]      — axes not in code (registry-declared only)
//   }
//
// Exit 0 always — this is an information tool, not a gate.

import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Luminance helpers ──────────────────────────────────────────────────────────

function toLinear(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** WCAG 2 relative luminance of a hex color (0–1). */
function relativeLuminance(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Classify bg relative luminance.
 *   dark:  Y < 0.05   (near-black, minimal surface detail)
 *   tonal: 0.05 ≤ Y < 0.18 (mid-dark, surfaces and textures visible)
 *   light: Y ≥ 0.18   (clearly light canvas)
 */
export function luminanceClass(hex) {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return 'unknown';
  try {
    const Y = relativeLuminance(hex);
    if (Y >= 0.18) return 'light';
    if (Y >= 0.05) return 'tonal';
    return 'dark';
  } catch {
    return 'unknown';
  }
}

// ── Pure: derive axes from a Theme object ──────────────────────────────────────

const NON_DERIVABLE = ['arc', 'rhythm+moves', 'transitions', 'music-bpm'];

/**
 * Derive code-grounded distinctiveness axes from a Theme object.
 *
 * All 5 derivable axes come from the theme's typed fields — no markdown parsing.
 * The 4 non-derivable axes (arc, rhythm+moves, transitions, music-bpm) remain
 * registry-declared; they appear in nonDerivable as a reminder.
 *
 * @param {object} theme  Theme returned by defineTheme():
 *   .palette.bg, .palette.accent,
 *   .fonts.display.family, .fonts.body.family, .fonts.mono?.family,
 *   .texture.grainOpacity
 * @returns {{ bg, accent, fonts, grainPct, luminance, derivable, nonDerivable }}
 */
export function themeToAxes(theme) {
  const bg     = theme?.palette?.bg     ?? null;
  const accent = theme?.palette?.accent ?? null;

  // Unique font families — lowercased, deduplicated, sorted.
  const fontSet = new Set();
  const addFamily = f => { if (typeof f === 'string' && f.trim()) fontSet.add(f.trim().toLowerCase()); };
  addFamily(theme?.fonts?.display?.family);
  addFamily(theme?.fonts?.body?.family);
  if (theme?.fonts?.mono) addFamily(theme.fonts.mono.family);
  const fonts = [...fontSet].sort();

  // Grain as percentage (0.05 → 5.0).  Round to one decimal to avoid floats.
  const grainRaw = theme?.texture?.grainOpacity;
  const grainPct = typeof grainRaw === 'number' ? Math.round(grainRaw * 1000) / 10 : null;

  const luminance = bg ? luminanceClass(bg) : 'unknown';

  const derivable = [];
  if (bg)                      derivable.push('palette-bg');
  if (accent)                  derivable.push('palette-accent');
  if (luminance !== 'unknown') derivable.push('luminance');
  if (fonts.length > 0)        derivable.push('type');
  if (grainPct != null)        derivable.push('texture');

  return { bg, accent, fonts, grainPct, luminance, derivable, nonDerivable: NON_DERIVABLE };
}

// ── esbuild plugin: stub browser-only APIs that fail in Node.js ───────────────
//
// @remotion/google-fonts/* packages work in Node.js (confirmed) — bundle them
// normally so loadFont() returns the correct fontFamily string.
// Only @remotion/fonts (uses delayRender), remotion (staticFile needs public/),
// and react (createContext/useContext don't need DOM) are stubbed.

function stubRemotionPlugin() {
  return {
    name: 'stub-remotion',
    setup(build) {
      // ── @remotion/fonts and remotion ──────────────────────────────────────
      build.onResolve({ filter: /^(@remotion\/fonts$|remotion$)/ }, args => ({
        path: args.path,
        namespace: 'remotion-stub',
      }));

      build.onLoad({ filter: /.*/, namespace: 'remotion-stub' }, args => {
        if (args.path === '@remotion/fonts') {
          return { contents: 'export const loadFont = () => {};', loader: 'js' };
        }
        if (args.path === 'remotion') {
          return {
            contents: [
              'export const staticFile = p => p;',
              'export const continueRender = () => {};',
              'export const delayRender = () => 0;',
            ].join('\n'),
            loader: 'js',
          };
        }
        return { contents: '', loader: 'js' };
      });

      // ── react (used by src/lib/theme.ts for createContext/useContext) ─────
      build.onResolve({ filter: /^react$/ }, () => ({
        path: 'react',
        namespace: 'react-stub',
      }));

      build.onLoad({ filter: /.*/, namespace: 'react-stub' }, () => ({
        contents: [
          'export const createContext = (def) =>',
          '  ({ _default: def, Provider: () => null, Consumer: () => null });',
          'export const useContext = (ctx) => (ctx ? ctx._default : null);',
        ].join('\n'),
        loader: 'js',
      }));
    },
  };
}

// ── Loader: bundle and evaluate a video's theme.ts via esbuild ────────────────

/**
 * Load the Theme object for a slug by bundling its theme.ts.
 * Remotion and React APIs are stubbed for Node.js evaluation.
 *
 * @param {string} slug  e.g. 'relay', 'granipa'
 * @returns {Promise<object>}  The *Theme export from theme.ts
 */
export async function loadTheme(slug) {
  const tsPath  = resolve(__dirname, '..', 'src', 'videos', slug, 'theme.ts');
  const outFile = join(tmpdir(), `theme-axes-${slug}-${process.pid}.cjs`);

  try {
    await build({
      entryPoints: [tsPath],
      bundle:      true,
      format:      'cjs',
      platform:    'node',
      outfile:     outFile,
      logLevel:    'error',
      plugins:     [stubRemotionPlugin()],
    });

    const req = createRequire(import.meta.url);
    const mod = req(outFile);

    const key = Object.keys(mod).find(
      k => k.endsWith('Theme') && mod[k] !== null && typeof mod[k] === 'object',
    );

    if (!key) {
      throw new Error(
        `No *Theme export found in src/videos/${slug}/theme.ts. ` +
        `Exports: ${Object.keys(mod).join(', ')}`,
      );
    }

    return mod[key];
  } finally {
    try { unlinkSync(outFile); } catch { /* temp file already gone */ }
  }
}

// ── CLI entry point ────────────────────────────────────────────────────────────

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const slug = args.find(a => !a.startsWith('--'));

  if (!slug) {
    process.stderr.write('Usage: node scripts/theme-axes.mjs <slug>\n');
    process.exit(1);
  }

  try {
    const theme = await loadTheme(slug);
    const axes  = themeToAxes(theme);
    process.stdout.write(JSON.stringify(axes, null, 2) + '\n');
  } catch (err) {
    process.stderr.write(`ERROR: ${err.message}\n`);
    // Exit 0 always — info tool.
  }
}
