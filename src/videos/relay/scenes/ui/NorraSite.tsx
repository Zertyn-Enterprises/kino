import { norra } from "../../theme";

/**
 * The fictional product being previewed — its own brand (warm paper +
 * terracotta), deliberately NOT Relay's palette. `variant` lets the
 * rollback scene show a visibly different previous version.
 */
export const NorraSite: React.FC<{
  variant?: "v42" | "v41";
  width?: number;
}> = ({ variant = "v42", width = 1600 }) => {
  const paper = variant === "v42" ? norra.paper : norra.paperAlt;
  const headline =
    variant === "v42" ? "Shelving, reimagined." : "Modular shelving.";
  const scale = width / 1600;
  return (
    <div
      style={{
        width,
        height: 900 * scale,
        overflow: "hidden",
        background: paper,
      }}
    >
      <div
        style={{
          width: 1600,
          height: 900,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: norra.ink,
          padding: "36px 64px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{ fontSize: 30, fontWeight: 700, letterSpacing: "0.04em" }}
          >
            NORRA
          </div>
          <div
            style={{
              display: "flex",
              gap: 36,
              fontSize: 19,
              color: norra.inkSoft,
            }}
          >
            <span>Systems</span>
            <span>Materials</span>
            <span>Stories</span>
            <span
              style={{
                color: paper,
                background: norra.ink,
                padding: "8px 18px",
                borderRadius: 99,
                fontWeight: 600,
              }}
            >
              Cart · 2
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 48, marginTop: 84 }}>
          <div style={{ flex: 1.1 }}>
            <div
              style={{
                fontSize: 76,
                fontWeight: 700,
                lineHeight: 1.04,
                letterSpacing: "-0.02em",
              }}
            >
              {headline}
            </div>
            <div
              style={{
                fontSize: 23,
                color: norra.inkSoft,
                marginTop: 26,
                lineHeight: 1.45,
                maxWidth: 520,
              }}
            >
              Solid oak modules that grow with your wall. Designed in Malmö,
              assembled in minutes.
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 40 }}>
              <span
                style={{
                  background: norra.terracotta,
                  color: paper,
                  fontSize: 21,
                  fontWeight: 600,
                  padding: "15px 30px",
                  borderRadius: 10,
                }}
              >
                Build yours
              </span>
              <span
                style={{
                  border: `2px solid ${norra.ink}`,
                  fontSize: 21,
                  fontWeight: 600,
                  padding: "13px 28px",
                  borderRadius: 10,
                }}
              >
                From €249
              </span>
            </div>
          </div>
          <div
            style={{ flex: 1, display: "flex", gap: 20, alignItems: "stretch" }}
          >
            {[
              { h: 420, shelves: 4, c: "#A88B66" },
              { h: 330, shelves: 3, c: "#8E7250" },
              { h: 480, shelves: 5, c: "#BFA37D" },
            ].map((unit, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                }}
              >
                <div
                  style={{
                    height: unit.h,
                    background: variant === "v42" ? "#FFFFFF" : "#F2F6F0",
                    borderRadius: 14,
                    border: "1px solid rgba(30,27,22,0.1)",
                    boxShadow: "0 18px 40px rgba(30,27,22,0.12)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-evenly",
                    padding: "18px 16px",
                  }}
                >
                  {Array.from({ length: unit.shelves }, (_, s) => (
                    <div
                      key={s}
                      style={{
                        height: 13,
                        borderRadius: 4,
                        background: unit.c,
                        opacity: 0.85,
                      }}
                    />
                  ))}
                </div>
                <div
                  style={{
                    fontSize: 15,
                    color: norra.inkSoft,
                    marginTop: 10,
                    textAlign: "center",
                  }}
                >
                  {["Aspen 4", "Birk 3", "Klippa 5"][i]}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
