/**
 * Music bed with ducking, and frame-anchored sound effects.
 * Frame values come from the video's timeline (see timeline.ts).
 */

import { Audio } from "@remotion/media";
import { Sequence, interpolate, useVideoConfig } from "remotion";

export type DuckWindow = {
  /** Composition frame where the duck reaches its level. */
  from: number;
  /** Composition frame where the duck starts releasing. */
  to: number;
  /** Music volume multiplier while ducked (0–1). */
  level: number;
  /** Attack/release length in frames. */
  rampFrames?: number;
};

/**
 * Render at the composition root. Fades and duck windows are given in
 * COMPOSITION frames regardless of `startAtFrame` — translation to
 * audio-local frames happens internally.
 */
export const MusicBed: React.FC<{
  src: string;
  volume?: number;
  fadeInFrames?: number;
  fadeOutFrames?: number;
  ducks?: readonly DuckWindow[];
  /** Frames to skip at the start of the music file. */
  trimBeforeFrames?: number;
  /** Composition frame at which the music starts (aligns the file's beat
   *  grid with the video's — see analyze-music output). */
  startAtFrame?: number;
}> = ({
  src,
  volume = 1,
  fadeInFrames = 0,
  fadeOutFrames = 0,
  ducks = [],
  trimBeforeFrames,
  startAtFrame = 0,
}) => {
  const { durationInFrames } = useVideoConfig();
  const volumeAt = (audioFrame: number): number => {
    const frame = audioFrame + startAtFrame;
    let v = volume;
    if (fadeInFrames > 0) {
      v *= interpolate(
        frame,
        [startAtFrame, startAtFrame + fadeInFrames],
        [0, 1],
        {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        },
      );
    }
    if (fadeOutFrames > 0) {
      v *= interpolate(
        frame,
        [durationInFrames - fadeOutFrames, durationInFrames - 1],
        [1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      );
    }
    for (const duck of ducks) {
      const ramp = duck.rampFrames ?? 6;
      v *= interpolate(
        frame,
        [duck.from - ramp, duck.from, duck.to, duck.to + ramp],
        [1, duck.level, duck.level, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      );
    }
    return Math.min(1, Math.max(0, v));
  };
  const audio = (
    <Audio src={src} volume={volumeAt} trimBefore={trimBeforeFrames} />
  );
  if (startAtFrame > 0) {
    return (
      <Sequence from={startAtFrame} layout="none">
        {audio}
      </Sequence>
    );
  }
  return audio;
};

/** A one-shot sound effect anchored to an absolute composition frame. */
export const Sfx: React.FC<{
  src: string;
  /** Composition frame at which the sound starts. */
  at: number;
  volume?: number;
  /** Cut the sound off after this many frames. */
  durationInFrames?: number;
  /** <1 pitches down (whoosh → impact), >1 up. */
  playbackRate?: number;
}> = ({ src, at, volume = 1, durationInFrames, playbackRate }) => (
  <Sequence from={at} durationInFrames={durationInFrames} layout="none">
    <Audio src={src} volume={volume} playbackRate={playbackRate} />
  </Sequence>
);
