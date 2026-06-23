# Distinctiveness gate — anti-template rule

`scripts/distinct.sh <slug> [overrides...]` enforces Hard Rule #3: a candidate
video must differ from EVERY prior `src/videos/_registry.md` entry on **≥4
identity axes** (out of 9). Render-free; parses `_registry.md` directly.

## Usage

```bash
scripts/distinct.sh <slug>
# Or with pre-registry overrides (useful at theme-lock before registry entry finalized):
scripts/distinct.sh <slug> \
  --bg='#001122' --accent='#ff8800' \
  --luminance=dark --arc=C --bpm=130 --grain=4
```

Outputs:
- `out/review/<slug>/distinct/metrics.json` — machine verdict
- `out/review/<slug>/distinct/report.txt` — human-readable table

Prints `DISTINCT: PASS | BLOCKED | SKIP`. Exits non-zero on HARD fail.

## Nine identity axes

| # | Axis | Method | Differs when |
|---|---|---|---|
| 1 | palette-bg | CIE94 ΔE on bg hex | ΔE > 5 |
| 2 | palette-accent | CIE94 ΔE on primary accent hex | ΔE > 5 |
| 3 | luminance | dark / light / tonal class | classes differ |
| 4 | type | font-family set Jaccard | Jaccard < 0.5 |
| 5 | arc | A–E emotional arc letter | letters differ |
| 6 | rhythm+moves | combined token Jaccard (rhythm + signature-moves fields) | Jaccard < 0.5 |
| 7 | texture | grain% band (none / light / filmic / heavy) | bands differ |
| 8 | transitions | token Jaccard of transitions field | Jaccard < 0.5 |
| 9 | music-bpm | bpm band (slow ≤89 / mid 90–115 / upbeat 116–140 / fast >140) | bands differ |

## Verdicts

| Verdict | Meaning | Exit |
|---|---|---|
| PASS | ≥4 axes differ from every prior | 0 |
| BLOCKED | < 4 axes differ from at least one prior (HARD) | non-zero |
| SKIP | fewer than 2 registry entries — nothing to compare | 0 |

## Advisory drift warnings

`metrics.json` also reports convergence drift on three known default-drift axes
(never blocks ship, but surfaces a stylistic cluster risk):

- **bg-luminance drift** — ≥2 entries share the dark/tonal family
- **mono-font drift** — ≥2 entries use JetBrains Mono
- **blue/teal accent drift** — ≥2 entries share a blue/teal accent

Drift advisory appears in `gates[].advisory: true, pass: false` entries and
surfaces in `ship-metrics.mjs` as `distinct.advisoryFailures`. Require a named
justification if advisory fires on the new video.

## `metrics.json` shape

```json
{
  "hardGatesPass": true,
  "skip": false,
  "candidateSlug": "newvideo",
  "priorSlugs": ["relay", "granipa"],
  "perPrior": [
    {
      "priorSlug": "relay",
      "differingCount": 7,
      "differingAxes": ["palette-bg", "palette-accent", "luminance", "type", "arc", "texture", "music-bpm"],
      "collidingAxes": ["rhythm+moves", "transitions"]
    }
  ],
  "gates": [
    { "name": "HARD: ≥4 axes distinct from every prior", "hard": true, "advisory": false, "pass": true, "skip": false, "detail": "..." },
    { "name": "D-drift-luminance-dark-tonal", "hard": false, "advisory": true, "pass": false, "skip": false, "detail": "..." }
  ]
}
```

`ship-metrics.mjs` treats `distinct=null` as graceful SKIP (absent metrics —
gate not invoked). When `metrics.json` is present, `hardGatesPass:false` blocks
ship. This matches musicsync/payoff/remotionCorrect behaviour.

## Treatment checklist (run at stage 2)

Before finalising the treatment, run the gate with pre-registry overrides to
confirm the candidate clears the ≥4-rule against all current registry entries:

```bash
scripts/distinct.sh <slug> \
  --bg='<themeTs bg>' --accent='<themeTs accent>' \
  --luminance=<dark|light|tonal> --arc=<A-E> --bpm=<bpm> --grain=<grain%>
```

State the axis diff table in the treatment's **Registry diff** section.

## Recorded snapshots — 2026-06-23

Both relay and granipa are in the registry; each passes as the other's candidate.

### relay vs granipa

```bash
scripts/distinct.sh relay
```

```
vs granipa: PASS (9/9 axes differ)
  differ: palette-bg, palette-accent, luminance, type, arc, rhythm+moves, texture, transitions, music-bpm
⚠  bg-luminance drift (2 entries: relay=dark, granipa=tonal)
⚠  mono-font drift (2 entries use JetBrains Mono: relay, granipa)
HARD GATES: PASS
```

### granipa vs relay

```bash
scripts/distinct.sh granipa
```

```
vs relay: PASS (9/9 axes differ)
  differ: palette-bg, palette-accent, luminance, type, arc, rhythm+moves, texture, transitions, music-bpm
⚠  bg-luminance drift (2 entries: granipa=tonal, relay=dark)
⚠  mono-font drift (2 entries use JetBrains Mono: granipa, relay)
HARD GATES: PASS
```

### Calibration numbers (CIE94)

```
relay   bg #0A0E0B → L*a*b*(3.55, -1.46,  0.77)
granipa bg #0B0F18 → L*a*b*(4.18,  1.05, -6.07)   ΔE94 ≈ 7.1 > 5 → DIFFERS

relay   accent #B6F22E → L*a*b*(88.8, -44.0, 79.5)
granipa accent #3D8BFF → L*a*b*(58.7,  15.5, -64.4)  ΔE94 ≈ 72 > 5 → DIFFERS
```
