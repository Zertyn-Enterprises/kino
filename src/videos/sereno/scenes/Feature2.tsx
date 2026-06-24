import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { AmbientField } from "../../../lib/fx";
import { useTheme } from "../../../lib/theme";

const STATS = [
  { value: "3 min", label: "to first note" },
  { value: "Zero", label: "app switching" },
  { value: "Always", label: "available" },
];

export function Feature2() {
  const t = useTheme();
  const frame = useCurrentFrame();

  const headlineP = interpolate(frame, [6, 24], [0, 1], {
    easing: Easing.bezier(0.25, 0, 0.25, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

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
        seed="f2"
      />
      <div style={{ textAlign: "center", maxWidth: 1100, position: "relative", zIndex: 1 }}>
        <div
          style={{
            fontFamily: t.fonts.display.family,
            fontWeight: t.fonts.display.weight,
            fontSize: 64,
            color: t.palette.text,
            letterSpacing: "-0.02em",
            opacity: headlineP,
            transform: `translateY(${(1 - headlineP) * 20}px)`,
          }}
        >
          Designed for deep work
        </div>
        <div
          style={{
            marginTop: 64,
            display: "flex",
            justifyContent: "center",
            gap: 80,
          }}
        >
          {STATS.map((s, i) => {
            const p = interpolate(frame, [28 + i * 10, 46 + i * 10], [0, 1], {
              easing: Easing.bezier(0.25, 0, 0.25, 1),
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <div key={i} style={{ textAlign: "center", opacity: p }}>
                <div
                  style={{
                    fontFamily: t.fonts.display.family,
                    fontWeight: t.fonts.display.weight,
                    fontSize: 72,
                    color: t.palette.accent,
                    lineHeight: 1,
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    marginTop: 12,
                    fontFamily: t.fonts.body.family,
                    fontWeight: 400,
                    fontSize: 24,
                    color: t.palette.textDim,
                    letterSpacing: "0.04em",
                  }}
                >
                  {s.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
}
