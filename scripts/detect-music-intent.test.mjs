/**
 * Unit tests for detectMusicIntent().
 *
 * Uses the real project fixtures (relay, granipa, sereno) — these are the three
 * videos named in the spec and cover all three detection paths:
 *
 *   relay   — MusicBed import in Main.tsx → intent
 *   granipa — MusicBed import in Main.tsx → intent
 *   sereno  — no MusicBed; MANIFEST.md has "## Audio" but body says "No music bed"
 *             with no backtick audio file references → no intent (MUST be false)
 *
 * The function also checks for staticFile("...music...") in Main.tsx and for
 * backtick-formatted audio file paths in MANIFEST.md — those paths are exercised
 * by relay and granipa respectively (relay also has staticFile("relay/music.mp3")).
 */

import { describe, it, expect } from 'vitest';
import { detectMusicIntent } from './detect-music-intent.mjs';

describe('detectMusicIntent — relay', () => {
  it('detects intent: MusicBed import in Main.tsx', () => {
    expect(detectMusicIntent('src/videos/relay/timeline.ts')).toBe(true);
  });
});

describe('detectMusicIntent — granipa', () => {
  it('detects intent: MusicBed import in Main.tsx', () => {
    expect(detectMusicIntent('src/videos/granipa/timeline.ts')).toBe(true);
  });
});

describe('detectMusicIntent — sereno', () => {
  it('returns false: no MusicBed; MANIFEST.md ## Audio section says "No music bed" (no backtick audio ref)', () => {
    expect(detectMusicIntent('src/videos/sereno/timeline.ts')).toBe(false);
  });
});
