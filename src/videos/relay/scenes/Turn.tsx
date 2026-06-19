import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { useTheme } from "../../../lib/theme";

const lineStyle = (p: number): React.CSSProperties => ({
  opacity: p,
  transform: `translateY(${(1 - p) * 16}px)`,
  filter: `blur(${(1 - p) * 8}px)`,
});

/** Dead stop. The silence before the drop. */
export const Turn: React.FC = () => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const ease = Easing.bezier(0.16, 1, 0.3, 1);
  const p1 = interpolate(frame, [0, 14], [0, 1], {
    easing: ease,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const p2 = interpolate(frame, [45, 59], [0, 1], {
    easing: ease,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const drift = 1 + (frame / 90) * 0.01;

  return (
    <AbsoluteFill style={{ background: "#070A08" }}>
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${drift})`,
        }}
      >
        <div
          style={{
            fontFamily: t.fonts.display.family,
            fontWeight: t.fonts.display.weight,
            fontSize: 100,
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
            color: t.palette.text,
            textAlign: "center",
          }}
        >
          <div style={lineStyle(p1)}>Your code is done.</div>
          <div style={lineStyle(p2)}>
            Your deploy isn&apos;t
            <span style={{ color: t.palette.accentAlt }}>.</span>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
