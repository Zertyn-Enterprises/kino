import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { useTheme } from "../../../lib/theme";
import { NorraSite } from "./ui/NorraSite";
import { Claim, PointerCursor, pulseGlow } from "./ui/bits";

const CLICK_AT = 45; // the zero-gap swap

const RELEASES = [
  { v: "v42", when: "2m ago", msg: "feat: quick-add to bag" },
  { v: "v41", when: "yesterday · 18:40", msg: "copy: hero headline" },
  { v: "v40", when: "2d ago · 11:02", msg: "feat: cart drawer" },
];

/** Instant works backwards too. */
export const ProofRollback: React.FC = () => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const swapped = frame >= CLICK_AT;
  const liveIdx = swapped ? 1 : 0;
  const pushIn = interpolate(frame, [60, 120], [1, 1.04], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          display: "flex",
          gap: 44,
          alignItems: "stretch",
          transform: `scale(${pushIn})`,
          transformOrigin: "30% 40%",
        }}
      >
        <div
          style={{
            width: 620,
            background: t.palette.surface,
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: t.radius.lg,
            boxShadow: "0 40px 120px rgba(0,0,0,0.5)",
            padding: "26px 28px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div
            style={{
              fontFamily: t.fonts.mono?.family,
              fontSize: 21,
              color: t.palette.textDim,
              paddingBottom: 6,
            }}
          >
            Releases · production
          </div>
          {RELEASES.map((r, i) => {
            const isLive = i === liveIdx;
            const glow = isLive
              ? pulseGlow(frame - (swapped ? CLICK_AT : 0), 30)
              : 0;
            const hovered = i === 1 && frame >= 30 && !swapped;
            return (
              <div
                key={r.v}
                style={{
                  border: `1px solid ${isLive ? `rgba(182,242,46,${0.4 + glow * 0.3})` : "rgba(255,255,255,0.08)"}`,
                  background: isLive
                    ? "rgba(182,242,46,0.05)"
                    : "rgba(255,255,255,0.02)",
                  borderRadius: t.radius.md,
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  transform: hovered ? "translateY(-3px)" : undefined,
                  boxShadow: isLive
                    ? `0 0 ${glow * 30}px rgba(182,242,46,${glow * 0.25})`
                    : undefined,
                }}
              >
                <span
                  style={{
                    width: 11,
                    height: 11,
                    borderRadius: 6,
                    background: isLive
                      ? t.palette.accent
                      : "rgba(255,255,255,0.18)",
                    boxShadow: isLive
                      ? `0 0 ${6 + glow * 14}px rgba(182,242,46,0.9)`
                      : "none",
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{ display: "flex", gap: 12, alignItems: "baseline" }}
                  >
                    <span
                      style={{
                        fontFamily: t.fonts.mono?.family,
                        fontSize: 24,
                        fontWeight: 700,
                        color: t.palette.text,
                      }}
                    >
                      {r.v}
                    </span>
                    <span
                      style={{
                        fontFamily: t.fonts.mono?.family,
                        fontSize: 18,
                        color: isLive ? t.palette.accent : t.palette.textDim,
                      }}
                    >
                      {isLive ? "● live now" : r.when}
                    </span>
                  </div>
                  <div
                    style={{
                      fontFamily: t.fonts.body.family,
                      fontSize: 20,
                      color: t.palette.textDim,
                      marginTop: 3,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {r.msg}
                  </div>
                </div>
                {!isLive && (
                  <span
                    style={{
                      fontFamily: t.fonts.display.family,
                      fontWeight: 700,
                      fontSize: 19,
                      color: hovered ? "#10130a" : t.palette.text,
                      background: hovered
                        ? t.palette.accent
                        : "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 9,
                      padding: "9px 18px",
                      flexShrink: 0,
                    }}
                  >
                    Restore
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div
          style={{
            width: 900,
            borderRadius: t.radius.lg,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 40px 120px rgba(0,0,0,0.5)",
            position: "relative",
          }}
        >
          <div
            style={{
              background: "#101511",
              fontFamily: t.fonts.mono?.family,
              fontSize: 18,
              color: t.palette.accent,
              textAlign: "center",
              padding: "10px 0",
            }}
          >
            storefront.relay.dev
          </div>
          <NorraSite variant={swapped ? "v41" : "v42"} width={898} />
          {swapped && frame <= CLICK_AT + 16 && (
            <AbsoluteFill
              style={{
                background: t.palette.accent,
                opacity: interpolate(frame - CLICK_AT, [0, 4], [0.12, 0], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
              }}
            />
          )}
        </div>
      </div>

      <PointerCursor
        path={[
          [12, 1500, 920],
          [38, 736, 480],
          [120, 736, 480],
        ]}
        pressAt={[CLICK_AT]}
      />
      <Claim text="Rollbacks in one click" />
    </AbsoluteFill>
  );
};
