# Code-craft gate — static source analyzer

Run `scripts/code-craft.sh <CompId> <slug>` at any point (no render required) to
verify that scene source code is free of the AI-tells the five pixel gates are
blind to. Output lands in `out/review/<CompId>/code-craft/`:

```
metrics.json   — machine verdict (hardGatesPass + per-gate detail + violations)
metrics.txt    — human-readable table (tee'd output)
```

The script prints `HARD GATES: PASS|FAIL` and exits non-zero on HARD fail.

## How it works

`scripts/code-craft-metrics.mjs` scans two directory trees under `src/videos/<slug>/`:
- **`scenes/**`** — checked by all four sub-gates (C1-emoji, C1-font, C2-hex, C3-easing).
- **`theme.ts` / other video-root files** — checked by C1-emoji and C1-font only;
  `theme.ts` is the *correct* home for palette hex, so C2-hex does not fire there.

Analysis is purely textual — no AST, no runtime, no Remotion render. Results are
written as `metrics.json` in the shape consumed by `ship-metrics.mjs`.

## Gates

| Gate | Type | Condition |
|------|------|-----------|
| C1-emoji — Emoji in source | Advisory | Emoji codepoints (U+1F000–U+1FFFF, U+2600–U+26FF) in non-comment string literals in scene/theme files. Catches on-screen copy that uses emoji instead of vendored icons. |
| C1-font — System/default-stack primary font | Advisory | `system-ui`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, `Helvetica`, `Arial`, bare `sans-serif`/`serif`, or `Inter` as the PRIMARY (first) `fontFamily` in scene/theme code. Bare CSS fallbacks at the END of a brand font stack are intentional and are not flagged. |
| C2-hex — Raw hex in scenes | Advisory | Raw `#rgb`/`#rrggbb`/`#rrggbbaa` literals inside `src/videos/<slug>/scenes/**`. Colors must come from theme tokens; `theme.ts` is allowlisted and not checked. |
| C3-easing — Linear/absent easing | Advisory | `interpolate(...)` calls with no `easing:` key in their options, and `Easing.linear` usage — the robotic-easing AI-tell. Advisory by design: pixel gate M2 already covers easing presence; this is the code-level complement. |

**Calibration tier rationale.** Both reference videos (RelayLaunch and GranipaLaunch)
carry intentional exceptions to each C-gate (see snapshots below). Rather than
allowlisting individual lines, every gate was calibrated to advisory, with exceptions
documented here. This mirrors the legibility-gate calibration discipline (L2 advisory
because both references have high reading-budget share from typing/icon animations).

## Blocking vs advisory enforcement

**All four gates are advisory.** `hardGatesPass` is therefore always `true` when
source files are found — the code-craft gate does not block ship on its own. However:

- Advisory failures must be reviewed and each violation either fixed or named with a
  written justification (same practice as hook gates 4–5, retention gates 2–3, motion
  M2/M3, and legibility L2/L3).
- A C1-emoji or C1-font violation with no justification is a production AI-tell —
  treat as a 🔴 blocker in peer review.
- C2-hex violations in mock-UI helper components (terminal traffic lights, browser
  chrome) are the documented exception; any other raw hex in scene code requires
  justification.
- C3-easing violations in `extrapolateLeft/Right: 'clamp'`-only options objects
  (`CLAMP = { extrapolateLeft: 'clamp' }`) are the documented exception; other
  linear/absent-easing uses require justification.

**Machine signal:** `out/review/<CompId>/code-craft/metrics.json` is the artifact
of record — inspect `hardGatesPass` and the per-gate `pass`/`advisory`/`skip` fields.

## Thresholds

All gates are pattern-match based (regex scan) with the following calibrated exclusions:

| Constant | Value |
|----------|-------|
| Emoji range | U+1F000–U+1FFFF, U+2600–U+26FF (Dingbats U+2700–U+27BF excluded: ✓ ❯ are typographic) |
| Bad font primaries | system-ui · -apple-system · BlinkMacSystemFont · Segoe UI · Roboto · Helvetica · Arial · sans-serif · serif · Inter |
| Hex pattern | `#[0-9a-fA-F]{3,8}\b` (3, 6, or 8 hex digits) |
| Easing check | `interpolate(...)` without `easing:` key; `Easing.linear` reference |

---

**Recorded snapshots — 2026-06-22. Both reference videos `hardGatesPass: true`.**

### RelayLaunch

```bash
scripts/code-craft.sh RelayLaunch relay
```

**Recorded snapshot — 2026-06-22. `hardGatesPass: true`**

```
C1-emoji     FAIL  1 emoji violation(s) — relay social-proof mock is a documented exception (advisory)
C1-font      FAIL  1 font violation(s) — relay NorraSite browser-mock is a documented exception (advisory)
C2-hex       FAIL  20 raw-hex line(s) — mock UI elements (terminal traffic lights, browser chrome) are documented exceptions (advisory)
C3-easing    FAIL  6 linear/absent-easing instance(s) (advisory)

HARD GATES: PASS
```

**Named advisory fails:**
1. **C1-emoji** — `src/videos/relay/scenes/ProofShare.tsx:155` — `🔥` in `@deniz` tweet mock social-proof copy. Intentional authentic UGC simulation; not an AI shortcut for a UI icon. Documented exception.
2. **C1-font** — `src/videos/relay/scenes/ui/NorraSite.tsx:31` — `system-ui, -apple-system, sans-serif` as fontFamily. Intentional: NorraSite is a simulated browser UI rendering a fictional e-commerce product; the system font stack is authentic to that surface. Documented exception.
3. **C2-hex** — 20 violations across scene files: terminal traffic lights (`#ff5f57`/`#febc2e`/`#28c840`), browser chrome (`#101511`), Norra brand product colors, SVG fills. All are mock-UI elements that require exact product-accurate colors not available as theme tokens. Documented exceptions.
4. **C3-easing** — 6 `interpolate()` calls without `easing:` — short micro-flash animations (`[0, 3]`, `[0, 4]` range) and clamp-only options where easing adds no perceptual value. Advisory; pixel gate M2 confirms overall easing presence.

### GranipaLaunch

```bash
scripts/code-craft.sh GranipaLaunch granipa
```

**Recorded snapshot — 2026-06-22. `hardGatesPass: true`**

```
C1-emoji     PASS  no emoji in string literals (advisory)
C1-font      PASS  no system/Inter primary font-family (advisory)
C2-hex       FAIL  8 raw-hex line(s) — mock UI elements (terminal traffic lights, browser chrome) are documented exceptions (advisory)
C3-easing    FAIL  14 linear/absent-easing instance(s) (advisory)

HARD GATES: PASS
```

**Named advisory fails:**
1. **C2-hex** — 8 violations across `scenes/Features.tsx`, `scenes/ui/kit.tsx`, `scenes/ui/system.tsx`: terminal traffic lights (`#FF5F57`/`#FEBC2E`/`#28C840`), macOS chrome (`#0C0A07`/`#1D1913`), syntax-highlight accent (`#F4C674`), accent-blue cross-reference (`#3D8BFF`). All are mock-UI elements or product-accurate detail colors. Documented exceptions.
2. **C3-easing** — 14 `interpolate()` calls, primarily using a shared `CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }` constant. The constant's name makes the intent explicit; the calls are short micro-transitions (fade-in 4–10f, opacity pulses) where the easing is intentionally neutral. Advisory; pixel gate M2 confirms overall easing presence.
