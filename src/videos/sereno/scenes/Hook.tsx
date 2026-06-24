import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { AmbientField } from "../../../lib/fx";
import { useTheme } from "../../../lib/theme";

export function Hook() {
  const t = useTheme();
  const frame = useCurrentFrame();

  // Gentle fade-in for the headline (restrained — no slams)
  const titleP = interpolate(frame, [12, 36], [0, 1], {
    easing: Easing.bezier(0.25, 0, 0.25, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Promise text appears by frame 45 per timeline declaration
  const subP = interpolate(frame, [32, 48], [0, 1], {
    easing: Easing.bezier(0.25, 0, 0.25, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}
    >
      {/* Living background — density ≥ 40, energy ≥ 1 for hook gate pass */}
      <AmbientField
        color={t.palette.accent}
        colorDim={t.palette.textDim}
        density={50}
        energy={1.0}
        itemH={4}
      />
      <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
        <div
          style={{
            fontFamily: t.fonts.display.family,
            fontWeight: t.fonts.display.weight,
            fontSize: 120,
            color: t.palette.text,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            opacity: titleP,
            transform: `translateY(${(1 - titleP) * 24}px)`,
          }}
        >
          Sereno
        </div>
        <div
          style={{
            marginTop: 24,
            fontFamily: t.fonts.body.family,
            fontWeight: 400,
            fontSize: 32,
            color: t.palette.textDim,
            letterSpacing: "0.04em",
            opacity: subP,
            transform: `translateY(${(1 - subP) * 12}px)`,
          }}
        >
          focus arrives in seconds
        </div>
      </div>
    </AbsoluteFill>
  );
}
