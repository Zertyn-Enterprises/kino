import {
  AbsoluteFill,
  Easing,
  interpolate,
  interpolateColors,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand, granipaTheme, grid, ink, space, type } from "../theme";
import { Icon, type IconName } from "./ui/icons";
import { ReceiptChip } from "./ui/system";

/** The bloom (track hit 31s) — Main's SFX pair sits here. */
export const BLOOM = 88;

/** Nodes light on these beats; each connector wipes in 10f after its node. */
const NODE_BEATS = [15, 30, 45] as const;
const DOT_FROM = 45;
const DOT_PERIOD = 30;
const SEG_FRAMES = DOT_PERIOD / 3;
const CAPTION_AT = 100;
const CHIP_AT = 114;

const BOUNDARY = { left: grid.x(0), top: 340, width: grid.w(7), height: 460 };
const BEAM_Y = BOUNDARY.top + BOUNDARY.height / 2;
const BEAM_GLOW = "0 0 12px rgba(61,139,255,0.7)";

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

/** One signal dot hops the chain: segment 0/1/2 of a 30f loop, f59→bloom. */
const TravelerDot: React.FC<{ segment: number; color: string }> = ({
  segment,
  color,
}) => {
  const frame = useCurrentFrame();
  if (frame < DOT_FROM || frame >= BLOOM) return null;
  const t = (frame - DOT_FROM) % DOT_PERIOD;
  if (t < segment * SEG_FRAMES || t >= (segment + 1) * SEG_FRAMES) return null;
  const p = (t - segment * SEG_FRAMES) / SEG_FRAMES;
  const fade =
    interpolate(frame, [DOT_FROM, DOT_FROM + 4], [0, 1], clamp) *
    interpolate(frame, [BLOOM - 6, BLOOM], [1, 0], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: `${p * 100}%`,
        top: "50%",
        width: 3,
        height: 3,
        borderRadius: "50%",
        background: color,
        boxShadow: `0 0 6px ${color}`,
        transform: "translate(-50%,-50%)",
        opacity: fade,
      }}
    />
  );
};

