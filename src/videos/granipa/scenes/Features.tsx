import {
  AbsoluteFill,
  Easing,
  interpolate,
  interpolateColors,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { useTheme } from "../../../lib/theme";
import { burstSchedule, charsVisible } from "../../../lib/typing";
import { brand, grid, ink, space, type } from "../theme";
import { Icon, type IconName } from "./ui/icons";
import { Kbd, MacWindow, ReceiptChip } from "./ui/system";

/** Pop frames (scene-local) — Main's SFX grid reads this export. */
export const FEATURE_POPS = [8, 59, 118, 177] as const;

const WINDOW_W = 1460;
const WINDOW_H = 690;
const WINDOW_LEFT = grid.x(1) + (grid.w(11) - WINDOW_W) / 2;
const WINDOW_IN_FRAMES = 12;

/** Pane switch crossfade; sidebar pill + dock highlight follow in sync. */
const XFADE = 6;
const FOLLOW_FRAMES = 8;
const STAGGER = 4;
const DOT_PERIOD = 16;
const CARET_BLINK = 16;

const CLAMP = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

const NAV: { icon: IconName; name: string }[] = [
  { icon: "mic", name: "Notes" },
  { icon: "clipboard", name: "Clipboard" },
  { icon: "scanText", name: "Screen OCR" },
  { icon: "layoutGrid", name: "Snapping" },
];

// Pill geometry derived from the locked nav row box (padding + caption line).
const NAV_ROW_H =
  space[2] * 2 + type.caption.fontSize * type.caption.lineHeight;
const PILL_STEP = NAV_ROW_H + space[1];

const TRANSCRIPT: {
  at?: string;
  who: string;
  said: string;
  caret?: boolean;
}[] = [
  { at: "00:14", who: "Maya", said: "let's ship the beta on friday." },
  { at: "00:15", who: "Jon", said: "i'll cut the build tonight." },
  {
    at: "00:16",
    who: "Maya",
    said: "cerramos el deck mañana — works for everyone?",
  },
  { who: "Jon", said: "on it", caret: true },
];

// Rows chain f9→f41 ("who" counts as the first word), so pane 1 sits fully
// settled for 18f before the f59 switch and matches the styleframe at f50.
const ROW_STARTS = [9, 18, 26, 39] as const;
const TYPE_RHYTHM = { burst: [5, 4, 6], pause: [1, 1] } as const;
const ROW_WORD_FRAMES = TRANSCRIPT.map((row, i) =>
  burstSchedule(
    "•".repeat(1 + row.said.split(" ").length),
    ROW_STARTS[i] ?? 0,
    TYPE_RHYTHM,
  ),
);
const CHIP_IN = 30;

const DOCK: { icon: IconName; name: string; kbd?: string }[] = [
  { icon: "mic", name: "transcription" },
  { icon: "clipboard", name: "clipboard", kbd: "⌥⇧V" },
  { icon: "scanText", name: "screen ocr", kbd: "⌥⇧T" },
  { icon: "layoutGrid", name: "snapping", kbd: "⌃⌥←" },
];

const CLIP_ROWS: { text: string; meta: string; swatch?: boolean }[] = [
  { text: "sk-••••••••", meta: "now" },
  { text: "meeting notes — 14:02", meta: "2m ago" },
  { text: "https://granipa.dev/docs", meta: "9m ago" },
  { text: "#3D8BFF", meta: "14m ago", swatch: true },
  { text: ".env — DATABASE_URL=••••", meta: "31m ago" },
];

const SHOT_W = 560;
const SHOT_H = 360;
const OCR_BARS: { y: number; w: number; target?: boolean }[] = [
  { y: 30, w: 300 },
  { y: 66, w: 470 },
  { y: 94, w: 430 },
  { y: 122, w: 480 },
  { y: 164, w: 280, target: true },
  { y: 192, w: 310, target: true },
  { y: 220, w: 250, target: true },
  { y: 262, w: 450 },
  { y: 290, w: 390 },
];
const MARQ = { x: 16, y: 152, w: 332, h: 96 };
const OCR_LINES = ["invoice #2041", "due — march 14", "total — $1,284.00"];

const DESK_W = 960;
const DESK_H = 392;
const DESK_BAR = 26;
const SNAP_PAD = 12;
const HALF_W = (DESK_W - SNAP_PAD * 3) / 2;
const HALF_TOP = DESK_BAR + SNAP_PAD;
const HALF_H = DESK_H - HALF_TOP - SNAP_PAD;

const TranscriptRow: React.FC<{
  at?: string;
  who: string;
  said: string;
  caret?: boolean;
  wordsShown: number;
  tsOpacity: number;
  caretOpacity: number;
}> = ({ at, who, said, caret, wordsShown, tsOpacity, caretOpacity }) => {
  const shownSaid = said
    .split(" ")
    .slice(0, Math.max(0, wordsShown - 1))
    .join(" ");
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: space[4] }}>
      <div
        style={{
          ...type.mono,
          color: ink.faint,
          width: 76,
          flexShrink: 0,
          opacity: tsOpacity,
        }}
      >
        {at ?? ""}
      </div>
      <div style={{ ...type.body, color: ink.dim }}>
        {wordsShown > 0 ? (
          <span style={{ color: ink.text }}>{who}:</span>
        ) : null}{" "}
        {shownSaid}
        {caret ? (
          <span
            style={{
              display: "inline-block",
              width: 2,
              height: 34,
              background: brand.blue,
              marginLeft: space[1],
              verticalAlign: "-5px",
              opacity: caretOpacity,
            }}
          />
        ) : null}
      </div>
    </div>
  );
};

