import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

export const SmokeClip: React.FC = () => {
  const frame = useCurrentFrame();
  const hue = interpolate(frame, [0, 299], [0, 360]);
  return (
    <AbsoluteFill
      style={{
        background: `hsl(${hue}, 70%, 50%)`,
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontSize: 80,
        fontFamily: "monospace",
      }}
    >
      {frame}
    </AbsoluteFill>
  );
};
