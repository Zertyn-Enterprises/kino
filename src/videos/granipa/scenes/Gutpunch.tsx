import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Vignette } from "../../../lib/Grain";
import { brand, granipaTheme, grid, ink, space, type } from "../theme";

/** Frame line 2 cuts in — Main's SFX grid lands the sub-drop here. */
export const PUNCH_AT = 10;

/**
 * S3 · gutpunch — styleframe (quality.md stage C) + motion (stage D).
 * The emptiest frame of the film: two lines in a long void, the only
 * coral word in a dark sea. Line 1 fades up quietly; line 2 CUTS in at
 * PUNCH_AT (1-frame appear, 2px settle); after f16 nothing moves except
 * a near-subliminal vignette tightening. The stillness is the punch.
 */
export const Gutpunch: React.FC<{ moment?: number }> = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // f0–10: line 1 settles, opacity only — quiet.
  const line1 = interpolate(frame, [0, 8], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // f14: hard arrival — fully visible the frame it lands, then a 2px
  // drop-settle so it reads as struck, not faded. At rest by f16.
  const landed = frame >= PUNCH_AT;
  const punchSettle = spring({
    frame: Math.max(0, frame - PUNCH_AT),
    fps,
    config: granipaTheme.motion.springs.snap,
    durationInFrames: 2,
  });
  const line2Y = -2 * (1 - punchSettle);

  // f16–78: NOTHING moves. The only motion: the vignette tightens
  // 0.28 → 0.34 across the scene. The frame already wears the global
  // 0.28 pass, so this local pass adds the alpha-stacked difference:
  // 1 − (1 − 0.28)(1 − 0.06/0.72) = 0.34.
  const tighten = interpolate(frame, [0, 43], [0, 0.06 / 0.72], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: ink.coldBg }}>
      <div
        style={{
          position: "absolute",
          left: grid.x(1),
          width: grid.w(10),
          top: 0,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: space[5],
        }}
      >
        <div style={{ ...type.statement, color: ink.dim, opacity: line1 }}>
          you signed up for notes.
        </div>
        <div
          style={{
            ...type.h2,
            color: ink.text,
            opacity: landed ? 1 : 0,
            transform: `translateY(${line2Y}px)`,
          }}
        >
          you handed over <span style={{ color: brand.coral }}>everything</span>
          .
        </div>
      </div>
      <Vignette strength={tighten} />
    </AbsoluteFill>
  );
};
