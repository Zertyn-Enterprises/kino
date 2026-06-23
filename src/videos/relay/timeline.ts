import { buildTimeline } from "../../lib/timeline";

/**
 * 64 beats @ 120bpm/30fps = 960 frames = 32.0s. Hard cuts only (no
 * transitionAfterBeats): "instant" is the product. Music not yet supplied —
 * bpm assumed; when the real track lands, update bpm/firstDownbeatSec here
 * and every cut, SFX, and pulse re-aligns.
 */
export const relayTimeline = buildTimeline({ fps: 30, bpm: 120 }, [
  { id: "hook", beats: 10, promise: { text: "Queued — waiting for runner", byFrame: 52 } },
  { id: "turn", beats: 6 },
  { id: "reveal", beats: 8 },
  { id: "proofUrls", beats: 8 },
  { id: "proofShare", beats: 8 },
  { id: "proofRollback", beats: 8 },
  { id: "climax", beats: 8, role: "climax" },
  { id: "cta", beats: 8 },
] as const);