const PaneHeader: React.FC<{ title: string; hint: string }> = ({
  title,
  hint,
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    }}
  >
    <div style={{ ...type.statement, color: ink.text }}>{title}</div>
    <Kbd>{hint}</Kbd>
  </div>
);

/** Pane 1 — the approved styleframe state, typed on live. */
const NotesPane: React.FC = () => {
  const frame = useCurrentFrame();
  const dot =
    0.45 +
    0.55 * (0.5 + 0.5 * Math.cos(((frame - 50) / DOT_PERIOD) * Math.PI * 2));
  const chipIn = interpolate(frame, [CHIP_IN, CHIP_IN + 10], [0, 1], CLAMP);
  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ ...type.statement, color: ink.text }}>weekly sync</div>
        <div
          style={{
            ...type.mono,
            color: brand.blue,
            background: "rgba(61,139,255,0.08)",
            border: "1px solid rgba(61,139,255,0.30)",
            borderRadius: 999,
            padding: `${space[1]}px ${space[4]}px`,
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ opacity: dot }}>●</span> transcribing — locally
        </div>
      </div>

      <div
        style={{
          marginTop: space[6],
          display: "flex",
          flexDirection: "column",
          gap: space[5],
        }}
      >
        {TRANSCRIPT.map((row, i) => {
          const schedule = ROW_WORD_FRAMES[i] ?? [];
          const start = ROW_STARTS[i] ?? 0;
          const done = schedule[schedule.length - 1] ?? 0;
          const caretOpacity =
            frame < start
              ? 0
              : frame <= done
                ? 1
                : Math.floor((frame - done) / CARET_BLINK) % 2 === 0
                  ? 1
                  : 0;
          return (
            <TranscriptRow
              key={i}
              at={row.at}
              who={row.who}
              said={row.said}
              caret={row.caret}
              wordsShown={charsVisible(frame, schedule)}
              tsOpacity={interpolate(frame, [start, start + 6], [0, 1], CLAMP)}
              caretOpacity={caretOpacity}
            />
          );
        })}
      </div>

      <div style={{ flex: 1 }} />
      <ReceiptChip
        style={{
          alignSelf: "flex-start",
          whiteSpace: "nowrap",
          opacity: chipIn,
        }}
      >
        any language · no bot in the call
      </ReceiptChip>
    </>
  );
};

