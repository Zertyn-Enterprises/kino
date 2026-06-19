import { buildTimeline } from "../../lib/timeline";

/**
 * v3.1 — fast re-cut on generation-v2 candidate-1 (user pick): 122.0 bpm,
 * energy from the first beat, drops at track 16.25s / 39.25s / 47.75s.
 *
 * The track is WINDOWED: MusicBed trims its first 193 frames (6.433s =
 * track beat 13), so video beat 0 is track beat 13 and firstDownbeatSec
 * is 0. The marriage:
 *   video beat 20 (f295, 9.84s) = track's 16.25s drop → gutpunch→reveal cut
 *   video f985 (32.82s)         = track's 39.25s accent → kicker's $0 slam
 *     (kicker.from f885 → KICK_SLAM = 100)
 * 76 beats ≈ 37.4s = 1121f. All hard cuts.
 */
export const granipaTimeline = buildTimeline(
  { fps: 30, bpm: 122, firstDownbeatSec: 0 },
  [
    { id: "hook", beats: 5 },
    { id: "indict", beats: 12 },
    { id: "gutpunch", beats: 3 },
    { id: "reveal", beats: 6 },
    { id: "features", beats: 16 },
    { id: "architecture", beats: 10 },
    { id: "sovereignty", beats: 8 },
    { id: "kicker", beats: 9 },
    { id: "cta", beats: 7 },
  ] as const,
);

/** Frames trimmed off the head of music.mp3 (see MusicBed). */
export const MUSIC_TRIM_FRAMES = 193;
