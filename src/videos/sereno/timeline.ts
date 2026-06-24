import { buildTimeline } from "../../lib/timeline";

// 60bpm → 1 beat = 1 s = 30 frames; no music bed; arc-C (ambient, no climax).
export const serenoTimeline = buildTimeline({ fps: 30, bpm: 60 }, [
  { id: "hook",     beats: 4, promise: { text: "focus arrives in seconds", byFrame: 45 } },
  { id: "feature1", beats: 5 },
  { id: "feature2", beats: 5 },
  { id: "cta",      beats: 4, payoff: { text: "Find your flow. Sereno." } },
] as const);
