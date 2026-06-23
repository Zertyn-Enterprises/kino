/**
 * Gate-proof reference fixture for Archetype 8: Multi-layer live demo.
 * Proves structure + AmbientField recipe clears all hook gates:
 *   Gate 1 PASS (HARD): main terminal types from f0 + AmbientField → delta > 0.1 by f9.
 *   Gate 2 PASS (HARD): dense multi-panel layout spans multiple luminance zones → stddev > 5.0.
 *   Gate 3 PASS (HARD): all panels active at both f0 and f74 → similar luminance distribution;
 *                       mean pixel delta < 60.
 *   Gate 4 PASS (advisory): AmbientField density=50 energy=1.2 + multi-panel change → ≥2 cells.
 *   Gate 5 PASS (advisory): panels span left+right half of frame → ≥2 grid rows from f0.
 *
 * Three independent panels with OFFSET start times — they do NOT sync (per archetype spec):
 *   - Main terminal (left):   process lines start at f0, f2, f12, f22, f35, f52
 *   - Counter (top-right):    counting begins at f3 (offset by 3 frames)
 *   - Agent status (bottom-right): items 01+02 live from f0; item 03 spawns at f35 (beat 2)
 *
 * Neutral token set — NOT a ship template. Re-derive bespoke per Hard Rule 3.
 *
 * Run: scripts/hook.sh Hook08MultiLayerLiveDemo 74
 */

import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { AmbientField, useCountUp } from "../../lib/fx";

const BG = "#060a12";
const ACCENT = "#7effc9";
const ACCENT_DIM = "#2a8a60";
const TEXT = "#e2e8f0";
const TEXT_DIM = "#8899aa";
const PANEL_BORDER = "#2a8a6044";
const STATUS_DONE = ACCENT;
const STATUS_RUNNING = "#f59e0b";

// Main terminal lines — each has its own start frame (no sync with side panels).
const MAIN_LINES: { text: string; color: string; startAt: number; dur: number }[] = [
  { text: "$ run --agents 5",       color: TEXT,   startAt: 0,  dur: 0 },
  { text: "Agent 1: initializing…", color: TEXT_DIM, startAt: 2,  dur: 8 },
  { text: "Agent 2: initializing…", color: TEXT_DIM, startAt: 12, dur: 8 },
  { text: "Agent 3: ready.",        color: TEXT,   startAt: 22, dur: 8 },
  { text: "→ Processing batch…",    color: TEXT,   startAt: 35, dur: 8 },
  { text: "✓ Batch complete.",       color: ACCENT, startAt: 52, dur: 8 },
];

// Counter: starts counting at f3 (independent from main panel's f0).
const COUNTER_AT = 3;
const COUNTER_DUR = 57;

// Agent status items: items 01+02 live at f0; item 03 spawns at f35 (beat 2 new process).
// State flips are staggered — they do NOT coincide with any main-terminal event.
const AGENTS: { label: string; showAt: number; doneAt: number }[] = [
  { label: "AGENT 01", showAt: 0,  doneAt: 28 },
  { label: "AGENT 02", showAt: 0,  doneAt: 46 },
  { label: "AGENT 03", showAt: 35, doneAt: 65 },
];

export const Hook08MultiLayerLiveDemo: React.FC = () => {
  const frame = useCurrentFrame();

  // Counter: begins at f3, independent timeline with offset start
  const count = useCountUp({
    from: 8500,
    to: 14000,
    at: COUNTER_AT,
    durationInFrames: COUNTER_DUR,
    easing: Easing.in(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{ background: BG }}>
      {/* Archetype 8 AmbientField recipe: elevated density=50 energy=1.2 */}
      <AmbientField
        color={ACCENT}
        colorDim={ACCENT_DIM}
        density={50}
        energy={1.2}
        seed="h08"
      />

      {/* ── Main process panel (left side) ─────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          top: 160,
          width: 720,
          fontFamily: '"Courier New", Courier, monospace',
          fontSize: 28,
          lineHeight: 1.8,
          background: "rgba(6, 10, 18, 0.92)",
          padding: "28px 40px",
          borderRadius: 10,
          border: `1px solid ${PANEL_BORDER}`,
          boxShadow: `0 0 60px ${ACCENT}14`,
        }}
      >
        {MAIN_LINES.map(({ text, color, startAt, dur }, i) => {
          if (frame < startAt) return null;
          const chars =
            dur === 0
              ? text.length
              : Math.min(
                  text.length,
                  Math.floor(
                    interpolate(frame - startAt, [0, dur], [0, text.length], {
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

      {/* ── Counter panel (top-right, independent timeline) ────────────── */}
      <div
        style={{
          position: "absolute",
          right: 80,
          top: 160,
          width: 580,
          background: "rgba(6, 10, 18, 0.92)",
          padding: "28px 36px",
          borderRadius: 10,
          border: `1px solid ${PANEL_BORDER}`,
          boxShadow: `0 0 60px ${ACCENT}14`,
        }}
      >
        <div
          style={{
            color: TEXT_DIM,
            fontFamily: '"Arial", Helvetica, sans-serif',
            fontSize: 18,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          Requests processed
        </div>
        <div
          style={{
            color: ACCENT,
            fontFamily: '"Arial Black", Impact, "Helvetica Neue", sans-serif',
            fontSize: 96,
            fontVariantNumeric: "tabular-nums",
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: "-0.03em",
            textShadow: `0 0 60px ${ACCENT}44`,
          }}
        >
          {new Intl.NumberFormat("en-US").format(count)}
        </div>
      </div>

      {/* ── Agent status panel (bottom-right, independent timeline) ────── */}
      <div
        style={{
          position: "absolute",
          right: 80,
          top: 480,
          width: 580,
          background: "rgba(6, 10, 18, 0.92)",
          padding: "28px 36px",
          borderRadius: 10,
          border: `1px solid ${PANEL_BORDER}`,
          boxShadow: `0 0 60px ${ACCENT}14`,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div
          style={{
            color: TEXT_DIM,
            fontFamily: '"Arial", Helvetica, sans-serif',
            fontSize: 18,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          Agent status
        </div>
        {AGENTS.map(({ label, showAt, doneAt }) => {
          if (frame < showAt) return null;
          const isDone = frame >= doneAt;
          const statusColor = isDone ? STATUS_DONE : STATUS_RUNNING;
          const statusText = isDone ? "DONE" : "RUNNING";
          // Entrance: fade in over 6 frames from showAt
          const fadeIn = interpolate(frame - showAt, [0, 6], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                opacity: fadeIn,
              }}
            >
              <span
                style={{
                  color: TEXT,
                  fontFamily: '"Courier New", Courier, monospace',
                  fontSize: 24,
                  fontWeight: 700,
                }}
              >
                {label}
              </span>
              <span
                style={{
                  color: statusColor,
                  fontFamily: '"Courier New", Courier, monospace',
                  fontSize: 22,
                  letterSpacing: "0.06em",
                  textShadow: `0 0 20px ${statusColor}66`,
                }}
              >
                {statusText}
              </span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
