/**
 * Gate-proof reference fixture for Archetype 2: Bold / contrast claim.
 * Proves structure + AmbientField recipe clears all hook gates:
 *   Gate 1 PASS (HARD): KineticLine word-slam animates from f0 → delta > 0.1 by f9.
 *   Gate 2 PASS (HARD): AmbientField + display text → stddev > 5.0 at f0.
 *   Gate 3 PASS (HARD): dark palette throughout → loop-seam delta < 60.
 *   Gate 4 PASS (advisory): AmbientField density=40 → ≥2 separated active cells.
 *   Gate 5 PASS (advisory): AmbientField energy=0.8 → strips span ≥2 rows from f0.
 *
 * Neutral token set — NOT a ship template. Re-derive bespoke per Hard Rule 3.
 *
 * Run: scripts/hook.sh Hook02BoldClaim
 */

import { AbsoluteFill } from "remotion";
import { AmbientField, KineticLine } from "../../lib/fx";

const BG = "#060a12";
const ACCENT = "#7effc9";
const ACCENT_DIM = "#2a8a60";
const TEXT = "#f0f4f8";

// Neutral 3-word claim that slots the archetype copy template.
// Director re-derives bespoke copy + typography per Hard Rule 3.
const CLAIM = "Your X lies.";
const SUB_CLAIM = "We fixed it.";

export const Hook02BoldClaim: React.FC = () => (
  <AbsoluteFill style={{ background: BG }}>
    {/* Background layer — archetype 2 recipe: density=40, energy=0.8 (subtle, text is focal) */}
    <AmbientField
      color={ACCENT}
      colorDim={ACCENT_DIM}
      density={40}
      energy={0.8}
      seed="h02"
    />

    {/* Focal: display-weight claim fills 60-80% of frame width per archetype spec */}
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
      }}
    >
      {/* Line 1 slams in word-by-word from f0 (beat 0–0.5 per archetype timing) */}
      <KineticLine
        text={CLAIM}
        at={0}
        perWord={5}
        slamFrames={6}
        fontSize={140}
        fontFamily='"Arial Black", "Impact", "Helvetica Neue", sans-serif'
        fontWeight={900}
        color={TEXT}
        style={{ maxWidth: "80%", textAlign: "center" }}
      />
      {/* Line 2 follows after beat 0.5 (f15 ≈ beat 1 at 120bpm) per archetype timing */}
      <KineticLine
        text={SUB_CLAIM}
        at={20}
        perWord={5}
        slamFrames={6}
        fontSize={140}
        fontFamily='"Arial Black", "Impact", "Helvetica Neue", sans-serif'
        fontWeight={900}
        color={ACCENT}
        style={{ maxWidth: "80%", textAlign: "center" }}
      />
    </AbsoluteFill>
  </AbsoluteFill>
);