/** Pane 2 — clipboard history, five rows ticking in. */
const ClipboardPane: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { springs } = useTheme().motion;
  const at = FEATURE_POPS[1];
  return (
    <>
      <PaneHeader title="clipboard history" hint="⌥⇧V" />
      <div
        style={{
          marginTop: space[6],
          display: "flex",
          flexDirection: "column",
        }}
      >
        {CLIP_ROWS.map((row, i) => {
          const s = spring({
            frame: frame - (at + 2 + i * STAGGER),
            fps,
            config: springs.snap,
            durationInFrames: 8,
          });
          return (
            <div
              key={row.text}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: `${space[3]}px 0`,
                borderBottom:
                  i < CLIP_ROWS.length - 1
                    ? `1px solid ${ink.border}`
                    : undefined,
                opacity: s,
                transform: `translateY(${(1 - s) * 10}px)`,
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: space[3] }}
              >
                {row.swatch ? (
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 4,
                      background: brand.blue,
                      flexShrink: 0,
                    }}
                  />
                ) : null}
                <span style={{ ...type.mono, color: ink.text }}>
                  {row.text}
                </span>
              </div>
              <span style={{ ...type.mono, color: ink.faint }}>{row.meta}</span>
            </div>
          );
        })}
      </div>
    </>
  );
};

