import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { useTheme } from "../../../lib/theme";
import { brand, grid, ink, space, type } from "../theme";
import { Icon, type IconName } from "./ui/icons";
import { MacWindow, ReceiptChip } from "./ui/system";

/** Charge-stamp frames (scene-local) — Main's SFX grid reads this. */
export const INDICT_BEATS = [0, 78, 157] as const;

const WINDOW_IN = 6;
const STAMP_FRAMES = 10;
const CHIP_LAG = 8;
const DIM_FRAMES = 12;
/** One extraction string's journey: over the page → off the frame's top. */
const LEAK_PERIOD = 90;
const LEAK_FROM = 640;
const LEAK_TO = -60;
const PULSE_PERIOD = 24;

const CLAMP = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

type Charge = {
  icon: IconName;
  lines: [string, string];
  receipt: string;
  active?: boolean;
};

// Statements broken at their natural caesura — the joined lines are the
// founder's exact copy.
const CHARGES: Charge[] = [
  {
    icon: "mic",
    lines: ["your notetaker hears", "every meeting."],
    receipt: "granola — $14/mo · cloud",
  },
  {
    icon: "clipboard",
    lines: ["your clipboard sees", "every api key."],
    receipt: "raycast · synced",
  },
  {
    icon: "scanText",
    lines: ["your ocr reads", "everything on screen."],
    receipt: "textsniper",
    active: true,
  },
];

// Extraction strings rise on loop: launch 30f apart, each travelling the
// styleframe's corridor (over the page → past window top → cropped by the
// frame edge) every LEAK_PERIOD frames, fading in/out at the ends.
const LEAKS = [
  { text: "payroll_q3.xlsx — 2.4 MB", x: grid.x(8), launch: 25 },
  { text: "DATABASE_URL=postgres://••••", x: grid.x(8) + space[7], launch: 55 },
  { text: "sk-••••••••••••", x: grid.x(9), launch: 85 },
];

const AGENDA = [
  "1 — revenue & gross margin",
  "2 — runway and hiring plan",
  "3 — enterprise pipeline",
];

const TABLE = [
  { label: "revenue", bars: [96, 64] },
  { label: "burn", bars: [72, 104] },
  { label: "runway", bars: [120, 56] },
];

const WINDOW_TOP = 320;
const WINDOW_H = 600;

/** S2 — the indictment: three charges stamp on the beats; the window leaks. */
export const Indict: React.FC<{ moment?: number }> = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { springs, enterFrames } = useTheme().motion;

  const windowIn = spring({
    frame: frame - WINDOW_IN,
    fps,
    config: springs.settle,
    durationInFrames: enterFrames,
  });
  const pulse = 0.925 + 0.075 * Math.sin((frame / PULSE_PERIOD) * Math.PI * 2);

  return (
    <AbsoluteFill style={{ background: ink.coldBg }}>
      {/* Region A — the charges, cols 0–5 */}
      <div
        style={{
          position: "absolute",
          left: grid.x(0),
          top: 200,
          width: grid.w(6),
          display: "flex",
          flexDirection: "column",
          gap: space[7],
        }}
      >
        {CHARGES.map((charge, i) => {
          const beat = INDICT_BEATS[i];
          const nextBeat = INDICT_BEATS[i + 1];
          const stamp = spring({
            frame: frame - beat,
            fps,
            config: springs.snap,
            durationInFrames: STAMP_FRAMES,
          });
          const chipIn = spring({
            frame: frame - beat - CHIP_LAG,
            fps,
            config: springs.snap,
            durationInFrames: STAMP_FRAMES,
          });
          const dim =
            nextBeat === undefined
              ? 1
              : interpolate(
                  frame,
                  [nextBeat, nextBeat + DIM_FRAMES],
                  [1, 0.55],
                  CLAMP,
                );
          return (
            <div
              key={charge.icon}
              style={{
                display: "flex",
                gap: space[4],
                opacity: stamp * dim,
                transform: `scale(${0.97 + stamp * 0.03})`,
                transformOrigin: "left center",
              }}
            >
              <Icon
                name={charge.icon}
                size={34}
                color={charge.active ? brand.coral : ink.dim}
                style={{ marginTop: 14, flexShrink: 0 }}
              />
              <div>
                <div style={{ ...type.statement, color: ink.text }}>
                  {charge.lines[0]}
                  <br />
                  {charge.lines[1]}
                </div>
                <ReceiptChip
                  accent={charge.active ? brand.coral : undefined}
                  style={{
                    marginTop: space[3],
                    whiteSpace: "nowrap",
                    opacity: chipIn,
                    transform: `scale(${0.97 + chipIn * 0.03})`,
                    transformOrigin: "left center",
                  }}
                >
                  {charge.receipt}
                </ReceiptChip>
              </div>
            </div>
          );
        })}
      </div>

      {/* Region B — the evidence window, cols 7–11 */}
      <MacWindow
        title="Q3 board deck — Preview"
        width={grid.w(5)}
        height={WINDOW_H}
        style={{
          position: "absolute",
          left: grid.x(7),
          top: WINDOW_TOP,
          opacity: Math.min(1, windowIn),
          transform: `translateX(${(1 - windowIn) * 40}px)`,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            padding: space[6],
            // surveillance never sleeps — the document creeps upward forever
            transform: `translateY(${-frame * 0.06}px)`,
          }}
        >
          <div style={{ ...type.body, color: ink.dim }}>agenda</div>
          <div
            style={{
              marginTop: space[4],
              display: "flex",
              flexDirection: "column",
              gap: space[2],
            }}
          >
            {AGENDA.map((line) => (
              <div key={line} style={{ ...type.caption, color: ink.dim }}>
                {line}
              </div>
            ))}
          </div>
          <div
            style={{
              position: "absolute",
              left: space[6],
              right: space[6],
              bottom: space[6],
              paddingTop: space[4],
              borderTop: `1px solid ${ink.border}`,
              display: "flex",
              flexDirection: "column",
              gap: space[3],
            }}
          >
            {TABLE.map((row) => (
              <div
                key={row.label}
                style={{ display: "flex", alignItems: "center" }}
              >
                <div style={{ ...type.mono, color: ink.faint, width: 180 }}>
                  {row.label}
                </div>
                {row.bars.map((w, j) => (
                  <div key={j} style={{ width: 170 }}>
                    <div
                      style={{
                        width: w,
                        height: 12,
                        borderRadius: 6,
                        background: ink.border,
                      }}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </MacWindow>

      {/* The extraction strings — the only color in the frame */}
      {LEAKS.map((leak) => {
        if (frame < leak.launch) return null;
        const phase = (frame - leak.launch) % LEAK_PERIOD;
        const y = interpolate(phase, [0, LEAK_PERIOD], [LEAK_FROM, LEAK_TO]);
        const opacity = interpolate(
          phase,
          [0, 12, 45, 88],
          [0, 0.95, 0.78, 0],
          CLAMP,
        );
        return (
          <div
            key={leak.text}
            style={{
              ...type.mono,
              position: "absolute",
              left: leak.x,
              top: y,
              color: brand.coral,
              opacity,
              whiteSpace: "nowrap",
              textShadow: "0 2px 18px rgba(10,11,14,0.9)",
            }}
          >
            {leak.text}
          </div>
        );
      })}

      {/* Region C — destination label, above the window */}
      <div
        style={{
          ...type.label,
          position: "absolute",
          left: grid.x(7),
          top: 110,
          color: brand.coral,
          opacity: Math.min(1, windowIn) * pulse,
        }}
      >
        uploading · third-party cloud
      </div>
    </AbsoluteFill>
  );
};
