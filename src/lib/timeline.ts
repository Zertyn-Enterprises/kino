/**
 * The single source of truth for time in a video.
 *
 * Scenes are declared in beats; the timeline converts them to the frame
 * values consumed by <TransitionSeries>, <Sequence from>, and SFX placement.
 * Cut points (transition midpoints) land exactly on the beat grid, and every
 * boundary is computed from the absolute beat position so rounding never
 * accumulates into drift.
 */

export type SpringlessEasing = (t: number) => number;

export type SceneDef<Id extends string = string> = {
  id: Id;
  /** Scene length in beats (cut to cut). */
  beats: number;
  /**
   * Visual transition into the NEXT scene, in beats. The transition overlap
   * is centered on the cut: half plays in this scene, half in the next.
   * Omit for a hard cut.
   */
  transitionAfterBeats?: number;
};

export type SceneTiming = {
  /** First frame of this scene's TransitionSeries.Sequence. */
  from: number;
  /** durationInFrames for this scene's TransitionSeries.Sequence. */
  durationInFrames: number;
  /** Transition into the next scene, in frames. 0 = hard cut. */
  transitionAfterFrames: number;
  /** Absolute frame of the beat-aligned cut that ENDS this scene. */
  cutFrame: number;
};

export type TimelineConfig = {
  fps: number;
  bpm: number;
  /** Seconds into the music file at which the first downbeat lands. */
  firstDownbeatSec?: number;
  /** Composition frame at which the music starts playing. */
  musicStartFrame?: number;
};

export type Timeline<Id extends string = string> = {
  fps: number;
  bpm: number;
  framesPerBeat: number;
  totalDurationInFrames: number;
  order: readonly Id[];
  scenes: Record<Id, SceneTiming>;
  /** Absolute composition frame of a beat on the music grid. */
  beatFrame: (beat: number) => number;
  /** A duration in beats, rounded to frames. */
  beatsToFrames: (beats: number) => number;
  /** Convert an absolute frame to a scene-local frame (for <Sequence from>). */
  toLocal: (id: Id, absoluteFrame: number) => number;
};

export const buildTimeline = <Id extends string>(
  config: TimelineConfig,
  sceneDefs: readonly SceneDef<Id>[],
): Timeline<Id> => {
  const { fps, bpm } = config;
  const firstDownbeatSec = config.firstDownbeatSec ?? 0;
  const musicStartFrame = config.musicStartFrame ?? 0;

  if (fps <= 0 || !Number.isFinite(fps)) {
    throw new Error(`fps must be positive, got ${fps}`);
  }
  if (bpm <= 0 || !Number.isFinite(bpm)) {
    throw new Error(`bpm must be positive, got ${bpm}`);
  }
  if (sceneDefs.length === 0) {
    throw new Error("timeline needs at least one scene");
  }
  const ids = sceneDefs.map((s) => s.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error(`duplicate scene ids: ${ids.join(", ")}`);
  }
  const last = sceneDefs[sceneDefs.length - 1]!;
  if (last.transitionAfterBeats !== undefined) {
    throw new Error(`last scene "${last.id}" cannot have transitionAfterBeats`);
  }
  for (const s of sceneDefs) {
    if (s.beats <= 0) {
      throw new Error(
        `scene "${s.id}" must have positive beats, got ${s.beats}`,
      );
    }
  }

  const beatFrame = (beat: number): number =>
    Math.round((firstDownbeatSec + (beat * 60) / bpm) * fps) + musicStartFrame;
  const beatsToFrames = (beats: number): number =>
    Math.round(((beats * 60) / bpm) * fps);

  // Beat-aligned cut frames, each from the absolute cumulative beat count.
  let cumulativeBeats = 0;
  const cuts = sceneDefs.map((s) => {
    cumulativeBeats += s.beats;
    return beatFrame(cumulativeBeats);
  });

  const transitions = sceneDefs.map((s) =>
    s.transitionAfterBeats === undefined
      ? 0
      : beatsToFrames(s.transitionAfterBeats),
  );

  // TransitionSeries: start[i+1] = start[i] + duration[i] - transition[i].
  // Anchoring each transition's midpoint on its cut frame gives
  // start[i+1] = cut[i] - floor(transition[i] / 2).
  const starts: number[] = [0];
  for (let i = 0; i < sceneDefs.length - 1; i++) {
    starts.push(cuts[i]! - Math.floor(transitions[i]! / 2));
  }
  const durations = sceneDefs.map((_, i) =>
    i < sceneDefs.length - 1
      ? starts[i + 1]! - starts[i]! + transitions[i]!
      : cuts[i]! - starts[i]!,
  );

  sceneDefs.forEach((s, i) => {
    const incoming = i > 0 ? transitions[i - 1]! : 0;
    if (durations[i]! < incoming + transitions[i]!) {
      throw new Error(
        `scene "${s.id}" (${durations[i]} frames) is shorter than its adjacent ` +
          `transitions (${incoming} + ${transitions[i]} frames) — lengthen the ` +
          `scene or shorten the transitions`,
      );
    }
  });

  const scenes = {} as Record<Id, SceneTiming>;
  sceneDefs.forEach((s, i) => {
    scenes[s.id] = {
      from: starts[i]!,
      durationInFrames: durations[i]!,
      transitionAfterFrames: transitions[i]!,
      cutFrame: cuts[i]!,
    };
  });

  return {
    fps,
    bpm,
    framesPerBeat: (60 / bpm) * fps,
    totalDurationInFrames: cuts[cuts.length - 1]!,
    order: ids,
    scenes,
    beatFrame,
    beatsToFrames,
    toLocal: (id, absoluteFrame) => absoluteFrame - scenes[id].from,
  };
};
