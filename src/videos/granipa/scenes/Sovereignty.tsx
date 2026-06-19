import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { SpringPhysics } from "../../../lib/springs";
import { charsVisible } from "../../../lib/typing";
import { brand, granipaTheme, grid, ink, space, type } from "../theme";
import { Icon, type IconName } from "./ui/icons";

/** Item-drop frames (scene-local) — Main's SFX grid reads this export. */
export const SOV_BEATS = [15, 30, 44] as const;
/** The delete keypress (scene-local). */
export const DELETE_AT = 70;

const FILES: ReadonlyArray<{ icon: IconName; name: string }> = [
  { icon: "database", name: "granipa.db" },
  { icon: "fileText", name: "transcripts/" },
  { icon: "clipboard", name: "clips.db" },
  { icon: "eye", name: "ocr/" },
];

const CARD_W = 560;
const CARD_H = 420;

const H2_IN = 0;
const CARD_IN = 6;
const DELETE_LINE_IN = 14;
// Four files on three beats: the last row rides beat 3, one stagger later.
const ROW_INS = [
  SOV_BEATS[0],
  SOV_BEATS[1],
  SOV_BEATS[2],
  SOV_BEATS[2] + granipaTheme.motion.staggerFrames,
] as const;
const FOOTER_IN = 52;
const DISSOLVE_FROM = 84;
const DISSOLVE_TO = 128;
const PROMPT_OUT_FROM = 116;

const CMD = "rm -rf ~/Grañipa";
// Burst-typed: pauses after "rm " and "-rf ", finishing at DELETE_AT + 12.
const CMD_FRAMES = [0, 1, 2, 4, 4, 5, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12].map(
  (o) => DELETE_AT + o,
);

/**
 * S7 · sovereignty — motion (quality.md stage D).
 * Ownership made physical: the folder assembles row by row on the beats,
 * the mono trash command types, and the card dissolves upward — leaving
 * the sentence to land in stillness.
 */
export const Sovereignty: React.FC<{ moment?: number }> = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { settle, snap } = granipaTheme.motion.springs;

  const enter = (
    at: number,
    config: SpringPhysics,
    durationInFrames: number,
  ): number => spring({ frame: frame - at, fps, config, durationInFrames });

  const h2In = enter(H2_IN, settle, 12);
  const lineIn = enter(DELETE_LINE_IN, settle, 12);
  const cardIn = enter(CARD_IN, settle, 16);
  const footerIn = enter(FOOTER_IN, snap, 8);

  const cardGone = interpolate(frame, [DISSOLVE_FROM, DISSOLVE_TO], [0, 1], {
    easing: Easing.in(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const promptGone = interpolate(
    frame,
    [PROMPT_OUT_FROM, DISSOLVE_TO],
    [0, 1],
    {
      easing: Easing.in(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  const typedChars = charsVisible(frame, CMD_FRAMES);
  const typing = frame >= DELETE_AT && typedChars < CMD.length;
  const caretOn = typing || Math.floor(frame / 8) % 2 === 0;

  return (
    <AbsoluteFill style={{ background: ink.warmBg }}>
      {/* Region B — the folder card (cols 1–5) */}
      <div
        style={{
          position: "absolute",
          left: grid.x(1),
          top: (1080 - CARD_H) / 2,
          width: CARD_W,
          height: CARD_H,
          background: ink.surface,
          border: `1px solid ${ink.border}`,
          borderRadius: 22,
          padding: space[6],
          display: "flex",
          flexDirection: "column",
          opacity: cardIn * (1 - cardGone),
          transform: `translate(${(1 - cardIn) * -30}px, ${cardGone * -40}px)`,
          filter: `blur(${cardGone * 2}px)`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
          <Icon name="folder" size={36} color={brand.blue} />
          <span style={{ ...type.mono, color: ink.text }}>~/Grañipa</span>
          <span style={{ ...type.mono, color: ink.dim, marginLeft: "auto" }}>
            412 MB
          </span>
        </div>
        <div
          style={{
            height: 1,
            background: ink.border,
            margin: `${space[4]}px 0`,
          }}
        />
        <div
          style={{ display: "flex", flexDirection: "column", gap: space[3] }}
        >
          {FILES.map((f, i) => {
            const rowIn = enter(ROW_INS[i], snap, 8);
            return (
              <div
                key={f.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: space[2],
                  opacity: rowIn,
                  transform: `translateX(${(1 - rowIn) * -12}px)`,
                }}
              >
                <Icon name={f.icon} size={22} color={ink.faint} />
                <span style={{ ...type.mono, color: ink.dim }}>{f.name}</span>
              </div>
            );
          })}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: space[2],
            marginTop: "auto",
            opacity: footerIn,
            transform: `translateX(${(1 - footerIn) * -12}px)`,
          }}
        >
          <Icon name="hardDrive" size={22} color={ink.faint} />
          <span style={{ ...type.caption, color: ink.faint }}>
            local disk — nothing synced
          </span>
        </div>
      </div>

      {/* Region A — the sentence (cols 6–11, vertically centered) */}
      <div
        style={{
          position: "absolute",
          left: grid.x(6),
          width: grid.w(6),
          top: 0,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: space[4],
        }}
      >
        <div
          style={{
            ...type.h2,
            color: ink.text,
            opacity: h2In,
            transform: `translateY(${(1 - h2In) * 8}px)`,
          }}
        >
          everything lives
          <br />
          in one folder.
        </div>
        <div
          style={{
            ...type.body,
            color: ink.dim,
            opacity: lineIn,
            transform: `translateY(${(1 - lineIn) * 8}px)`,
          }}
        >
          {"delete it — it's gone."}
        </div>
      </div>

      {/* Region C — the literal delete (cols 6–11, under Region A) */}
      <div
        style={{
          position: "absolute",
          left: grid.x(6),
          top: 760,
          display: "flex",
          alignItems: "center",
          gap: space[3],
          opacity: footerIn * (1 - promptGone),
          transform: `translateX(${(1 - footerIn) * -12}px)`,
        }}
      >
        <Icon name="trash2" size={26} color={ink.faint} />
        <span style={{ ...type.mono, color: ink.faint }}>
          {`$ ${CMD.slice(0, typedChars)}`}
          <span
            style={{
              display: "inline-block",
              width: 12,
              height: 22,
              marginLeft: 3,
              transform: "translateY(3px)",
              background: ink.faint,
              opacity: caretOn ? 0.9 : 0,
            }}
          />
        </span>
      </div>
    </AbsoluteFill>
  );
};