const PipelineNode: React.FC<{
  icon: IconName;
  name: string;
  detail: string;
  litAt: number;
}> = ({ icon, name, detail, litAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // dim presence rises with the boundary draw, then the beat lights it.
  const dimIn = interpolate(frame, [8, 16], [0, 0.4], {
    easing: easeOut,
    ...clamp,
  });
  const lit = spring({
    frame: Math.max(0, frame - litAt),
    fps,
    config: granipaTheme.motion.springs.snap,
    durationInFrames: 10,
  });
  return (
    <div
      style={{
        background: ink.surface,
        borderRadius: 14,
        padding: space[4],
        display: "flex",
        flexDirection: "column",
        gap: space[2],
        flexShrink: 0,
        opacity: interpolate(lit, [0, 1], [dimIn, 1]),
      }}
    >
      <Icon
        name={icon}
        size={28}
        color={interpolateColors(lit, [0, 1], [ink.dim, ink.text])}
      />
      <div>
        <div style={{ ...type.caption, color: ink.text, whiteSpace: "nowrap" }}>
          {name}
        </div>
        <div style={{ ...type.caption, color: ink.dim, whiteSpace: "nowrap" }}>
          {detail}
        </div>
      </div>
    </div>
  );
};

const Connector: React.FC<{ wipeAt: number; segment: number }> = ({
  wipeAt,
  segment,
}) => {
  const frame = useCurrentFrame();
  const wipe = interpolate(frame, [wipeAt, wipeAt + 8], [0, 1], {
    easing: easeOut,
    ...clamp,
  });
  return (
    <div style={{ flex: 1, height: 2, position: "relative" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: ink.border,
          transform: `scaleX(${wipe})`,
          transformOrigin: "left",
        }}
      />
      <TravelerDot segment={segment} color={brand.blue} />
    </div>
  );
};

/**
 * S6 — the trust diagram, animated. The boundary draws itself, nodes light
 * on the beats, one signal dot patrols the chain, then the BLOOM sends the
 * single blue beam out to the terminal. Settled layout = approved styleframe.
 */
export const Architecture: React.FC<{ moment?: number }> = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // h2 settles f0–12.
  const h2P = interpolate(frame, [0, 10], [0, 1], {
    easing: easeOut,
    ...clamp,
  });

  // boundary rect draws f8–40; fill + glow rise with it.
  const draw = interpolate(frame, [6, 30], [0, 1], {
    easing: Easing.bezier(0.45, 0, 0.25, 1),
    ...clamp,
  });
  const fill = interpolate(frame, [6, 30], [0, 1], {
    easing: easeOut,
    ...clamp,
  });
  const tab = interpolate(frame, [26, 36], [0, 1], {
    easing: easeOut,
    ...clamp,
  });

  // BLOOM: border alpha 0.45→0.7, glows lift, ambient warms.
  const bloomP = interpolate(frame, [BLOOM, BLOOM + 12], [0, 1], {
    easing: easeOut,
    ...clamp,
  });
  const borderAlpha = 0.45 + 0.25 * bloomP;
  const glowOut = (0.1 + 0.06 * bloomP) * fill;
  const glowIn = (0.05 + 0.03 * bloomP) * fill;

  // exit stub (third connector, blue) wipes after node 3.
  const stubWipe = interpolate(frame, [53, 61], [0, 1], {
    easing: easeOut,
    ...clamp,
  });

  // the beam extends boundary→terminal over 10f at the bloom.
  const beamP = interpolate(frame, [BLOOM, BLOOM + 10], [0, 1], {
    easing: easeOut,
    ...clamp,
  });

  // terminal card pops as the beam lands.
  const termPop = spring({
    frame: Math.max(0, frame - (BLOOM + 10)),
    fps,
    config: granipaTheme.motion.springs.snap,
    durationInFrames: 10,
  });
  const termIn = interpolate(frame, [BLOOM + 10, BLOOM + 16], [0, 1], {
    easing: easeOut,
    ...clamp,
  });

  const captionP = interpolate(frame, [CAPTION_AT, CAPTION_AT + 10], [0, 1], {
    easing: easeOut,
    ...clamp,
  });
  const chipP = interpolate(frame, [CHIP_AT, CHIP_AT + 4], [0, 1], {
    easing: easeOut,
    ...clamp,
  });

  return (
    <AbsoluteFill style={{ background: ink.warmBg }}>
      {/* ambient warms at the bloom */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(1200px 800px at 35% 55%, rgba(61,139,255,0.05) 0%, transparent 70%)",
          opacity: bloomP,
          pointerEvents: "none",
        }}
      />

      {/* Region A — the claim */}
      <div
        style={{
          position: "absolute",
          left: grid.x(0),
          top: 130,
          // narrower than the cols 0–6 region on purpose: breaks the line
          // after "leaves" instead of widowing "mac."
          width: 780,
          maxWidth: grid.w(7),
          ...type.h2,
          color: ink.text,
          opacity: h2P,
          transform: `translateY(${8 * (1 - h2P)}px)`,
        }}
      >
        audio never leaves your mac.
      </div>

      {/* Region B — the boundary: your mac, lit (stroke draws f8–40) */}
      <div
        style={{
          position: "absolute",
          left: BOUNDARY.left,
          top: BOUNDARY.top,
          width: BOUNDARY.width,
          height: BOUNDARY.height,
          background: `rgba(61,139,255,${0.04 * fill})`,
          borderRadius: 22,
          boxShadow: `0 0 70px rgba(61,139,255,${glowOut}), inset 0 0 70px rgba(61,139,255,${glowIn})`,
        }}
      >
        <svg
          width={BOUNDARY.width}
          height={BOUNDARY.height}
          style={{ position: "absolute", inset: 0, overflow: "visible" }}
        >
          <rect
            x={0.75}
            y={0.75}
            width={BOUNDARY.width - 1.5}
            height={BOUNDARY.height - 1.5}
            rx={21.25}
            fill="none"
            stroke={`rgba(61,139,255,${borderAlpha})`}
            strokeWidth={1.5}
            pathLength={100}
            strokeDasharray={100}
            strokeDashoffset={100 * (1 - draw)}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: space[5],
            transform: "translateY(-50%)",
            background: ink.warmBg,
            padding: `${space[0]}px ${space[3]}px`,
            ...type.label,
            color: brand.blue,
            opacity: tab,
          }}
        >
          your mac
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            height: "100%",
            paddingLeft: space[5],
          }}
        >
          <PipelineNode
            icon="audioLines"
            name="core audio tap"
            detail="two clean channels"
            litAt={NODE_BEATS[0]}
          />
          <Connector wipeAt={NODE_BEATS[0] + 10} segment={0} />
          <PipelineNode
            icon="sparkles"
            name="speechanalyzer"
            detail="word-by-word, on-device"
            litAt={NODE_BEATS[1]}
          />
          <Connector wipeAt={NODE_BEATS[1] + 10} segment={1} />
          <PipelineNode
            icon="fileText"
            name="transcript"
            detail="+ speaker names"
            litAt={NODE_BEATS[2]}
          />
          {/* the exit stub — node 3 to the boundary edge */}
          <div style={{ flex: 1, height: 2, position: "relative" }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: brand.blue,
                boxShadow: BEAM_GLOW,
                transform: `scaleX(${stubWipe})`,
                transformOrigin: "left",
              }}
            />
            <TravelerDot segment={2} color={brand.blue} />
          </div>
        </div>
      </div>

      {/* the ONE beam out — extends boundary→terminal on the bloom */}
      <div
        style={{
          position: "absolute",
          left: BOUNDARY.left + BOUNDARY.width,
          top: BEAM_Y - 1,
          width: grid.x(8) - (BOUNDARY.left + BOUNDARY.width) + space[1],
          height: 2,
          background: brand.blue,
          boxShadow: BEAM_GLOW,
          transform: `scaleX(${beamP})`,
          transformOrigin: "left",
        }}
      />

      {/* Region C — where the beam goes: your own subscription, via the CLI */}
      <div
        style={{
          position: "absolute",
          left: grid.x(8),
          // centers the ~118px terminal card on the beam line
          top: BEAM_Y - 59,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: space[4],
        }}
      >
        <div
          style={{
            display: "flex",
            gap: space[3],
            padding: space[4],
            background: ink.surfaceUp,
            borderRadius: 14,
            opacity: termIn,
            transform: `scale(${0.94 + 0.06 * termPop})`,
            transformOrigin: "left center",
          }}
        >
          <Icon
            name="terminal"
            size={26}
            color={brand.blue}
            style={{ marginTop: 4 }}
          />
          <div>
            <div style={{ ...type.mono, color: ink.text }}>$ claude</div>
            <div style={{ ...type.mono, color: ink.dim }}>
              · codex · gemini · grok
            </div>
          </div>
        </div>
        <div
          style={{
            ...type.caption,
            color: ink.dim,
            maxWidth: grid.w(4),
            opacity: captionP,
            transform: `translateY(${8 * (1 - captionP)}px)`,
          }}
        >
          only what you choose to send. no api keys.
        </div>
      </div>

      {/* Region D — the receipt */}
      <div
        style={{
          position: "absolute",
          left: grid.x(0),
          top: 880,
          opacity: chipP,
          transform: `translateY(${6 * (1 - chipP)}px)`,
        }}
      >
        <ReceiptChip accent={brand.blue} style={{ whiteSpace: "nowrap" }}>
          your account · your rules
        </ReceiptChip>
      </div>
    </AbsoluteFill>
  );
};