/** Pane 3 — a dim screenshot; the marquee draws, the text walks out. */
const OcrPane: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { springs } = useTheme().motion;
  const at = FEATURE_POPS[2];
  const draw = interpolate(frame, [at + 4, at + 16], [0, 1], {
    ...CLAMP,
    easing: Easing.out(Easing.cubic),
  });
  const fill = interpolate(frame, [at + 16, at + 22], [0, 0.08], CLAMP);
  const perim = 2 * (MARQ.w + MARQ.h);
  return (
    <>
      <PaneHeader title="screen ocr" hint="⌥⇧T" />
      <div
        style={{
          marginTop: space[6],
          display: "flex",
          gap: space[7],
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            position: "relative",
            width: SHOT_W,
            height: SHOT_H,
            borderRadius: 14,
            border: `1px solid ${ink.border}`,
            background: "rgba(255,255,255,0.03)",
            flexShrink: 0,
          }}
        >
          {OCR_BARS.map((bar) => (
            <div
              key={bar.y}
              style={{
                position: "absolute",
                left: 28,
                top: bar.y,
                width: bar.w,
                height: 14,
                borderRadius: 7,
                background: bar.target ? "rgba(255,255,255,0.16)" : ink.border,
              }}
            />
          ))}
          {frame >= at + 4 ? (
            <svg
              width={SHOT_W}
              height={SHOT_H}
              style={{ position: "absolute", left: 0, top: 0 }}
            >
              <rect
                x={MARQ.x}
                y={MARQ.y}
                width={MARQ.w}
                height={MARQ.h}
                rx={8}
                fill={brand.blue}
                fillOpacity={fill}
                stroke={brand.blue}
                strokeWidth={2.5}
                strokeDasharray={perim}
                strokeDashoffset={perim * (1 - draw)}
              />
            </svg>
          ) : null}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: space[4],
            // sits beside the marquee block — the lines read as walking out of it
            paddingTop: MARQ.y - space[3],
          }}
        >
          {["extracted — on-device", ...OCR_LINES].map((line, i) => {
            const s = spring({
              frame: frame - (at + 18 + i * STAGGER),
              fps,
              config: springs.snap,
              durationInFrames: 8,
            });
            return (
              <div
                key={line}
                style={{
                  ...type.mono,
                  color: i === 0 ? ink.faint : ink.text,
                  opacity: s,
                  transform: `translateY(${(1 - s) * 10}px)`,
                }}
              >
                {line}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

const SnapWindow: React.FC<{
  left: number;
  at: number;
  fromX: number;
  bars: number[];
}> = ({ left, at, fromX, bars }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { springs } = useTheme().motion;
  const s = spring({
    frame: frame - at,
    fps,
    config: springs.snap,
    durationInFrames: 10,
  });
  const o = interpolate(frame, [at, at + 4], [0, 1], CLAMP);
  return (
    <div
      style={{
        position: "absolute",
        left,
        top: HALF_TOP,
        width: HALF_W,
        height: HALF_H,
        borderRadius: 10,
        border: `1px solid ${ink.border}`,
        background: "rgba(24,25,31,0.9)",
        overflow: "hidden",
        opacity: o,
        transform: `translate(${(1 - s) * fromX}px, ${(1 - s) * 40}px) scale(${
          0.94 + s * 0.06
        })`,
      }}
    >
      <div
        style={{
          height: 30,
          borderBottom: `1px solid ${ink.border}`,
          background: "rgba(255,255,255,0.03)",
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "0 12px",
        }}
      >
        {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
          <div
            key={c}
            style={{ width: 8, height: 8, borderRadius: 4, background: c }}
          />
        ))}
      </div>
      <div
        style={{
          padding: 18,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {bars.map((w, i) => (
          <div
            key={i}
            style={{
              width: `${w * 100}%`,
              height: 12,
              borderRadius: 6,
              background: ink.border,
            }}
          />
        ))}
      </div>
    </div>
  );
};

/** Pane 4 — mini desktop; two windows snap left, then right. */
const SnapPane: React.FC = () => {
  const at = FEATURE_POPS[3];
  return (
    <>
      <PaneHeader title="snapping" hint="⌃⌥←" />
      <div
        style={{
          position: "relative",
          marginTop: space[6],
          width: DESK_W,
          height: DESK_H,
          borderRadius: 14,
          border: `1px solid ${ink.border}`,
          background: "rgba(255,255,255,0.02)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: DESK_BAR,
            borderBottom: `1px solid ${ink.border}`,
            background: "rgba(255,255,255,0.04)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: DESK_W / 2,
            top: HALF_TOP,
            height: HALF_H,
            borderLeft: `1px dashed ${ink.border}`,
          }}
        />
        <SnapWindow
          left={SNAP_PAD}
          at={at + 6}
          fromX={150}
          bars={[0.8, 0.55, 0.7, 0.45]}
        />
        <SnapWindow
          left={SNAP_PAD * 2 + HALF_W}
          at={at + 18}
          fromX={-150}
          bars={[0.6, 0.75, 0.5, 0.65]}
        />
      </div>
    </>
  );
};

const PANES: React.FC[] = [NotesPane, ClipboardPane, OcrPane, SnapPane];

/** S5 — the product itself: the window cycles its four tools on the pops. */
export const Features: React.FC<{ moment?: number }> = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { springs } = useTheme().motion;

  const windowIn = spring({
    frame,
    fps,
    config: springs.settle,
    durationInFrames: WINDOW_IN_FRAMES,
  });

  const follow = (at: number) =>
    spring({
      frame: frame - at,
      fps,
      config: springs.snap,
      durationInFrames: FOLLOW_FRAMES,
    });
  const s1 = follow(FEATURE_POPS[1]);
  const s2 = follow(FEATURE_POPS[2]);
  const s3 = follow(FEATURE_POPS[3]);
  const ACT = [1 - s1, s1 - s2, s2 - s3, s3];
  const pillShift = s1 + s2 + s3;

  const paneOpacity = (i: number): number => {
    const from = FEATURE_POPS[i] ?? 0;
    const on = interpolate(frame, [from, from + XFADE], [0, 1], CLAMP);
    const next = FEATURE_POPS[i + 1];
    const off =
      next === undefined
        ? 0
        : interpolate(frame, [next, next + XFADE], [0, 1], CLAMP);
    return on * (1 - off);
  };

  return (
    <AbsoluteFill style={{ background: ink.warmBg }}>
      {/* Region A — section label */}
      <div
        style={{
          ...type.label,
          color: brand.blue,
          position: "absolute",
          left: grid.x(1),
          top: 60,
          opacity: interpolate(frame, [0, 8], [0, 1], CLAMP),
        }}
      >
        what it does — all of it on-device
      </div>

      {/* Region B — the rebuilt Grañipa window, mid-transcription */}
      <MacWindow
        title="Grañipa"
        width={WINDOW_W}
        height={WINDOW_H}
        style={{
          position: "absolute",
          left: WINDOW_LEFT,
          top: 130,
          opacity: Math.min(1, windowIn),
          transform: `scale(${0.985 + windowIn * 0.015})`,
        }}
      >
        <div style={{ display: "flex", height: "100%" }}>
          {/* sidebar */}
          <div
            style={{
              width: 280,
              flexShrink: 0,
              borderRight: `1px solid ${ink.border}`,
              background: "rgba(255,255,255,0.015)",
              padding: space[3],
              display: "flex",
              flexDirection: "column",
              gap: space[1],
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: space[3],
                top: space[3] + pillShift * PILL_STEP,
                width: 280 - space[3] * 2,
                height: NAV_ROW_H,
                borderRadius: 10,
                background: "rgba(61,139,255,0.12)",
              }}
            />
            {NAV.map((row, i) => {
              const act = ACT[i] ?? 0;
              return (
                <div
                  key={row.name}
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    gap: space[2],
                    padding: `${space[2]}px ${space[3]}px`,
                    borderRadius: 10,
                  }}
                >
                  <Icon
                    name={row.icon}
                    size={24}
                    color={interpolateColors(
                      act,
                      [0, 1],
                      [ink.dim, brand.blue],
                    )}
                  />
                  <span
                    style={{
                      ...type.caption,
                      color: interpolateColors(
                        act,
                        [0, 1],
                        [ink.dim, ink.text],
                      ),
                    }}
                  >
                    {row.name}
                  </span>
                </div>
              );
            })}
          </div>

          {/* main pane — crossfades between the four tools on the pops */}
          <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
            {PANES.map((Pane, i) => {
              const o = paneOpacity(i);
              if (o <= 0) return null;
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    inset: 0,
                    padding: space[6],
                    display: "flex",
                    flexDirection: "column",
                    opacity: o,
                  }}
                >
                  <Pane />
                </div>
              );
            })}
          </div>
        </div>
      </MacWindow>

      {/* Region C — the dock of four tools, grid-placed. Enters AFTER the
          window + first pane settle (audit defect 5: one surface per beat) */}
      {DOCK.map((tool, i) => {
        const act = ACT[i] ?? 0;
        const dockIn = interpolate(
          frame,
          [30 + i * STAGGER, 40 + i * STAGGER],
          [0, 1],
          { easing: Easing.bezier(0.16, 1, 0.3, 1), ...CLAMP },
        );
        return (
          <div
            key={tool.name}
            style={{
              position: "absolute",
              left: grid.x(1 + i * 3),
              top: 900,
              height: 40,
              display: "flex",
              alignItems: "center",
              gap: space[2],
              opacity: dockIn,
              transform: `translateY(${8 * (1 - dockIn)}px)`,
            }}
          >
            <Icon
              name={tool.icon}
              size={30}
              color={interpolateColors(act, [0, 1], [ink.dim, brand.blue])}
            />
            <span style={{ ...type.caption, color: ink.text }}>
              {tool.name}
            </span>
            {tool.kbd ? (
              <Kbd size={20} style={{ marginLeft: space[1] }}>
                {tool.kbd}
              </Kbd>
            ) : null}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
