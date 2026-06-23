/**
 * Gate-proof reference fixture for Archetype 5: Number-counting.
 * Proves structure + AmbientField recipe clears all hook gates:
 *   Gate 1 PASS (HARD): counter changes f0→f9 (AmbientField motion reinforces) → delta > 0.1.
 *   Gate 2 PASS (HARD): large high-contrast number on dark field → stddev > 5.0.
 *   Gate 3 PASS (HARD): dark palette throughout → loop-seam delta < 60.
 *   Gate 4 PASS (advisory): AmbientField density=40 → ≥2 separated active cells.
 *   Gate 5 PASS (advisory): AmbientField energy=1 → strips span ≥2 rows from f0.
 *
 * Counter starts mid-count at f0 (non-zero, non-final per archetype spec).
 * Shake + Ripple at peak arrival (f60) per archetype motion signature.
 * Context label fades in at f55; large tabular-nums display prevents jitter.
 *
 * Neutral token set — NOT a ship template. Re-derive bespoke per Hard Rule 3.
 *
 * Run: scripts/hook.sh Hook05NumberCounting 74
 */

import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { AmbientField, Ripple, Shake, useCountUp } from "../../lib/fx";

const BG = "#060a12";
const ACCENT = "#7effc9";
const ACCENT_DIM = "#2a8a60";
const TEXT = "#e2e8f0";

// Peak frame: beat 3–4 in a 75-frame hook window (f60 ≈ beat 4 at 30fps/120bpm).
const PEAK_FRAME = 60;

export const Hook05NumberCounting: React.FC = () => {
  const frame = useCurrentFrame();

  // Counter starts mid-count at 4,000 — not at zero, not at peak.
  // Accelerates to peak (14,000) with cubic-in easing per archetype spec.
  const count = useCountUp({
    from: 4000,
    to: 14000,
    at: 0,
    durationInFrames: PEAK_FRAME,
    easing: Easing.in(Easing.cubic),
  });

  // Context label fades in at beat 3 (f55) per archetype timing.
  const labelOpacity = interpolate(frame, [55, 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: BG }}>
      {/* Background activity: archetype 5 recipe — density=40, energy=1 */}
      <AmbientField
        color={ACCENT}
        colorDim={ACCENT_DIM}
        density={40}
        energy={1}
        seed="h05"
      />

      {/* Impact ring expanding from counter center at peak arrival */}
      <Ripple
        at={PEAK_FRAME}
        x={960}
        y={480}
        color={ACCENT}
        maxScale={8}
        durationInFrames={20}
      />

      {/* Shake wraps the counter — activates at peak (beat 4) per archetype spec */}
      <Shake at={PEAK_FRAME} strength={4}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 28,
          }}
        >
          {/* Large display number — protagonist; tabular-nums prevents jitter */}
          <div
            style={{
              color: ACCENT,
              fontFamily: '"Arial Black", Impact, "Helvetica Neue", sans-serif',
              fontSize: 220,
              fontVariantNumeric: "tabular-nums",
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: "-0.04em",
              textShadow: `0 0 100px ${ACCENT}44`,
            }}
          >
            {new Intl.NumberFormat("en-US").format(count)}
          </div>

          {/* Context label — fades in at beat 3; ≤4 words per archetype spec */}
          <div
            style={{
              color: TEXT,
              fontFamily: '"Arial", Helvetica, sans-serif',
              fontSize: 44,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              opacity: labelOpacity,
            }}
          >
            deploys today
          </div>
        </AbsoluteFill>
      </Shake>
    </AbsoluteFill>
  );
};
