#!/usr/bin/env node
// Derives the hook-window end frame for a Remotion composition.
// Maps CompId → timeline via src/Root.tsx, parses the first scene's beats,
// and applies lib/timeline.ts's exact beatsToFrames formula:
//   Math.round((beats * 60 / bpm) * fps)
// Outputs: last frame index of the hook (beatsToFrames(first_scene) - 1),
//   which matches the --frames="0-N" convention used by hook.sh.
// Exits 0 on success, 1 on failure (caller falls back to 90).

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const compId = process.argv[2];

if (!compId) {
  process.stderr.write('Usage: node scripts/hook-window.mjs <CompId>\n');
  process.exit(1);
}

let rootSrc;
try {
  rootSrc = readFileSync(join(ROOT, 'src/Root.tsx'), 'utf8');
} catch {
  process.stderr.write('hook-window: cannot read src/Root.tsx\n');
  process.exit(1);
}

// Split on <Composition to isolate the block with the matching id
const blocks = rootSrc.split('<Composition');
const block = blocks.find(b => b.includes(`id="${compId}"`));
if (!block) {
  process.stderr.write(`hook-window: no Composition with id="${compId}" in src/Root.tsx\n`);
  process.exit(1);
}

// Extract timeline variable name from durationInFrames={someTimeline.totalDurationInFrames}
const durMatch = block.match(/durationInFrames=\{(\w+)\.totalDurationInFrames\}/);
if (!durMatch) {
  process.stderr.write(`hook-window: Composition "${compId}" has no .totalDurationInFrames binding — cannot derive window\n`);
  process.exit(1);
}
const timelineVar = durMatch[1];

// Find the import statement for that variable
const importMatch = rootSrc.match(
  new RegExp(`import\\s*\\{[^}]*\\b${timelineVar}\\b[^}]*\\}\\s*from\\s*["']([^"']+)["']`)
);
if (!importMatch) {
  process.stderr.write(`hook-window: cannot find import for "${timelineVar}" in src/Root.tsx\n`);
  process.exit(1);
}

let timelinePath = join(ROOT, 'src', importMatch[1]);
if (!timelinePath.endsWith('.ts')) timelinePath += '.ts';

let timelineSrc;
try {
  timelineSrc = readFileSync(timelinePath, 'utf8');
} catch {
  process.stderr.write(`hook-window: cannot read ${timelinePath}\n`);
  process.exit(1);
}

// Parse fps, bpm, and first scene beats from buildTimeline({ fps, bpm }, [{ beats }, ...])
const fpsMatch = timelineSrc.match(/buildTimeline\s*\(\s*\{[^}]*fps\s*:\s*(\d+)/s);
const bpmMatch = timelineSrc.match(/buildTimeline\s*\(\s*\{[^}]*bpm\s*:\s*([\d.]+)/s);
// First scene: first { ... beats: N ... } entry in the scene array
const beatsMatch = timelineSrc.match(/\[\s*\{[^}]*beats\s*:\s*(\d+)/s);

if (!fpsMatch || !bpmMatch || !beatsMatch) {
  process.stderr.write(`hook-window: cannot parse fps/bpm/beats from ${timelinePath}\n`);
  process.exit(1);
}

const fps = parseInt(fpsMatch[1], 10);
const bpm = parseFloat(bpmMatch[1]);
const beats = parseInt(beatsMatch[1], 10);

// Exact formula from lib/timeline.ts beatsToFrames; subtract 1 for end-frame index
const hookEndFrame = Math.round((beats * 60 / bpm) * fps) - 1;
process.stdout.write(`${hookEndFrame}\n`);
