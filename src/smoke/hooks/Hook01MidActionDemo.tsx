/**
 * Gate-proof reference fixture for Archetype 1: Mid-action demo.
 * Proves structure + AmbientField recipe clears all hook gates:
 *   Gate 1 PASS (HARD): AmbientField scroll + typewriter → delta > 0.1 by f9.
 *   Gate 2 PASS (HARD): bright terminal output on dark field → stddev > 5.0.
 *   Gate 3 PASS (HARD): dark palette throughout → loop-seam delta < 60.
 *   Gate 4 PASS (advisory): focal terminal output spans ≥4 lines between f0 and mid-hook
 *                            → single-region delta > 10 (path B).
 *   Gate 5 PASS (advisory): AmbientField energy=1 → strips span ≥2 rows from f0.
 *
 * Neutral token set — NOT a ship template. Re-derive bespoke per Hard Rule 3.
 *
 * Run: scripts/hook.sh Hook01MidActionDemo
 */

import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { AmbientField } from "../../lib/fx";

const BG = "#060a12";
const ACCENT = "#7effc9";
const ACCENT_DIM = "#2a8a60";
const TEXT = "#e2e8f0";
const PANEL_BORDER = "#2a8a6044";

// Six streaming lines that appear progressively — sufficient focal delta for gate 4 path B.
// Line 0 is already complete at f0 (product mid-task). Lines 1–5 appear in the hook window.
// At mid-hook (f44), lines 1–4 are complete → large focal luminance delta in a single column.
const LINES: { text: string; startAt: number; durFrames: number }[] = [
  { text: "$ build --release",       startAt: 0,  durFrames: 0  }, // already complete
  { text: "→ resolving…",            startAt: 0,  durFrames: 8  }, // completing at beat 0
  { text: "→ compiling modules…",    startAt: 10, durFrames: 8  }, // consequence chain
  { text: "→ linking artifacts…",    startAt: 20, durFrames: 8  }, // consequence chain
  { text: "→ done in 183ms",         startAt: 30, durFrames: 8  }, // consequence chain
  { text: "✓ Build complete.",        startAt: 42, durFrames: 8  }, // promise legible ~beat 3-5
];

export const Hook01MidActionDemo: React.FC = () => {
  const frame = useCurrentFrame();

  // Camera push-in 2% on focal point across beat 1–3 (f15–f45) per archetype spec
  const scale = interpolate(frame, [15, 45], [1.0, 1.02], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: BG }}>
      {/* Background activity layer — archetype 1 AmbientField recipe: density=40, energy=1 */}
      <AmbientField
        color={ACCENT}
        colorDim={ACCENT_DIM}
        density={40}
        energy={1}
        seed="h01"
      />

      {/* Focal: terminal output panel with push-in camera move */}
      <AbsoluteFill
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "56% 50%",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "44%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: 30,
            lineHeight: 1.75,
            color: TEXT,
            background: "rgba(6, 10, 18, 0.92)",
            padding: "32px 48px",
            borderRadius: 10,
            border: `1px solid ${PANEL_BORDER}`,
            minWidth: 480,
            boxShadow: `0 0 60px ${ACCENT}14`,
          }}
        >
          {LINES.map(({ text, startAt, durFrames }, i) => {
            if (frame < startAt) return null;
            const elapsed = frame - startAt;
            const chars =
              durFrames === 0
                ? text.length
                : Math.min(
                    text.length,
                    Math.floor(
                      interpolate(elapsed, [0, durFrames], [0, text.length], {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                      }),
                    ),
                  );
            const done = chars >= text.length;
            const isLast = i === LINES.length - 1;
            // Cursor blinks every 6 frames at the active line
            const cursorOn = !done && Math.floor(frame / 6) % 2 === 0;
            return (
              <div
                key={i}
                style={{
                  color: isLast ? ACCENT : TEXT,
                  whiteSpace: "nowrap",
                }}
              >
                {text.slice(0, chars)}
                {cursorOn && (
                  <span
                    style={{
                      display: "inline-block",
                      width: 10,
                      height: 26,
                      background: ACCENT,
                      marginLeft: 2,
                      verticalAlign: "middle",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
