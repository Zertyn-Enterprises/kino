# Distinctiveness gate — anti-template rule

`scripts/distinct.sh <slug> [overrides...]` enforces Hard Rule #3: a candidate
video must differ from EVERY prior `src/videos/_registry.md` entry on **≥4
identity axes** (out of 9). Render-free; auto-derives code-grounded axes from
`src/videos/<slug>/theme.ts` when loadable.

## Usage

```bash
scripts/distinct.sh <slug>
# Override flags win over derived AND registry values:
scripts/distinct.sh <slug> \
  --bg='#001122' --accent='#ff8800' \
  --luminance=dark --arc=C --bpm=130 --grain=4
```

Outputs:
- `out/review/<slug>/distinct/metrics.json` — machine verdict
- `out/review/<slug>/distinct/report.txt` — human-readable table

Prints `DISTINCT: PASS | BLOCKED | SKIP`. Exits non-zero on HARD fail.

## Nine identity axes

| # | Axis | Source | Differs when |
|---|---|---|---|
| 1 | palette-bg | **derived from theme.ts** (→ registry fallback) | CIE94 ΔE > 5 |
| 2 | palette-accent | **derived from theme.ts** (→ registry fallback) | CIE94 ΔE > 5 |
| 3 | luminance | **derived from theme.ts** bg WCAG Y (→ registry fallback) | classes differ |
| 4 | type | **derived from theme.ts** font families (→ registry fallback) | Jaccard < 0.5 |
| 5 | arc | registry only (not in code) | letters differ |
| 6 | rhythm+moves | registry only (not in code) | token Jaccard < 0.5 |
| 7 | texture/grain | **derived from theme.ts** grainOpacity (→ registry fallback) | bands differ |
| 8 | transitions | registry only (not in code) | token Jaccard < 0.5 |
| 9 | music-bpm | registry only (not in code) | bpm band differs |

Luminance thresholds: dark Y < 0.05 · tonal 0.05–0.18 · light ≥ 0.18.
Grain bands: none 0% · light 0.1–3% · filmic 3.1–7% · heavy >7%.
bpm bands: slow ≤89 · mid 90–115 · upbeat 116–140 · fast >140.

The 4 non-derivable axes (arc / rhythm+moves / transitions / music-bpm) are
labeled in `metrics.json` with a three-state coverage model:
- `ran` — axis value found in registry entry
- `coverage-gap` — registry entry exists but field is missing/unparseable
- `skip-na` — no registry entry for candidate (pre-registry mode)

## Override semantics

CLI flags, derived source values, and registry-parsed values apply in priority order:

1. **Explicit CLI flags** (`--bg=`, `--accent=`, `--luminance=`, `--arc=`, `--bpm=`, `--grain=`) — highest priority; override both derived and registry values for the named axis.
2. **Derived from `theme.ts`** — when loadable, replaces registry-parsed values for the 5 code-derivable axes (palette-bg, palette-accent, luminance, type, texture/grain).
3. **Registry-parsed values** — fallback when the axis is non-derivable or `theme.ts` is unloadable.

The 4 non-derivable axes (arc / rhythm+moves / transitions / music-bpm) always come from the registry (or a CLI override) — they are not in code and cannot be auto-derived.

## Verdicts

| Verdict | Meaning | Exit |
|---|---|---|
| PASS | registry-completeness PASS + registry-axis-drift PASS + ≥4 axes differ from every prior | 0 |
| BLOCKED | registry-completeness FAIL, registry-axis-drift FAIL, or < 4 axes differ from a prior (HARD) | non-zero |
| SKIP | fewer than 2 registry entries — nothing to compare | 0 |

## Registry-axis-drift HARD gate

When a candidate has both a registry entry and a loadable `theme.ts`, the gate
compares hand-typed registry values against the derived source values:
- **palette-bg / palette-accent**: CIE94 ΔE > 5 triggers BLOCK
- **luminance**: class mismatch (dark vs tonal vs light) triggers BLOCK
- **texture/grain**: band mismatch triggers BLOCK

BLOCKED output includes the field name plus registry-vs-source values so the
registry entry can be corrected. SKIP when `theme.ts` is unloadable.

When drift fires, fix the stale registry field to match the source, then re-run.

## Registry completeness (HARD)

Before comparing axes, the gate verifies that `src/videos/_registry.md` is in
sync with the filesystem — ensuring the registry is actually complete and no
video silently escapes the anti-template check.

Two failure classes:

| Class | Meaning | Fix |
|---|---|---|
| `missing entry` | A buildable video folder (`theme.ts` + `Main.tsx`) has no `_registry.md` entry | Append the missing entry using the registry axes table; run `scripts/distinct.sh` again |
| `orphan entry` | A registry entry names a slug with no `src/videos/<slug>/` folder | Remove or rename the stale registry entry |

**Buildable = folder contains both `theme.ts` AND `Main.tsx`.** Scaffold-only
folders (missing `Main.tsx`) are not flagged — they are not yet shippable.

