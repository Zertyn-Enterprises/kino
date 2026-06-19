import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Flash, Shake } from "../../../lib/fx";
import { granipaTheme, grid, ink, space, type } from "../theme";
import { ReceiptChip } from "./ui/system";

/** The $40→$0 slam (scene-local, on the track's 36.6s accent). */
export const KICK_SLAM = 100;

const { springs, staggerFrames } = granipaTheme.motion;
const EASE = Easing.bezier(0.16, 1, 0.3, 1);

// Strike frames mirror the tick SFX in Main.tsx (motion.md S8, FINAL).
// Re-sequenced per audit defect 8: strikes → total → label → slam.
const STACK: { label: string; strikeAt: number }[] = [
  { label: "granola — $14/mo", strikeAt: 8 },
  { label: "raycast pro", strikeAt: 18 },
  { label: "textsniper", strikeAt: 28 },
  { label: "rectangle pro", strikeAt: 38 },
];

const CAPTION_AT = 50;
const LABEL_AT = 76;
const BODY_AT = 108;

/**
 * S8 · kicker — motion (quality.md stage D).
 * The replaced stack arrives intact, gets struck out beat by beat, the
 * receipt totals up — then $0 slams the answer. Holds from f86 to the cut.
 */
export const Kicker: React.FC<{ moment?: number }> = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeUp = (at: number, dist: number): React.CSSProperties => {
    const p = interpolate(frame - at, [0, 12], [0, 1], {
      easing: EASE,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return { opacity: p, transform: `translateY(${(1 - p) * dist}px)` };
  };

  const slam = spring({
    frame,
    fps,
    delay: KICK_SLAM,
    config: springs.dramatic,
    durationInFrames: 8,
  });
  const slamIn = interpolate(frame - KICK_SLAM, [0, 3], [0, 1], {
    easing: EASE,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: ink.warmBg }}>
      <Shake at={KICK_SLAM} strength={4}>
        {/* Region A — the tired stack, struck through (cols 0–4) */}
        <div
          style={{
            position: "absolute",
            left: grid.x(0),
            width: grid.w(5),
            top: 0,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "flex-start",
            gap: space[4],
          }}
        >
          {STACK.map(({ label, strikeAt }, i) => {
            const enter = spring({
              frame,
              fps,
              delay: i * staggerFrames,
              config: springs.settle,
              durationInFrames: 8,
            });
            const wipe = interpolate(frame - strikeAt, [0, 8], [0, 1], {
              easing: EASE,
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const dim = interpolate(frame - strikeAt, [0, 8], [1, 0.65], {
              easing: EASE,
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <ReceiptChip
                key={label}
                style={{
                  whiteSpace: "nowrap",
                  opacity: enter * dim,
                  transform: `translateY(${(1 - enter) * 16}px)`,
                }}
              >
                <span style={{ position: "relative", display: "inline-block" }}>
                  {label}
                  {/* Transparent twin carries the strike so it can wipe on. */}
                  <span
                    style={{
                      position: "absolute",
                      inset: 0,
                      color: "transparent",
                      textDecoration: "line-through",
                      textDecorationColor: ink.dim,
                      textDecorationThickness: 1.5,
                      clipPath: `inset(0 ${(1 - wipe) * 100}% 0 0)`,
                    }}
                  >
                    {label}
                  </span>
                </span>
              </ReceiptChip>
            );
          })}
          <div
            style={{
              ...type.body,
              color: ink.text,
              marginTop: space[3],
              ...fadeUp(CAPTION_AT, 10),
            }}
          >
            ≈ $40/mo, every month
          </div>
        </div>

        {/* Region B — the slam (cols 6–11) */}
        <div
          style={{
            position: "absolute",
            left: grid.x(6),
            width: grid.w(6),
            top: 0,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{ ...type.label, color: ink.dim, ...fadeUp(LABEL_AT, 10) }}
          >
            {"oh, and it's free."}
          </div>
          <div
            style={{
              ...type.xl,
              color: ink.text,
              marginTop: space[4],
              opacity: slamIn,
              transform: `scale(${1.3 - 0.3 * slam})`,
              transformOrigin: "left top",
            }}
          >
            $0
          </div>
          <div
            style={{
              ...type.body,
              color: ink.dim,
              maxWidth: grid.w(5),
              marginTop: space[5],
              ...fadeUp(BODY_AT, 10),
            }}
          >
            open source. local is also cheaper.
          </div>
        </div>
      </Shake>
      <Flash at={KICK_SLAM} color={ink.text} peak={0.1} />
    </AbsoluteFill>
  );
};
