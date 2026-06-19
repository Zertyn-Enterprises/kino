import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { useTheme } from "../../../lib/theme";

/** Calm resolve. Long hold; one last heartbeat for the loop seam. */
export const Cta: React.FC = () => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const ease = Easing.bezier(0.16, 1, 0.3, 1);

  const wordmarkP = interpolate(frame, [0, 14], [0, 1], {
    easing: ease,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const lineP = interpolate(frame, [18, 32], [0, 1], {
    easing: ease,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const chipP = interpolate(frame, [36, 48], [0, 1], {
    easing: ease,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // One lime heartbeat sweeping the wordmark at f72.
  const sweep = interpolate(frame, [72, 94], [-0.6, 1.6], {
    easing: Easing.bezier(0.45, 0, 0.25, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: "#070A08" }}>
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 30,
        }}
      >
        <div
          style={{
            fontFamily: t.fonts.display.family,
            fontWeight: t.fonts.display.weight,
            fontSize: 132,
            letterSpacing: "-0.02em",
            opacity: wordmarkP,
            filter: `blur(${(1 - wordmarkP) * 6}px)`,
            backgroundImage: `linear-gradient(100deg, ${t.palette.text} ${(sweep - 0.25) * 100}%, ${t.palette.accent} ${sweep * 100}%, ${t.palette.text} ${(sweep + 0.25) * 100}%)`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          Relay
        </div>
        <div
          style={{
            fontFamily: t.fonts.body.family,
            fontWeight: t.fonts.body.weight,
            fontSize: 44,
            color: t.palette.textDim,
            opacity: lineP,
            transform: `translateY(${(1 - lineP) * 14}px)`,
          }}
        >
          Push. It&apos;s already live.
        </div>
        <div
          style={{
            fontFamily: t.fonts.mono?.family,
            fontSize: 26,
            color: t.palette.text,
            background: t.palette.surface,
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 99,
            padding: "12px 34px",
            opacity: chipP,
            transform: `translateY(${(1 - chipP) * 10}px)`,
            marginTop: 10,
          }}
        >
          relay.dev
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