This check runs **before** the `<2 entries → SKIP` rule: a single buildable
folder missing its entry still HARD-fails. Registry ledger completeness is a
precondition of the anti-template guarantee, regardless of entry count.

When this gate fires, `report.txt` shows:

```
  Registry-completeness: FAIL
    missing entry: aurora
```

Fix: append the missing video's identity record to `src/videos/_registry.md`
following the existing `## N · <slug> / <CompId> (date)` heading format and
axes table, then re-run `scripts/distinct.sh <slug>`.

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
      "differingAxes": ["palette-accent", "type", "arc", "rhythm+moves", "transitions", "music-bpm", "luminance"],
      "collidingAxes": ["palette-bg", "texture"]
    }
  ],
  "nonDerivableCoverage": {
    "arc": "ran",
    "rhythm+moves": "ran",
    "transitions": "ran",
    "music-bpm": "ran"
  },
  "gates": [
    { "name": "HARD: registry-axis-drift", "hard": true, "advisory": false, "pass": true, "skip": false, "detail": "registry matches source on all derivable axes" },
    { "name": "HARD: ≥4 axes distinct from every prior", "hard": true, "advisory": false, "pass": true, "skip": false, "detail": "..." },
    { "name": "Advisory: bg-luminance drift ...", "hard": false, "advisory": true, "pass": false, "skip": false, "detail": "..." }
  ]
}
```

`ship-metrics.mjs` treats `distinct=null` as graceful SKIP (absent metrics —
gate not invoked). When `metrics.json` is present, `hardGatesPass:false` blocks
ship. This matches musicsync/payoff/remotionCorrect behaviour.

## Scaffold: --distinct flag (distinct-gate-green by construction)

Pass `--distinct` to `node scripts/new-video.mjs` to emit an anti-convergence
starter identity instead of the generic dark/teal palette:

```bash
node scripts/new-video.mjs <slug> <CompId> --distinct [--hook=<key>] [--body=<key>]
```

The scaffold reads `src/videos/_registry.md`, computes a deterministic seed via
`scripts/identity-seed.mjs`, and emits a `theme.ts` whose palette and font families
pass `scripts/distinct.sh` HARD gates by construction (≥4 axes differ from every
prior entry, WCAG contrast HARD floors met). The scaffold prints a summary of which
axes are open and which priors collide. Still re-derive bespoke taste per Hard Rule 3.

## Treatment checklist (run at stage 2)

Run before finalising the treatment — uses derived axes automatically when
`theme.ts` exists; fall back to override flags for pre-registry runs:

```bash
# With theme.ts in place — derived axes loaded automatically:
scripts/distinct.sh <slug>

# Pre-registry (theme.ts not yet committed):
scripts/distinct.sh <slug> \
  --bg='<theme.ts palette.bg>' --accent='<theme.ts palette.accent>' \
  --luminance=<dark|light|tonal> --arc=<A-E> --bpm=<bpm> --grain=<grain%>
```

State the axis diff table in the treatment's **Registry diff** section.

## Recorded snapshots — 2026-06-23 (derived-axes path, confirmed by actual run)

Both relay and granipa are in the registry; each passes as the other's candidate
using axes derived from the actual `theme.ts`.

### relay vs granipa

```bash
scripts/distinct.sh relay
```

```
  Registry-axis-drift: PASS

  vs granipa: PASS (6/9 axes differ)
    differ:  palette-accent, type, arc, rhythm+moves, transitions, music-bpm

  Convergence drift (advisory):
    ⚠  bg-luminance drift (2 entries: relay=dark, granipa=dark)
    ⚠  mono-font drift (2 entries use JetBrains Mono: relay, granipa)
HARD GATES: PASS
```

### granipa vs relay

```bash
scripts/distinct.sh granipa
```

```
  Registry-axis-drift: PASS

  vs relay: PASS (6/9 axes differ)
    differ:  palette-accent, type, arc, rhythm+moves, transitions, music-bpm

  Convergence drift (advisory):
    ⚠  bg-luminance drift (2 entries: granipa=dark, relay=dark)
    ⚠  mono-font drift (2 entries use JetBrains Mono: granipa, relay)
HARD GATES: PASS
```

### Notes on derived-axes results

With source-derived axes, both videos now compute to `luminance=dark` (WCAG Y < 0.05
for both #0A0E0B relay and #0A0B0E granipa), and both have `filmic` grain band
(relay 5%, granipa 4%). Both videos differ on 6/9 axes — well above the ≥4 threshold.

The advisory bg-luminance drift now reads `relay=dark, granipa=dark` (both dark,
no longer the `tonal` label from the stale registry).

### Calibration numbers (CIE94, derived axes)

```
relay   bg #0A0E0B (derived)   → luminance=dark (Y≈0.004)
granipa bg #0A0B0E (derived)   → luminance=dark (Y≈0.002)

relay   accent #B6F22E → L*a*b*(88.8, -44.0, 79.5)
granipa accent #3D8BFF → L*a*b*(58.7,  15.5, -64.4)   ΔE94 ≈ 72 > 5 → DIFFERS
```
