import { Easing, interpolate, useCurrentFrame } from "remotion";
import { useTheme } from "../../../../lib/theme";

/** Scene claim, lower-third. Masked rise at `startFrame`, holds. */
export const Claim: React.FC<{ text: string; startFrame?: number }> = ({
  text,
  startFrame = 6,
}) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const p = interpolate(frame - startFrame, [0, 14], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: 96,
        bottom: 84,
        overflow: "hidden",
        paddingBottom: 6,
      }}
    >
      <div
        style={{
          fontFamily: t.fonts.display.family,
          fontWeight: t.fonts.display.weight,
          fontSize: 44,
          letterSpacing: "-0.015em",
          color: t.palette.text,
          background: "rgba(7, 10, 8, 0.82)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: 14,
          padding: "12px 26px",
          transform: `translateY(${(1 - p) * 110}%)`,
          opacity: p,
        }}
      >
        {text}
      </div>
    </div>
  );
};

/** The Relay live pulse — a breathing glow keyed to the beat grid. */
export const pulseGlow = (
  frame: number,
  periodFrames = 30,
  peak = 1,
): number => {
  const phase = ((frame % periodFrames) + periodFrames) % periodFrames;
  const p = phase / periodFrames;
  return peak * Math.exp(-5 * p);
};

/** Small mouse cursor that glides between waypoints, then "presses". */
export const PointerCursor: React.FC<{
  /** [frame, x, y] keyframes; positions interpolate with ease-in-out. */
  path: readonly (readonly [number, number, number])[];
  pressAt?: readonly number[];
}> = ({ path, pressAt = [] }) => {
  const frame = useCurrentFrame();
  const frames = path.map((p) => p[0]);
  const xs = path.map((p) => p[1]);
  const ys = path.map((p) => p[2]);
  const ease = Easing.bezier(0.45, 0, 0.25, 1);
  const x = interpolate(frame, frames, xs, {
    easing: ease,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(frame, frames, ys, {
    easing: ease,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  let press = 1;
  for (const pf of pressAt) {
    if (frame >= pf && frame <= pf + 8) {
      press = frame <= pf + 3 ? 0.82 : 0.82 + ((frame - pf - 3) / 5) * 0.18;
    }
  }
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `scale(${press})`,
        transformOrigin: "top left",
        zIndex: 40,
      }}
    >
      <svg width="30" height="34" viewBox="0 0 30 34">
        <path
          d="M3 1 L3 25 L9.5 19.5 L13.5 29 L17.5 27.2 L13.6 18 L22 17.5 Z"
          fill="#FFFFFF"
          stroke="rgba(0,0,0,0.55)"
          strokeWidth="1.6"
        />
      </svg>
    </div>
  );
};
