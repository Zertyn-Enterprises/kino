/**
 * Gate-pass fixture for AmbientField. Engineered to satisfy the hook
 * background-activity gate (gate 4: active≥2, separated=true) and the
 * frame-0 liveness gate (gate 5: cells≥2, rows≥2) — the first recorded
 * PASS reference for these two advisory gates.
 *
 * Run: scripts/hook.sh AmbientCheck
 */

import { AbsoluteFill } from "remotion";
import { AmbientField } from "../lib/fx";

export const AmbientCheck: React.FC = () => (
  <AbsoluteFill style={{ background: "#060a12" }}>
    <AmbientField
      color="#7effc9"
      colorDim="#2a8a60"
      density={80}
      energy={1.5}
      seed="ac"
      itemH={8}
    />
  </AbsoluteFill>
);
