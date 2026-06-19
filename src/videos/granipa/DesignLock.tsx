import { AbsoluteFill } from "remotion";
import { brand, grid, ink, type } from "./theme";
import { ICON_PATHS, type IconName } from "./scenes/ui/icon-paths";
import { GithubMark, Icon } from "./scenes/ui/icons";
import {
  GradientText,
  Kbd,
  LogoTile,
  MacWindow,
  ReceiptChip,
} from "./scenes/ui/system";

const SWATCHES: [string, string][] = [
  ["coldBg", ink.coldBg],
  ["warmBg", ink.warmBg],
  ["surface", ink.surface],
  ["surfaceUp", ink.surfaceUp],
  ["text", ink.text],
  ["dim", ink.dim],
  ["coral", brand.coral],
  ["violet", brand.violet],
  ["blue", brand.blue],
];

/** Stage-B verification sheet: faces (ñ!), ladder, palette, icons, kit. */
export const DesignLock: React.FC = () => {
  const icons = Object.keys(ICON_PATHS) as IconName[];
  return (
    <AbsoluteFill style={{ background: ink.coldBg }}>
      <div
        style={{
          position: "absolute",
          left: "50%",
          right: 0,
          top: 0,
          bottom: 0,
          background: ink.warmBg,
        }}
      />

      {/* type ladder — left column */}
      <div
        style={{
          position: "absolute",
          left: grid.x(0),
          top: 64,
          width: grid.w(6),
          display: "flex",
          flexDirection: "column",
          gap: 28,
        }}
      >
        <div style={{ ...type.hero, color: ink.text }}>Grañipa</div>
        <div style={{ ...type.h2, color: ink.text }}>
          audio never leaves your mac.
        </div>
        <div style={{ ...type.statement, color: ink.text }}>
          one folder. sqlite + files. delete it — it&apos;s gone.
        </div>
        <div style={{ ...type.body, color: ink.dim }}>
          Meeting transcription, clipboard history, screen OCR and window
          snapping — fully on-device.
        </div>
        <div style={{ ...type.label, color: brand.blue }}>
          on-device · no bot · open source
        </div>
        <div style={{ ...type.caption, color: ink.dim }}>
          caption — your account, your rules.
        </div>
        <div style={{ ...type.mono, color: ink.dim }}>
          $ granola — $14/mo · raycast · textsniper · rectangle
        </div>
        <div style={{ ...type.h2 }}>
          <GradientText>on-device.</GradientText>
        </div>
      </div>

      {/* right column: logo, icons, swatches, kit */}
      <div
        style={{
          position: "absolute",
          left: grid.x(7),
          top: 64,
          width: grid.w(5),
          display: "flex",
          flexDirection: "column",
          gap: 36,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <LogoTile size={170} glow={0.4} />
          <GithubMark size={64} color={ink.text} />
          <div style={{ ...type.mono, color: ink.dim }}>
            github.com/Zertyn-Enterprises/granipa
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(8, 1fr)",
            rowGap: 24,
            justifyItems: "start",
          }}
        >
          {icons.map((n) => (
            <Icon key={n} name={n} size={38} color={ink.text} />
          ))}
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          {SWATCHES.map(([name, hex]) => (
            <div key={name} style={{ textAlign: "center" }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 12,
                  background: hex,
                  border: `1px solid ${ink.border}`,
                }}
              />
              <div
                style={{
                  ...type.mono,
                  fontSize: 15,
                  color: ink.faint,
                  marginTop: 6,
                }}
              >
                {name}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <ReceiptChip>granola — $14/mo</ReceiptChip>
          <ReceiptChip accent={brand.coral}>every api key</ReceiptChip>
          <Kbd>⌥⇧V</Kbd>
          <Kbd>⌃⌥←</Kbd>
        </div>

        <MacWindow title="Grañipa — Notes" width={620} height={250}>
          <div style={{ display: "flex", height: "100%" }}>
            <div
              style={{
                width: 170,
                borderRight: `1px solid ${ink.border}`,
                background: "rgba(255,255,255,0.03)",
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              {(["mic", "clipboard", "scanText", "layoutGrid"] as const).map(
                (n) => (
                  <div
                    key={n}
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <Icon name={n} size={22} color={ink.dim} />
                    <div
                      style={{ ...type.caption, fontSize: 18, color: ink.dim }}
                    >
                      {n}
                    </div>
                  </div>
                ),
              )}
            </div>
            <div style={{ padding: 20 }}>
              <div
                style={{
                  fontFamily: type.statement.fontFamily,
                  fontWeight: 500,
                  fontSize: 30,
                  color: ink.text,
                }}
              >
                Notes
              </div>
              <div
                style={{
                  ...type.caption,
                  fontSize: 18,
                  color: ink.dim,
                  marginTop: 10,
                }}
              >
                Weekly sync — transcribing locally…
              </div>
            </div>
          </div>
        </MacWindow>
      </div>
    </AbsoluteFill>
  );
};
