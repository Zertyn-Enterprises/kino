/**
 * Deterministic human-cadence typing math (no randomness — renders must be
 * stable). Render with string slicing per the official text-animations rule.
 */

/** Count of characters visible at `frame` given per-char reveal frames. */
export const charsVisible = (
  frame: number,
  revealFrames: readonly number[],
): number => {
  let n = 0;
  for (const f of revealFrames) {
    if (frame >= f) n += 1;
  }
  return n;
};

/** Bursts of 2–4 chars with pauses between bursts. */
export const burstSchedule = (
  text: string,
  startFrame: number,
  opts?: { burst?: readonly number[]; pause?: readonly number[] },
): number[] => {
  const burst = opts?.burst ?? [3, 2, 4, 3, 2];
  const pause = opts?.pause ?? [4, 2, 5, 3];
  const frames: number[] = [];
  let frame = startFrame;
  let inBurst = 0;
  let burstIdx = 0;
  let pauseIdx = 0;
  for (let i = 0; i < text.length; i++) {
    frames.push(frame);
    inBurst += 1;
    if (inBurst >= (burst[burstIdx % burst.length] ?? 3)) {
      frame += (pause[pauseIdx % pause.length] ?? 3) + 1;
      pauseIdx += 1;
      burstIdx += 1;
      inBurst = 0;
    } else {
      frame += 1;
    }
  }
  return frames;
};
