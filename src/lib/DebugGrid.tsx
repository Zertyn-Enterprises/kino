import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * Review-only overlay: 5% safe margins, rule-of-thirds lines, center cross,
 * and the current frame number. Render it last (on top), gated behind a
 * `debug` input prop so review renders enable it via --props='{"debug":true}'.
 */
export const DebugGrid: React.FC<{ enabled?: boolean }> = ({
  enabled = true,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  if (!enabled) {
    return null;
  }
  const safeX = width * 0.05;
  const safeY = height * 0.05;
  const line = "rgba(0, 220, 255, 0.35)";
  const safe = "rgba(255, 0, 128, 0.6)";
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width={width} height={height}>
        <rect
          x={safeX}
          y={safeY}
          width={width - 2 * safeX}
          height={height - 2 * safeY}
          fill="none"
          stroke={safe}
          strokeWidth={2}
          strokeDasharray="12 8"
        />
        {[1, 2].map((i) => (
          <line
            key={`v${i}`}
            x1={(width / 3) * i}
            y1={0}
            x2={(width / 3) * i}
            y2={height}
            stroke={line}
            strokeWidth={1}
          />
        ))}
        {[1, 2].map((i) => (
          <line
            key={`h${i}`}
            x1={0}
            y1={(height / 3) * i}
            x2={width}
            y2={(height / 3) * i}
            stroke={line}
            strokeWidth={1}
          />
        ))}
        <line
          x1={width / 2 - 24}
          y1={height / 2}
          x2={width / 2 + 24}
          y2={height / 2}
          stroke={line}
          strokeWidth={1}
        />
        <line
          x1={width / 2}
          y1={height / 2 - 24}
          x2={width / 2}
          y2={height / 2 + 24}
          stroke={line}
          strokeWidth={1}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          left: 16,
          bottom: 12,
          fontFamily: "monospace",
          fontSize: 28,
          color: "#00dcff",
          background: "rgba(0,0,0,0.55)",
          padding: "2px 10px",
          borderRadius: 6,
        }}
      >
        f{frame}
      </div>
    </AbsoluteFill>
  );
};
