import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { DeviceFrame } from "../../../lib/DeviceFrame";
import { useTheme } from "../../../lib/theme";
import { NorraSite } from "./ui/NorraSite";
import { Claim, PointerCursor } from "./ui/bits";

const APPROVE_AT = 96;

const Pin: React.FC<{
  land: number;
  x: number;
  y: number;
  initial: string;
  color: string;
  text: string;
}> = ({ land, x, y, initial, color, text }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < land) {
    return null;
  }
  const p = spring({
    frame: frame - land,
    fps,
    config: t.motion.springs.settle,
    durationInFrames: 18,
  });
  const ring = interpolate(frame - land, [0, 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div style={{ position: "absolute", left: x, top: y }}>
      <div
        style={{
          position: "absolute",
          left: 21,
          top: 21,
          width: 26,
          height: 26,
          borderRadius: "50%",
          border: `2px solid ${color}`,
          transform: `translate(-50%,-50%) scale(${1 + ring * 5})`,
          opacity: 1 - ring,
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          transform: `scale(${1.35 - p * 0.35})`,
          transformOrigin: "21px 21px",
          opacity: p,
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: "50% 50% 50% 6px",
            background: color,
            color: "#10130a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: t.fonts.display.family,
            fontWeight: 700,
            fontSize: 21,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
        >
          {initial}
        </div>
        <div
          style={{
            background: "rgba(10,14,11,0.92)",
            border: "1px solid rgba(255,255,255,0.14)",
            borderRadius: 10,
            padding: "9px 16px",
            fontFamily: t.fonts.body.family,
            fontWeight: t.fonts.body.weight,
            fontSize: 22,
            color: t.palette.text,
            whiteSpace: "nowrap",
            boxShadow: "0 12px 36px rgba(0,0,0,0.45)",
          }}
        >
          {text}
        </div>
      </div>
    </div>
  );
};

/** The preview is a place your team can stand. */
export const ProofShare: React.FC = () => {
  const t = useTheme();
  const frame = useCurrentFrame();

  const zoomOut = interpolate(frame, [66, 96], [1.06, 1], {
    easing: Easing.bezier(0.45, 0, 0.25, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Link chip flying out: sent to the team.
  const flyP = interpolate(frame, [15, 28], [0, 1], {
    easing: Easing.in(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const approveIn = interpolate(frame, [66, 80], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const approved = frame >= APPROVE_AT;

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ transform: `scale(${zoomOut})`, position: "relative" }}>
        <DeviceFrame
          variant="browser"
          label="storefront-7f3a2.relay.dev"
          width={1500}
          chrome="dark"
        >
          <NorraSite variant="v42" width={1498} />
        </DeviceFrame>

        <Pin
          land={24}
          x={430}
          y={300}
          initial="M"
          color="#B6F22E"
          text="@mara — ship it today"
        />
        <Pin
          land={48}
          x={1075}
          y={185}
          initial="D"
          color="#7DD3FC"
          text="@deniz — cart feels fast 🔥"
        />

        <div
          style={{
            position: "absolute",
            right: 36,
            bottom: 32,
            fontFamily: t.fonts.display.family,
            fontWeight: 700,
            fontSize: 25,
            color: approved ? t.palette.accent : "#10130a",
            background: approved ? "rgba(182,242,46,0.1)" : t.palette.accent,
            border: `2px solid ${t.palette.accent}`,
            borderRadius: 12,
            padding: "13px 30px",
            opacity: approveIn,
            transform: `translateX(${(1 - approveIn) * 60}px)`,
            boxShadow: approved ? "none" : "0 14px 44px rgba(182,242,46,0.25)",
          }}
        >
          {approved ? "Approved ✓" : "Approve"}
        </div>
      </div>

      {flyP < 1 && frame >= 15 && (
        <div
          style={{
            position: "absolute",
            left: 880 + flyP * 620,
            top: 200 - flyP * 320,
            fontFamily: t.fonts.mono?.family,
            fontSize: 19,
            color: t.palette.accent,
            background: "rgba(16,21,17,0.95)",
            border: "1px solid rgba(182,242,46,0.4)",
            borderRadius: 8,
            padding: "7px 16px",
            opacity: 1 - flyP * 0.9,
            transform: `rotate(${flyP * 6}deg)`,
          }}
        >
          ⌘C · storefront-7f3a2.relay.dev
        </div>
      )}

      <PointerCursor
        path={[
          [50, 1620, 880],
          [88, 1565, 905],
          [120, 1565, 905],
        ]}
        pressAt={[APPROVE_AT]}
      />
      <Claim text="Share it before standup" />
    </AbsoluteFill>
  );
};
