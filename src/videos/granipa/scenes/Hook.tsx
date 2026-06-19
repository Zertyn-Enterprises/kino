import {
  Easing,
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { granipaTheme, grid, ink, space, type } from "../theme";
import { Icon, type IconName } from "./ui/icons";

/** Whoosh pre-roll into the first watcher stamp (Main's SFX grid). */
export const PUNCH_AT = 32;
/** The three watchers stamp in — Main places ticks on these. */
export const ICON_BLINKS = [38, 46, 54] as const;

const WATCHERS: IconName[] = ["mic", "clipboard", "eye"];

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

/**
 * S1 — hook, v3.1 (74f @122bpm). Frame 0 is the thumbnail: full question +
 * menu bar composed. Second beat: the three always-on tools stamp in LARGE
 * under the question — the same three the indictment charges next. No
 * camera tricks; two readable compositions in 2.5s.
 */
export const Hook: React.FC<{ moment?: number }> = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Whole-line settle: present from frame 0 (thumbnail law), tiny breath.
  const lineIn = interpolate(frame, [0, 8], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const stampIn = (i: number) =>
    spring({
      frame: Math.max(0, frame - ICON_BLINKS[i]!),
      fps,
      config: granipaTheme.motion.springs.snap,
      durationInFrames: 8,
    });

  return (
    <AbsoluteFill style={{ background: ink.coldBg }}>
      {/* Region B — rebuilt macOS menu bar, composed from frame 0 */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 1920,
          height: 44,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: space[4],
          paddingRight: space[4],
          background: "rgba(255,255,255,0.02)",
          borderBottom: `1px solid ${ink.border}`,
        }}
      >
        {WATCHERS.map((name) => (
          <Icon key={name} name={name} size={22} color={ink.dim} />
        ))}
        <div style={{ ...type.caption, color: ink.dim }}>9:41</div>
      </div>

      {/* Region A — the question, full line from frame 0, open colon */}
      <div
        style={{
          position: "absolute",
          left: grid.x(0),
          top: 400,
          width: grid.w(11),
          opacity: 0.85 + 0.15 * lineIn,
          transform: `translateY(${3 * (1 - lineIn)}px)`,
        }}
      >
        <div style={{ ...type.h2, color: ink.text }}>
          {"what your mac tools see in a day:"}
        </div>
      </div>

      {/* Region C — the three watchers stamp in large, one per tick */}
      <div
        style={{
          position: "absolute",
          left: grid.x(0),
          top: 640,
          display: "flex",
          gap: space[7],
        }}
      >
        {WATCHERS.map((name, i) => {
          const p = stampIn(i);
          return (
            <Icon
              key={name}
              name={name}
              size={84}
              color={ink.text}
              strokeWidth={1.5}
              style={{
                opacity: 0.2 + 0.8 * p,
                transform: `scale(${0.92 + 0.08 * p})`,
              }}
            />
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
