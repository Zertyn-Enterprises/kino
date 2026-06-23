/**
 * Gate-proof reference fixture for Archetype 4: Pattern interrupt.
 * Proves structure + AmbientField recipe clears all hook gates:
 *   Gate 1 PASS (HARD): bar + counter change from f0 → delta > 0.1 by f9 (AmbientField motion).
 *   Gate 2 PASS (HARD): bright counter + bar on dark field → stddev > 5.0.
 *   Gate 3 PASS (HARD): dark palette throughout → loop-seam delta < 60.
 *   Gate 4 PASS (advisory): AmbientField density=40 energy=1.2 → ≥2 separated active cells.
 *   Gate 5 PASS (advisory): AmbientField energy=1.2 → strips span ≥2 rows from f0.
 *
 * The impossible element: a progress bar that fills RIGHT-to-LEFT (backwards),
 * with a percentage counter that descends (74→0) instead of ascending.
 * Reads as "wrong" within 0.5s at thumbnail size — universal UI convention violated.
 * The label "Loaded." at f0 (past tense, already done) doubles the impossibility.
 *
 * Neutral token set — NOT a ship template. Re-derive bespoke per Hard Rule 3.
 *
 * Run: scripts/hook.sh Hook04PatternInterrupt 74
 */

import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { AmbientField } from "../../lib/fx";

const BG = "#060a12";
const ACCENT = "#7effc9";
const ACCENT_DIM = "#2a8a60";
const TEXT = "#e2e8f0";

export const Hook04PatternInterrupt: React.FC = () => {
  const frame = useCurrentFrame();

  // Impossible element: counter descends from 74 → 0 (wrong direction for a loader).
  // Linear descent: 1% per frame so the number ticks visibly each frame.
  const pct = Math.max(
    0,
    Math.round(
      interpolate(frame, [0, 74], [74, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }),
    ),
  );

  // Brief hold (frames 0–18) then element emphasises wrongness by sliding left.
  // Per archetype spec: beat 0–1 = brief hold ≤18 frames; beat 1–2 = movement.
  const slideX = interpolate(frame, [18, 45], [0, -32], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: BG }}>
      {/* Background activity: archetype 4 recipe — density=40, energy=1.2 */}
      <AmbientField
        color={ACCENT}
        colorDim={ACCENT_DIM}
        density={40}
        energy={1.2}
        seed="h04"
      />

      {/* Impossible element: backwards progress bar + descending counter */}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          transform: `translateX(${slideX}px)`,
        }}
      >
        {/* Status label — "Loaded." at frame 0 signals impossible completion */}
        <div
          style={{
            color: TEXT,
            fontFamily: '"Arial", Helvetica, sans-serif',
            fontSize: 38,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            opacity: 0.65,
          }}
        >
          Loaded.
        </div>

        {/* Large descending counter — the impossible focal element */}
        <div
          style={{
            color: ACCENT,
            fontFamily: '"Arial Black", Impact, "Helvetica Neue", sans-serif',
            fontSize: 190,
            fontVariantNumeric: "tabular-nums",
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: "-0.04em",
            textShadow: `0 0 80px ${ACCENT}55`,
            minWidth: 360,
            textAlign: "center",
          }}
        >
          {pct}%
        </div>

        {/* Progress bar: filled portion anchored to RIGHT edge (backwards) */}
        <div
          style={{
            width: 640,
            height: 8,
            background: "rgba(126, 255, 201, 0.10)",
            borderRadius: 4,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              width: `${pct}%`,
              background: ACCENT,
              borderRadius: 4,
              boxShadow: `0 0 18px ${ACCENT}77`,
            }}
          />
        </div>

        {/* Impossible copy — appears mid-hook (beat 2, f30) */}
        <div
          style={{
            color: TEXT,
            fontFamily: '"Arial", Helvetica, sans-serif',
            fontSize: 26,
            letterSpacing: "0.04em",
            opacity: interpolate(frame, [30, 48], [0, 0.55], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          Shipped before you pushed.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
