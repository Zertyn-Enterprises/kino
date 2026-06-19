import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { useTheme } from "../../../lib/theme";
import { NorraSite } from "./ui/NorraSite";
import {
  burstSchedule,
  charsVisible,
  Cursor,
  PROMPT,
  Terminal,
} from "./ui/Terminal";
import { pulseGlow } from "./ui/bits";

const CMD = "git push";
const TYPE_FRAMES = burstSchedule(CMD, 2, { burst: [4, 4], pause: [1, 2] });
const SWAP = 30; // the zero-gap cut: Enter IS the live site

/** The drop. Cause and effect collapse onto one beat. */
export const Reveal: React.FC = () => {
  const t = useTheme();
  const frame = useCurrentFrame();

  if (frame < SWAP) {
    const typed = CMD.slice(0, charsVisible(frame, TYPE_FRAMES));
    return (
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <Terminal width={1300} minHeight={580}>
          <div>
            <span style={{ color: t.palette.textDim }}>{PROMPT} </span>
            <span>{typed}</span>
            <Cursor frame={frame} visible={frame < 29} />
          </div>
        </Terminal>
      </AbsoluteFill>
    );
  }

  const local = frame - SWAP;
  // Lime ripple expanding from where the cursor was.
  const rippleP = interpolate(local, [0, 18], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const flash = interpolate(local, [0, 3], [0.1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const wordmarkP = interpolate(local, [18, 32], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const captionP = interpolate(local, [45, 59], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const breathe = 1 + (local / 90) * 0.015;
  const urlPulse = pulseGlow(local - 18, 30, local >= 18 ? 1 : 0);

  return (
    <AbsoluteFill>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 96px",
          height: 170,
        }}
      >
        <div
          style={{
            fontFamily: t.fonts.display.family,
            fontWeight: t.fonts.display.weight,
            fontSize: 72,
            letterSpacing: "-0.02em",
            color: t.palette.text,
            opacity: wordmarkP,
            transform: `translateY(${(1 - wordmarkP) * 14}px)`,
          }}
        >
          Relay
        </div>
        <div
          style={{
            fontFamily: t.fonts.body.family,
            fontWeight: t.fonts.body.weight,
            fontSize: 40,
            color: t.palette.text,
            opacity: captionP,
            transform: `translateY(${(1 - captionP) * 12}px)`,
          }}
        >
          Push. It&apos;s already live.
        </div>
      </div>

      <AbsoluteFill
        style={{ alignItems: "center", justifyContent: "flex-end" }}
      >
        <div
          style={{
            transform: `scale(${breathe})`,
            transformOrigin: "center 70%",
          }}
        >
          <div
            style={{
              width: 1600,
              borderRadius: `${t.radius.lg}px ${t.radius.lg}px 0 0`,
              border: "1px solid rgba(255,255,255,0.1)",
              borderBottom: "none",
              overflow: "hidden",
              boxShadow: `0 -10px 80px rgba(0,0,0,0.5), 0 0 ${40 + urlPulse * 50}px rgba(182,242,46,${0.06 + urlPulse * 0.1})`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "12px 18px",
                background: "#101511",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
                <div
                  key={c}
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    background: c,
                  }}
                />
              ))}
              <div
                style={{ flex: 1, display: "flex", justifyContent: "center" }}
              >
                <div
                  style={{
                    fontFamily: t.fonts.mono?.family,
                    fontSize: 19,
                    color: t.palette.accent,
                    background: `rgba(182,242,46,${0.07 + urlPulse * 0.09})`,
                    border: `1px solid rgba(182,242,46,${0.3 + urlPulse * 0.45})`,
                    borderRadius: 8,
                    padding: "5px 18px",
                  }}
                >
                  storefront-7f3a2.relay.dev
                </div>
              </div>
              <div style={{ width: 64 }} />
            </div>
            <NorraSite variant="v42" width={1600} />
          </div>
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            left: 660,
            top: 540,
            width: 60,
            height: 60,
            borderRadius: "50%",
            transform: `translate(-50%, -50%) scale(${rippleP * 55})`,
            background:
              "radial-gradient(circle, rgba(182,242,46,0.5) 0%, rgba(182,242,46,0) 62%)",
            opacity: 1 - rippleP,
            mixBlendMode: "screen",
          }}
        />
        <AbsoluteFill
          style={{ background: t.palette.accent, opacity: flash }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
