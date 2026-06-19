import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand, granipaTheme, ink, space, type } from "../theme";
import { GithubMark } from "./ui/icons";
import { LogoTile, ReceiptChip } from "./ui/system";

/** The URL chip pop, beat-aligned (Main.tsx places SFX on it; motion.md S9). */
export const URL_POP = 44;

/**
 * S9 — cta motion (quality.md stage D). The calm end card: lockup settles,
 * claim and address follow, the rec seam wakes last. Full hold from f120 —
 * thumbnail-stable; the music fades out over it.
 */

const LOGO_SIZE = 190;
const LOCKUP_CENTER_Y = 400;
const SEAM_Y = 980;
const GLOW_R = 540;

const CLAIM_AT = 18;
const SEAM_AT = 62;

/** Static 14-bar waveform, heights 8–24, speech-like bursts (deterministic). */
const WAVE_HEIGHTS = [9, 14, 22, 17, 10, 8, 13, 24, 19, 12, 16, 21, 11, 9];

const { springs } = granipaTheme.motion;
const EASE = Easing.bezier(0.16, 1, 0.3, 1);
const CLAMP = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

export const Cta: React.FC<{ moment?: number }> = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const lockup = spring({
    frame,
    fps,
    config: springs.settle,
    durationInFrames: 14,
  });

  const fadeUp = (
    at: number,
    dist: number,
    dur: number,
  ): React.CSSProperties => {
    const p = interpolate(frame - at, [0, dur], [0, 1], {
      easing: EASE,
      ...CLAMP,
    });
    return { opacity: p, transform: `translateY(${(1 - p) * dist}px)` };
  };

  const chipPop = spring({
    frame,
    fps,
    delay: URL_POP,
    config: springs.snap,
    durationInFrames: 8,
  });
  const chipIn = interpolate(frame - URL_POP, [0, 4], [0, 1], CLAMP);

  const seamP = interpolate(frame - SEAM_AT, [0, 10], [0, 1], {
    easing: EASE,
    ...CLAMP,
  });

  const barHeight = (base: number, i: number): number => {
    const period = 24 + (i % 5) * 4;
    const wave = Math.sin((frame / period) * Math.PI * 2 + i * 1.7) * 3;
    return Math.min(24, Math.max(8, base + wave));
  };

  return (
    <AbsoluteFill style={{ background: ink.warmBg }}>
      <div
        style={{
          position: "absolute",
          left: 960 - GLOW_R,
          top: LOCKUP_CENTER_Y - GLOW_R,
          width: GLOW_R * 2,
          height: GLOW_R * 2,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(61,139,255,0.08) 0%, rgba(61,139,255,0) 70%)",
          opacity: Math.min(1, lockup),
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: LOCKUP_CENTER_Y - LOGO_SIZE / 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: space[6] }}>
          <LogoTile
            size={LOGO_SIZE}
            glow={0.4}
            style={{ transform: `scale(${0.92 + 0.08 * lockup})` }}
          />
          <div
            style={{
              ...type.hero,
              color: ink.text,
              opacity: Math.min(1, lockup),
            }}
          >
            Grañipa
          </div>
        </div>
        <div
          style={{
            ...type.body,
            color: ink.dim,
            marginTop: space[5],
            ...fadeUp(CLAIM_AT, 8, 12),
          }}
        >
          open source · on-device · free
        </div>
        <ReceiptChip
          style={{
            marginTop: space[6],
            whiteSpace: "nowrap",
            opacity: chipIn,
            transform: `scale(${1.04 - 0.04 * chipPop})`,
          }}
        >
          <GithubMark size={26} color={ink.text} />
          <span style={{ color: ink.text }}>
            github.com/Zertyn-Enterprises/granipa
          </span>
        </ReceiptChip>
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: SEAM_Y,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: space[0],
          opacity: seamP,
          transform: `translateY(calc(-50% + ${(1 - seamP) * 8}px))`,
        }}
      >
        <span style={{ ...type.mono, color: ink.faint, marginRight: space[3] }}>
          ● rec — local
        </span>
        {WAVE_HEIGHTS.map((h, i) => (
          <span
            key={`bar-${i}`}
            style={{
              width: 4,
              height: barHeight(h, i),
              borderRadius: 2,
              background: brand.blue,
              opacity: 0.55,
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};
