#!/usr/bin/env node
// Load src/videos/<slug>/timeline.ts via esbuild and print the derived structure
// manifest JSON plus the equivalent gate flag string.
//
// Usage:
//   node scripts/structure.mjs <slug>
//
// Output (stdout):
//   <JSON manifest>
//   <blank line>
//   <flag string>   (e.g. --climax=720 --holds=100:200 --rehook=6)
//                   Empty when no structural roles are declared.
//
// Exit 0 always — this is an information tool, not a gate.

import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Pure: convert a TimelineStructure to the gate flag string
// ---------------------------------------------------------------------------

/**
 * Build the gate flag string from a TimelineStructure object.
 *
 * @param {{ climaxFrame: number|null, holds: [number,number][], rehookSeconds: number|null }} structure
 * @returns {string}  e.g. "--climax=720 --holds=100:200,300:400 --rehook=6"
 *                   Empty string when all fields are null/empty.
 */
export function structureToFlags(structure) {
  const parts = [];
  if (structure.climaxFrame != null) {
    parts.push(`--climax=${structure.climaxFrame}`);
  }
  if (structure.holds.length > 0) {
    const holdsStr = structure.holds.map(([s, e]) => `${s}:${e}`).join(',');
    parts.push(`--holds=${holdsStr}`);
  }
  if (structure.rehookSeconds != null) {
    parts.push(`--rehook=${structure.rehookSeconds}`);
  }
  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Loader: bundle and evaluate a video's timeline.ts via esbuild
// ---------------------------------------------------------------------------

/**
 * Load the derived TimelineStructure for a video slug by bundling its
 * timeline.ts with esbuild (the same transform path used by musicsync-runner).
 *
 * @param {string} slug  e.g. 'relay', 'granipa'
 * @returns {Promise<{ climaxFrame: number|null, holds: [number,number][], rehookSeconds: number|null }>}
 */
export async function loadStructure(slug) {
  const tsPath  = resolve(__dirname, '..', 'src', 'videos', slug, 'timeline.ts');
  const outFile = join(tmpdir(), `structure-${slug}-${process.pid}.cjs`);
  try {
    await build({
      entryPoints: [tsPath],
      bundle:      true,
      format:      'cjs',
      platform:    'node',
      outfile:     outFile,
      logLevel:    'error',
    });
    const req = createRequire(import.meta.url);
    const mod = req(outFile);
    const key = Object.keys(mod).find(
      k => k.endsWith('Timeline') && mod[k] !== null && typeof mod[k] === 'object',
    );
    if (!key) {
      throw new Error(
        `No *Timeline export found in src/videos/${slug}/timeline.ts. ` +
        `Exports: ${Object.keys(mod).join(', ')}`,
      );
    }
    return mod[key].structure;
  } finally {
    try { unlinkSync(outFile); } catch { /* temp file already gone */ }
  }
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const slug = args.find(a => !a.startsWith('--'));

  if (!slug) {
    process.stderr.write('Usage: node scripts/structure.mjs <slug>\n');
    process.exit(1);
  }

  const structure = await loadStructure(slug);
  const flags     = structureToFlags(structure);

  process.stdout.write(JSON.stringify(structure, null, 2) + '\n');
  process.stdout.write('\n' + flags + '\n');
}
