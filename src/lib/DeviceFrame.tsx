/**
 * Browser / desktop-window chrome around product UI. Structural colors only;
 * pass `chrome` colors or rely on the neutral defaults, and size via style.
 */

export type DeviceFrameChrome = {
  bar: string;
  border: string;
  urlPill: string;
  text: string;
};

const DARK_CHROME: DeviceFrameChrome = {
  bar: "#1d2026",
  border: "rgba(255,255,255,0.08)",
  urlPill: "rgba(255,255,255,0.06)",
  text: "#9aa0aa",
};

const LIGHT_CHROME: DeviceFrameChrome = {
  bar: "#ececee",
  border: "rgba(0,0,0,0.12)",
  urlPill: "rgba(0,0,0,0.05)",
  text: "#5c6066",
};

const TrafficLights: React.FC = () => (
  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
    {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
      <div
        key={c}
        style={{ width: 12, height: 12, borderRadius: 6, background: c }}
      />
    ))}
  </div>
);

export const DeviceFrame: React.FC<{
  variant?: "browser" | "window";
  /** Shown in the URL pill (browser) or title bar (window). */
  label?: string;
  chrome?: "dark" | "light" | DeviceFrameChrome;
  radius?: number;
  shadow?: string;
  width?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({
  variant = "browser",
  label,
  chrome = "dark",
  radius = 12,
  shadow = "0 30px 90px rgba(0,0,0,0.45)",
  width,
  style,
  children,
}) => {
  const colors =
    chrome === "dark"
      ? DARK_CHROME
      : chrome === "light"
        ? LIGHT_CHROME
        : chrome;
  return (
    <div
      style={{
        width,
        borderRadius: radius,
        border: `1px solid ${colors.border}`,
        boxShadow: shadow,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        ...style,
      }}
    >
      <div
        style={{
          background: colors.bar,
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "10px 14px",
          flexShrink: 0,
        }}
      >
        <TrafficLights />
        {variant === "browser" ? (
          <div
            style={{
              flex: 1,
              background: colors.urlPill,
              borderRadius: 7,
              padding: "5px 12px",
              fontSize: 13,
              fontFamily: "system-ui, sans-serif",
              color: colors.text,
              textAlign: "center",
            }}
          >
            {label ?? ""}
          </div>
        ) : (
          <div
            style={{
              flex: 1,
              fontSize: 13,
              fontFamily: "system-ui, sans-serif",
              color: colors.text,
              textAlign: "center",
              paddingRight: 56,
            }}
          >
            {label ?? ""}
          </div>
        )}
      </div>
      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
        {children}
      </div>
    </div>
  );
};
