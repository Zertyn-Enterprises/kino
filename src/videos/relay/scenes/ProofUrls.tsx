import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { useTheme } from "../../../lib/theme";
import { NorraSite } from "./ui/NorraSite";
import { Claim, PointerCursor, pulseGlow } from "./ui/bits";

const COMMITS = [
  { hash: "7f3a2c1", msg: "feat: quick-add to bag", who: "@mara", age: "2m" },
  {
    hash: "b91e04d",
    msg: "fix: cart badge hydration",
    who: "@deniz",
    age: "1h",
  },
  {
    hash: "4c7aa9e",
    msg: "perf: image lazy-load LCP",
    who: "@jonas",
    age: "3h",
  },
  {
    hash: "e30b77f",
    msg: "feat: gift wrap at checkout",
    who: "@mara",
    age: "6h",
  },
  { hash: "90d12af", msg: "chore: bump deps", who: "@ci-bot", age: "8h" },
];

const PANEL_W = 1460;
const ROW_H = 86;
const CLICK_AT = 78;

/** Every commit sprouts a live URL — ripple cascade from the newest. */
export const ProofUrls: React.FC = () => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const drift = 1 + (frame / 120) * 0.025;

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ transform: `scale(${drift})` }}>
        <div
          style={{
            width: PANEL_W,
            background: t.palette.surface,
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: t.radius.lg,
            boxShadow: "0 40px 120px rgba(0,0,0,0.5)",
            padding: "26px 34px 18px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontFamily: t.fonts.mono?.family,
              fontSize: 22,
              color: t.palette.textDim,
              paddingBottom: 18,
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                background: t.palette.accent,
                boxShadow: `0 0 ${8 + pulseGlow(frame, 30) * 10}px rgba(182,242,46,0.8)`,
              }}
            />
            Deployments · acme/storefront
          </div>
          {COMMITS.map((c, i) => {
            const land = 12 + i * 4;
            const pillIn = spring({
              frame: frame - land,
              fps,
              config: t.motion.springs.settle,
              durationInFrames: 16,
            });
            const glow = frame >= land ? pulseGlow(frame - land, 26) : 0;
            const hovered = i === 2 && frame >= 66;
            return (
              <div
                key={c.hash}
                style={{
                  display: "flex",
                  alignItems: "center",
                  height: ROW_H,
                  gap: 26,
                  borderBottom:
                    i < COMMITS.length - 1
                      ? "1px solid rgba(255,255,255,0.045)"
                      : "none",
                }}
              >
                <span
                  style={{
                    fontFamily: t.fonts.mono?.family,
                    fontSize: 23,
                    color: t.palette.textDim,
                    width: 120,
                  }}
                >
                  {c.hash}
                </span>
                <span
                  style={{
                    flex: 1,
                    fontFamily: t.fonts.body.family,
                    fontWeight: t.fonts.body.weight,
                    fontSize: 26,
                    color: t.palette.text,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                  }}
                >
                  {c.msg}
                </span>
                <span
                  style={{
                    fontFamily: t.fonts.mono?.family,
                    fontSize: 21,
                    color: t.palette.textDim,
                    width: 100,
                  }}
                >
                  {c.who}
                </span>
                <span
                  style={{
                    fontFamily: t.fonts.mono?.family,
                    fontSize: 21,
                    color: t.palette.textDim,
                    width: 56,
                    textAlign: "right",
                  }}
                >
                  {c.age}
                </span>
                <div
                  style={{
                    fontFamily: t.fonts.mono?.family,
                    fontSize: 20,
                    color: t.palette.accent,
                    background: `rgba(182,242,46,${0.06 + glow * 0.07})`,
                    border: `1px solid rgba(182,242,46,${(hovered ? 0.65 : 0.32) + glow * 0.3})`,
                    borderRadius: 8,
                    padding: "6px 16px",
                    width: 290,
                    textAlign: "center",
                    boxSizing: "border-box",
                    transform: `scale(${0.9 + pillIn * 0.1}) translateY(${hovered ? -3 : 0}px)`,
                    opacity: pillIn,
                    boxShadow: `0 0 ${glow * 26}px rgba(182,242,46,${glow * 0.35})`,
                  }}
                >
                  {c.hash}.relay.dev
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {frame >= CLICK_AT && (
        <div style={{ position: "absolute", right: 120, top: 200 }}>
          <div
            style={{
              width: 600,
              borderRadius: t.radius.md,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 30px 100px rgba(0,0,0,0.6)",
            }}
          >
            <div
              style={{
                background: "#101511",
                fontFamily: t.fonts.mono?.family,
                fontSize: 16,
                color: t.palette.accent,
                textAlign: "center",
                padding: "8px 0",
              }}
            >
              4c7aa9e.relay.dev
            </div>
            <NorraSite variant="v42" width={598} />
          </div>
        </div>
      )}
      {frame >= CLICK_AT && frame <= CLICK_AT + 16 && (
        <div
          style={{
            position: "absolute",
            left: 1235,
            top: 622,
            width: 30,
            height: 30,
            borderRadius: "50%",
            border: `2px solid ${t.palette.accent}`,
            transform: `translate(-50%,-50%) scale(${1 + (frame - CLICK_AT) * 0.45})`,
            opacity: 1 - (frame - CLICK_AT) / 16,
          }}
        />
      )}

      <PointerCursor
        path={[
          [30, 1560, 860],
          [66, 1235, 624],
          [120, 1235, 624],
        ]}
        pressAt={[CLICK_AT]}
      />
      <Claim text="A URL for every commit" />
    </AbsoluteFill>
  );
};
