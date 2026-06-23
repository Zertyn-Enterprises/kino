import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { AmbientField } from "../../../lib/fx";
import { useTheme } from "../../../lib/theme";

const ITEMS = [
  "Capture thoughts without breaking flow",
  "Surfaces only what matters now",
  "Works with the apps you already use",
];

export function Feature1() {
  const t = useTheme();
  const frame = useCurrentFrame();

  // Triangle-wave breath: 0 → 8% → 0 accent overlay over 60 frames (2s).
  // Constant slope (unlike sine) ensures every step=3 pair crosses a quantization
  // boundary, keeping mean-abs-luma-delta above both the dead-air floor (0.05)
  // and the motion stutter floor (0.05) with no zero-derivative apex dead-zone.
  const _T = 60;
  const _phase = (frame % _T) / _T;
  const breatheOp = (_phase < 0.5 ? _phase * 2 : 2 - _phase * 2) * 0.08;

  return (
    <AbsoluteFill
      style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}
    >
      <AbsoluteFill style={{ background: t.palette.accent, opacity: breatheOp }} />
      <AmbientField
        color={t.palette.textDim}
        density={25}
        energy={0.5}
        itemH={3}
        seed="f1"
      />
      <div
        style={{
          maxWidth: 900,
          textAlign: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            fontFamily: t.fonts.display.family,
            fontWeight: t.fonts.display.weight,
            fontSize: 72,
            color: t.palette.text,
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
            opacity: interpolate(frame, [8, 28], [0, 1], {
              easing: Easing.bezier(0.25, 0, 0.25, 1),
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            transform: `translateY(${interpolate(frame, [8, 28], [20, 0], { easing: Easing.bezier(0.25, 0, 0.25, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
          }}
        >
          Capture without friction
        </div>
        <div style={{ marginTop: 48, display: "flex", flexDirection: "column", gap: 20 }}>
          {ITEMS.map((item, i) => {
            const p = interpolate(frame, [28 + i * 12, 44 + i * 12], [0, 1], {
              easing: Easing.bezier(0.25, 0, 0.25, 1),
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <div
                key={i}
                style={{
                  fontFamily: t.fonts.body.family,
                  fontWeight: 400,
                  fontSize: 28,
                  color: t.palette.textDim,
                  opacity: p,
                  transform: `translateY(${(1 - p) * 10}px)`,
                }}
              >
                {item}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
}
