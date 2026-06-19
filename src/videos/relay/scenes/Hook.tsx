import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { useTheme } from "../../../lib/theme";
import {
  burstSchedule,
  charsVisible,
  Cursor,
  PROMPT,
  Terminal,
} from "./ui/Terminal";

// Negative start: half the command is already typed at frame 0, so the
// thumbnail (frame 0) catches the push mid-action.
const CMD = "git push origin main";
const TYPE_FRAMES = burstSchedule(CMD, -14);
const ENTER_AT = 38;

const pad = (n: number) => String(n).padStart(2, "0");

/** The world before Relay: push, queue, wait. Slow, grey, red. */
export const Hook: React.FC = () => {
  const t = useTheme();
  const frame = useCurrentFrame();

  const typed = CMD.slice(0, charsVisible(frame, TYPE_FRAMES));
  const entered = frame >= ENTER_AT;

  // Elapsed clock: 0:00 → 14:32, accelerating (time-lapse).
  const clockP = interpolate(frame, [75, 148], [0, 1], {
    easing: Easing.in(Easing.quad),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const elapsed = Math.floor(clockP * 872);
  const queuePos = frame < 95 ? 4 : frame < 125 ? 3 : 2;

  // Weary red pulse, 2-beat period — deliberately slower than Relay's pulse.
  const dotPulse = 0.62 + 0.26 * Math.sin((frame / 60) * Math.PI * 2);
  const drift = 1 + (frame / 150) * 0.02;

  const captionP = interpolate(frame, [90, 104], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ transform: `scale(${drift})` }}>
        <Terminal width={1300} minHeight={580}>
          <div>
            <span style={{ color: t.palette.textDim }}>{PROMPT} </span>
            <span>{typed}</span>
            {!entered && <Cursor frame={frame} />}
          </div>
          {frame >= 42 && (
            <div style={{ color: t.palette.textDim, fontSize: 24 }}>
              Enumerating objects: 128, done.
            </div>
          )}
          {frame >= 46 && (
            <div style={{ color: t.palette.textDim, fontSize: 24 }}>
              Writing objects: 100% (128/128), 84.21 KiB | 12.4 MiB/s
            </div>
          )}
          {frame >= 52 && (
            <div style={{ marginTop: 26 }}>
              <span style={{ color: t.palette.accentAlt, opacity: dotPulse }}>
                ●{" "}
              </span>
              <span>Queued — waiting for runner</span>
              <span style={{ color: t.palette.textDim }}>
                {"   "}(position {queuePos} in queue)
              </span>
            </div>
          )}
          {frame >= 75 && (
            <div
              style={{
                marginTop: 16,
                fontSize: 58,
                fontWeight: 700,
                color: t.palette.accentAlt,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {Math.floor(elapsed / 60)}:{pad(elapsed % 60)}
              <span
                style={{
                  fontSize: 24,
                  color: t.palette.textDim,
                  fontWeight: 400,
                }}
              >
                {"  "}elapsed
              </span>
            </div>
          )}
        </Terminal>
      </div>
      <div
        style={{
          position: "absolute",
          left: 96,
          bottom: 84,
          fontFamily: t.fonts.body.family,
          fontWeight: t.fonts.body.weight,
          fontSize: 34,
          color: t.palette.textDim,
          opacity: captionP,
          transform: `translateY(${(1 - captionP) * 18}px)`,
        }}
      >
        every push, every day
      </div>
    </AbsoluteFill>
  );
};
