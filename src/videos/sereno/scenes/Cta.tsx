import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { AmbientField } from "../../../lib/fx";
import { useTheme } from "../../../lib/theme";

export function Cta() {
  const t = useTheme();
  const frame = useCurrentFrame();

  const cardP = interpolate(frame, [6, 28], [0, 1], {
    easing: Easing.bezier(0.25, 0, 0.25, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const ctaP = interpolate(frame, [24, 42], [0, 1], {
    easing: Easing.bezier(0.25, 0, 0.25, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <AmbientField
        color={t.palette.textDim}
        density={50}
        energy={2.0}
        itemH={6}
        seed="ct"
      />
      {/* End card — dark text on light surface; high edge density for payoff gate */}
      <div
        style={{
          background: t.palette.surface,
          borderRadius: t.radius.lg,
          padding: "80px 120px",
          textAlign: "center",
          opacity: cardP,
          transform: `scale(${0.96 + cardP * 0.04})`,
          boxShadow: "0 8px 48px rgba(0,0,0,0.08)",
          minWidth: 800,
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            fontFamily: t.fonts.display.family,
            fontWeight: t.fonts.display.weight,
            fontSize: 88,
            color: t.palette.text,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
          }}
        >
          Find your flow.
        </div>
        <div
          style={{
            fontFamily: t.fonts.display.family,
            fontWeight: 400,
            fontSize: 88,
            color: t.palette.accent,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            fontStyle: "italic",
          }}
        >
          Sereno.
        </div>
        <div
          style={{
            marginTop: 40,
            fontFamily: t.fonts.body.family,
            fontWeight: 400,
            fontSize: 28,
            color: t.palette.textDim,
            letterSpacing: "0.04em",
            opacity: ctaP,
          }}
        >
          sereno.app — free to start
        </div>
      </div>
    </AbsoluteFill>
  );
}
