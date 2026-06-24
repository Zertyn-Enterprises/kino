// Render-free music-intent detector for the musicsync gate.
//
// Reads:
//   src/videos/<slug>/Main.tsx       — MusicBed import/JSX or staticFile("...music...")
//   public/<slug>/MANIFEST.md        — backtick-formatted audio file reference
//
// sereno: no MusicBed, MANIFEST says "No music bed" with no backtick audio refs → false.
// relay/granipa: MusicBed import → true.

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join, basename } from 'node:path';

/**
 * Detect music intent from source files, without rendering.
 *
 * Returns true when any of these signals are present:
 *   1. src/videos/<slug>/Main.tsx imports or uses MusicBed
 *   2. src/videos/<slug>/Main.tsx references a music staticFile
 *   3. public/<slug>/MANIFEST.md has a backtick-formatted audio file path
 *      (e.g. `public/relay/music.mp3`). Prose mentions without backticks (e.g.
 *      "No public/sereno/music.mp3") are intentionally ignored.
 *
 * @param {string} timelinePath — path to the video's timeline.ts (relative or absolute)
 * @returns {boolean}
 */
export function detectMusicIntent(timelinePath) {
  const absTimeline  = resolve(process.cwd(), timelinePath);
  const slugDir      = dirname(absTimeline);
  const slug         = basename(slugDir);
  const mainTsxPath  = join(slugDir, 'Main.tsx');
  const manifestPath = resolve(process.cwd(), `public/${slug}/MANIFEST.md`);

  if (existsSync(mainTsxPath)) {
    const source = readFileSync(mainTsxPath, 'utf8');
    if (source.includes('MusicBed') || /staticFile\([^)]*music/i.test(source)) {
      return true;
    }
  }

  if (existsSync(manifestPath)) {
    const manifest = readFileSync(manifestPath, 'utf8');
    // Only backtick-formatted paths count as declared audio assets.
    // sereno's MANIFEST says "No public/sereno/music.mp3" without backticks — no match.
    if (/`[^`]*\.(?:mp3|wav|ogg|flac|aac|m4a)[^`]*`/i.test(manifest)) {
      return true;
    }
  }

  return false;
}
