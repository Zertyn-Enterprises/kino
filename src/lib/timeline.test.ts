import { describe, expect, it } from "vitest";
import { buildTimeline } from "./timeline";

describe("beat grid", () => {
  it("maps beats to frames at 120bpm/30fps", () => {
    const t = buildTimeline({ fps: 30, bpm: 120 }, [{ id: "a", beats: 8 }]);
    expect(t.framesPerBeat).toBe(15);
    expect(t.beatFrame(0)).toBe(0);
    expect(t.beatFrame(4)).toBe(60);
    expect(t.totalDurationInFrames).toBe(120);
  });

  it("has no cumulative drift at awkward bpm", () => {
    const t = buildTimeline({ fps: 30, bpm: 97 }, [{ id: "a", beats: 400 }]);
    for (const beat of [1, 50, 100, 200, 400]) {
      const ideal = ((beat * 60) / 97) * 30;
      expect(Math.abs(t.beatFrame(beat) - ideal)).toBeLessThanOrEqual(0.5);
    }
  });

  it("applies downbeat offset and music start frame", () => {
    const t = buildTimeline(
      { fps: 30, bpm: 120, firstDownbeatSec: 0.5, musicStartFrame: 10 },
      [{ id: "a", beats: 4 }],
    );
    // 0.5s offset = 15 frames, plus musicStartFrame 10.
    expect(t.beatFrame(0)).toBe(25);
    expect(t.beatFrame(4)).toBe(85);
  });
});

describe("scenes without transitions", () => {
  it("produces gapless, overlap-free, beat-aligned sequences", () => {
    const t = buildTimeline({ fps: 30, bpm: 120 }, [
      { id: "a", beats: 8 },
      { id: "b", beats: 4 },
      { id: "c", beats: 12 },
    ]);
    expect(t.scenes.a).toMatchObject({
      from: 0,
      durationInFrames: 120,
      cutFrame: 120,
    });
    expect(t.scenes.b).toMatchObject({
      from: 120,
      durationInFrames: 60,
      cutFrame: 180,
    });
    expect(t.scenes.c).toMatchObject({
      from: 180,
      durationInFrames: 180,
      cutFrame: 360,
    });
    expect(t.totalDurationInFrames).toBe(360);
  });
});

describe("scenes with transitions", () => {
  const t = buildTimeline({ fps: 30, bpm: 120 }, [
    { id: "a", beats: 8, transitionAfterBeats: 1 },
    { id: "b", beats: 8, transitionAfterBeats: 0.5 },
    { id: "c", beats: 8 },
  ]);

  it("converts transition beats to frames", () => {
    expect(t.scenes.a.transitionAfterFrames).toBe(15);
    expect(t.scenes.b.transitionAfterFrames).toBe(8);
    expect(t.scenes.c.transitionAfterFrames).toBe(0);
  });

  it("anchors each transition midpoint on its beat-aligned cut", () => {
    // start of next scene + floor(T/2) must equal the cut frame.
    expect(t.scenes.b.from + Math.floor(15 / 2)).toBe(t.scenes.a.cutFrame);
    expect(t.scenes.c.from + Math.floor(8 / 2)).toBe(t.scenes.b.cutFrame);
  });

  it("follows TransitionSeries duration math exactly", () => {
    // start[i+1] = start[i] + duration[i] - transition[i]
    expect(t.scenes.b.from).toBe(
      t.scenes.a.from +
        t.scenes.a.durationInFrames -
        t.scenes.a.transitionAfterFrames,
    );
    expect(t.scenes.c.from).toBe(
      t.scenes.b.from +
        t.scenes.b.durationInFrames -
        t.scenes.b.transitionAfterFrames,
    );
    // total = sum(durations) - sum(transitions) = last cut
    const sumD =
      t.scenes.a.durationInFrames +
      t.scenes.b.durationInFrames +
      t.scenes.c.durationInFrames;
    expect(sumD - 15 - 8).toBe(t.totalDurationInFrames);
    expect(t.totalDurationInFrames).toBe(t.beatFrame(24));
  });

  it("keeps every cut on the beat grid regardless of transitions", () => {
    expect(t.scenes.a.cutFrame).toBe(t.beatFrame(8));
    expect(t.scenes.b.cutFrame).toBe(t.beatFrame(16));
    expect(t.scenes.c.cutFrame).toBe(t.beatFrame(24));
  });
});

describe("toLocal", () => {
  it("converts absolute frames to scene-local frames", () => {
    const t = buildTimeline({ fps: 30, bpm: 120 }, [
      { id: "a", beats: 8, transitionAfterBeats: 1 },
      { id: "b", beats: 8 },
    ]);
    expect(t.toLocal("b", t.beatFrame(12))).toBe(
      t.beatFrame(12) - t.scenes.b.from,
    );
  });
});

describe("validation", () => {
  it("rejects empty timelines", () => {
    expect(() => buildTimeline({ fps: 30, bpm: 120 }, [])).toThrow(
      /at least one/,
    );
  });

  it("rejects duplicate ids", () => {
    expect(() =>
      buildTimeline({ fps: 30, bpm: 120 }, [
        { id: "a", beats: 4 },
        { id: "a", beats: 4 },
      ]),
    ).toThrow(/duplicate/);
  });

  it("rejects a transition on the last scene", () => {
    expect(() =>
      buildTimeline({ fps: 30, bpm: 120 }, [
        { id: "a", beats: 4, transitionAfterBeats: 1 },
      ]),
    ).toThrow(/last scene/);
  });

  it("rejects non-positive beats and bpm", () => {
    expect(() =>
      buildTimeline({ fps: 30, bpm: 120 }, [{ id: "a", beats: 0 }]),
    ).toThrow(/positive beats/);
    expect(() =>
      buildTimeline({ fps: 30, bpm: 0 }, [{ id: "a", beats: 4 }]),
    ).toThrow(/bpm/);
  });

  it("rejects scenes shorter than their adjacent transitions", () => {
    expect(() =>
      buildTimeline({ fps: 30, bpm: 120 }, [
        { id: "a", beats: 8, transitionAfterBeats: 4 },
        { id: "b", beats: 2, transitionAfterBeats: 2 },
        { id: "c", beats: 8 },
      ]),
    ).toThrow(/shorter than its adjacent transitions/);
  });
});
