import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { granipaTheme, grid, ink, space, type } from "../theme";
import { GradientText, LogoTile } from "./ui/system";

/**
 * S4 — reveal. Starts ON the 15.75s drop: the world is already warm, a glow
 * burst rides the hit, the real mark lands on a dramatic spring, then the
 * right column cascades in and the gradient line is WIPED into view.
 * Settled from f58; holds its styleframe to the cut.
 */

const LOGO_SIZE = 360;
const LOGO_X = grid.x(1) + (grid.w(4) - LOGO_SIZE) / 2;
const LOGO_CENTER_X = LOGO_X + LOGO_SIZE / 2;
const GLOW_R = 660;

// SFX anchors — motion.md S4, FINAL.
export const REVEAL_ICON_AT = 0;
export const REVEAL_LABEL_AT = 8;
export const REVEAL_HERO1_AT = 12;
export const REVEAL_WIPE_AT = 20;
export const REVEAL_BODY_AT = 34;
export const REVEAL_HOLD_AT = 46;
export const REVEAL_SETTLED = 60;

const ICON_FRAMES = 14;
const BURST_FRAMES = 20;
const WIPE_FRAMES = 10;
const GLOW_AMBIENT = 0.45;
const BREATH_AMP = 0.06;
const BREATH_PERIOD = 60;

const { springs, enterFrames } = granipaTheme.motion;

export const Reveal: React.FC<{ moment?: number }> = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const icon = spring({
    frame,
    fps,
    config: springs.dramatic,
    durationInFrames: ICON_FRAMES,
  });
  const burst = interpolate(frame, [0, BURST_FRAMES], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateRight: "clamp",
  });
  const breath =
    frame >= REVEAL_HOLD_AT
      ? BREATH_AMP *
        Math.sin(((frame - REVEAL_HOLD_AT) / BREATH_PERIOD) * Math.PI * 2)
      : 0;
  const glow = GLOW_AMBIENT * icon + breath;

  const riseAt = (at: number) =>
    spring({
      frame: frame - at,
      fps,
      config: springs.settle,
      durationInFrames: enterFrames,
    });
  const label = riseAt(REVEAL_LABEL_AT);
  const hero1 = riseAt(REVEAL_HERO1_AT);
  const body = riseAt(REVEAL_BODY_AT);
  // Gentle ease-out so the 10f wipe travels visibly L→R, not a 4f pop.
  const wipe = interpolate(
    frame,
    [REVEAL_WIPE_AT, REVEAL_WIPE_AT + WIPE_FRAMES],
    [0, 1],
    {
      easing: Easing.out(Easing.quad),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  return (
    <AbsoluteFill style={{ background: ink.warmBg }}>
      {/* full-frame luminance lift riding the drop — the cold→warm flip must
          read as the room getting BRIGHTER, not dark→dark (audit defect 4) */}
      {burst < 1 ? (
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(160deg, rgba(120,150,255,0.14) 0%, rgba(160,91,240,0.08) 100%)",
            opacity: 1 - burst,
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          left: LOGO_CENTER_X - GLOW_R,
          top: 540 - GLOW_R,
          width: GLOW_R * 2,
          height: GLOW_R * 2,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(160,91,240,0.12) 0%, rgba(61,139,255,0.10) 36%, rgba(61,139,255,0) 70%)",
        }}
      />
      {/* transient burst riding the drop: hot 0.9 → ambient over 20f */}
      {burst < 1 ? (
        <div
          style={{
            position: "absolute",
            left: LOGO_CENTER_X - GLOW_R,
            top: 540 - GLOW_R,
            width: GLOW_R * 2,
            height: GLOW_R * 2,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(160,91,240,0.5) 0%, rgba(61,139,255,0.3) 34%, rgba(61,139,255,0) 68%)",
            opacity: 0.9 * (1 - burst),
            transform: `scale(${0.8 + burst * 0.35})`,
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          left: LOGO_X,
          top: 0,
          height: 1080,
          display: "flex",
          alignItems: "center",
        }}
      >
        <LogoTile
          size={LOGO_SIZE}
          glow={glow}
          style={{ transform: `scale(${0.6 + icon * 0.4})` }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: grid.x(5),
          width: grid.w(7),
          top: 0,
          height: 1080,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: space[4],
        }}
      >
        <div
          style={{
            ...type.label,
            color: ink.dim,
            opacity: label,
            transform: `translateY(${(1 - label) * 12}px)`,
          }}
        >
          so i built the whole job
        </div>
        <div style={{ ...type.hero, color: ink.text }}>
          <div
            style={{
              opacity: hero1,
              transform: `translateY(${(1 - hero1) * 8}px)`,
            }}
          >
            everything
          </div>
          <div
            style={
              wipe < 1
                ? { clipPath: `inset(0 ${(1 - wipe) * 100}% 0 0)` }
                : undefined
            }
          >
            <GradientText>on-device.</GradientText>
          </div>
        </div>
        <div
          style={{
            ...type.body,
            color: ink.dim,
            opacity: body,
            transform: `translateY(${(1 - body) * 12}px)`,
          }}
        >
          one open-source app. no accounts. no cloud. no subscriptions.
        </div>
      </div>
    </AbsoluteFill>
  );
};
