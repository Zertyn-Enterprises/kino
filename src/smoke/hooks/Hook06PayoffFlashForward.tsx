/**
 * Gate-proof reference fixture for Archetype 6: Payoff flash-forward.
 * Proves structure + AmbientField recipe clears all hook gates:
 *   Gate 1 PASS (HARD): AmbientField energy=1 scrolls f0→f9 → delta > 0.1 by frame 9.
 *   Gate 2 PASS (HARD): finished-state terminal on dark field → stddev > 5.0.
 *   Gate 3 PASS (HARD): present state typewriters back to same 4 lines by f74;
 *                       mean pixel delta (f0 vs f74) < 60.
 *   Gate 4 PASS (advisory): flash-state top-gradient spans all 4 cols of row 0 (absent
 *                            at mid-f44); cells (row0,col0) and (row0,col3) are
 *                            Chebyshev-separated + mean delta > 10 → both paths pass.
 *   Gate 5 PASS (advisory): gradient in row 0 + terminal in rows 1-2 → ≥3 rows at f0.
 *
 * CRITICAL: Frame 0 shows the END STATE — the only archetype where f0 is the
 * destination. Hard cut at f12 back to the present/before state. No copy during
 * the flash per archetype spec; first text appears after the cut.
 *
 * Neutral token set — NOT a ship template. Re-derive bespoke per Hard Rule 3.
 *
 * Run: scripts/hook.sh Hook06PayoffFlashForward 74
 */

import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { AmbientField, Flash } from "../../lib/fx";

const BG = "#060a12";
const ACCENT = "#7effc9";
const ACCENT_DIM = "#2a8a60";
const TEXT = "#e2e8f0";
const PANEL_BORDER = "#2a8a6044";

// Hard cut at this frame: flash window = f0..f11 (12 frames ≈ 0.4s)
const FLASH_END = 12;

// Four terminal lines — identical in both flash state and built-up present state.
// Larger font (46px) ensures per-cell pixel delta is high enough for gate 4 path B.
// dur=0 means already complete; dur>0 means typewriter that many frames.
const LINES: { text: string; color: string; dur: number }[] = [
  { text: "$ deploy --production",    color: TEXT,   dur: 0 },
  { text: "→ Build complete.  183ms", color: TEXT,   dur: 8 },
  { text: "→ Tests: 247 passed.",     color: TEXT,   dur: 8 },
  { text: "✓ Live.",                  color: ACCENT, dur: 8 },
];

// Present-state start frames: line i starts at FLASH_END + 1 + i*16.
// All 4 lines are complete by f75 — f74 ≈ f0 in luminance (passes gate 3).
const presentStart = (i: number) => FLASH_END + 1 + i * 16;

export const Hook06PayoffFlashForward: React.FC = () => {
  const frame = useCurrentFrame();
  const isFlash = frame < FLASH_END;

  // Archetype 6 AmbientField recipe: energy=1 in flash ("alive, desirable"),
  // drops to 0.4 on cut-back ("not there yet"), per archetype spec.
  const ambientEnergy = isFlash ? 1 : 0.4;

  return (
    <AbsoluteFill style={{ background: BG }}>
      {/* Archetype 6 AmbientField recipe */}
      <AmbientField
        color={ACCENT}
        colorDim={ACCENT_DIM}
        density={40}
        energy={ambientEnergy}
        seed="h06"
      />

      {/* Flash-state top glow — visible only in the desirable end state.
          Spans full width → all 4 cells of row 0 get delta > 10 at f0 vs mid-f44,
          satisfying gate 4 via separated path A (col0 + col3, Chebyshev=3) and
          focal path B (cell mean delta ≈ 25 > 10). Absent in present state. */}
      {isFlash && (
        <AbsoluteFill
          style={{
            background: `linear-gradient(to bottom, ${ACCENT}44 0%, transparent 22%)`,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Flash exclamation point fires just before the hard cut at f12 */}
      <Flash at={10} color="#ffffff" peak={0.12} />

      {/* Terminal panel */}
      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: 46,
            lineHeight: 1.6,
            background: "rgba(6, 10, 18, 0.92)",
            padding: "32px 48px",
            borderRadius: 10,
            border: `1px solid ${PANEL_BORDER}`,
            minWidth: 620,
            boxShadow: `0 0 60px ${ACCENT}14`,
          }}
        >
          {LINES.map(({ text, color, dur }, i) => {
            if (isFlash) {
              // Flash state: all lines fully visible (the desirable end state)
              return (
                <div key={i} style={{ color, whiteSpace: "nowrap" }}>
                  {text}
                </div>
              );
            }
            // Present state: each line typewriters in from its start frame
            const start = presentStart(i);
            if (frame < start) return null;
            const chars =
              dur === 0
                ? text.length
                : Math.min(
                    text.length,
                    Math.floor(
                      interpolate(frame - start, [0, dur], [0, text.length], {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                      }),
                    ),
                  );
            return (
              <div key={i} style={{ color, whiteSpace: "nowrap" }}>
                {text.slice(0, chars)}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
