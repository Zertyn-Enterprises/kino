import { useTheme } from "../../../../lib/theme";

export { burstSchedule, charsVisible } from "../../../../lib/typing";

export const PROMPT = "~/acme/storefront ❯";

export const Cursor: React.FC<{ frame: number; visible?: boolean }> = ({
  frame,
  visible = true,
}) => {
  const t = useTheme();
  const on = Math.floor(frame / 16) % 2 === 0;
  return (
    <span
      style={{
        display: "inline-block",
        width: "0.62em",
        height: "1.15em",
        verticalAlign: "text-bottom",
        marginLeft: 2,
        background: visible && on ? t.palette.text : "transparent",
      }}
    />
  );
};

/** Dark terminal panel with a window title bar. */
export const Terminal: React.FC<{
  title?: string;
  width?: number;
  minHeight?: number;
  children: React.ReactNode;
}> = ({
  title = "acme/storefront — zsh",
  width = 1280,
  minHeight = 560,
  children,
}) => {
  const t = useTheme();
  return (
    <div
      style={{
        width,
        minHeight,
        borderRadius: t.radius.lg,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "#0D120E",
        boxShadow: "0 40px 120px rgba(0,0,0,0.55)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "13px 16px",
          background: "#101511",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
          <div
            key={c}
            style={{ width: 12, height: 12, borderRadius: 6, background: c }}
          />
        ))}
        <div
          style={{
            flex: 1,
            textAlign: "center",
            fontFamily: t.fonts.mono?.family,
            fontSize: 15,
            color: t.palette.textDim,
            paddingRight: 56,
          }}
        >
          {title}
        </div>
      </div>
      <div
        style={{
          padding: "30px 34px",
          fontFamily: t.fonts.mono?.family,
          fontSize: 27,
          lineHeight: 1.55,
          color: t.palette.text,
        }}
      >
        {children}
      </div>
    </div>
  );
};
