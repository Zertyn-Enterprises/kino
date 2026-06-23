# Ship gate — unified verdict

Run `scripts/ship-gate.sh <CompId> <slug> [palette flags...] [-- retention flags...]`
to run all ten gates (hook, retention, contrast, motion, legibility, code-craft, musicsync, payoff, remotion-correct, distinct) in sequence and produce:
- `out/review/<CompId>/ship/report.json` — machine source of truth (single verdict)
- `out/review/<CompId>/ship/report.txt` — human-readable table (tee'd output)

The script prints `SHIP: READY` or `SHIP: BLOCKED` and exits non-zero when not
ship-ready. A gate whose `metrics.json` is absent is a hard blocker rather than
a crash.

## Usage

```bash
scripts/ship-gate.sh <CompId> <slug> \
  --bg=#.. --surface=#.. --text=#.. --textDim=#.. --accent=#.. [--accentAlt=#..] \
  [-- --holds=S:E,... --climax=F --rehook=N]
```

- `<CompId>` — Remotion composition ID (e.g. `RelayLaunch`)
- `<slug>` — video slug for the contrast gate output dir (e.g. `relay`)
- Palette flags (`--bg=`, `--surface=`, `--text=`, `--textDim=`, `--accent=`,
  `--accentAlt=`) are forwarded to `contrast.sh`.
- Retention flags (`--holds=`, `--climax=`, `--rehook=`) are passed after `--`
  as **overrides** — they are auto-derived from `<slug>`'s `timeline.ts` when
  omitted. Declare structure in `timeline.ts` via scene `role` instead of
  hand-typing frame numbers here; auto-derive keeps every gate in sync when beats
  or bpm change.
- Motion gate runs automatically (`scripts/motion.sh <CompId>`, default step=3).
- Legibility gate runs automatically (`scripts/legibility.sh <CompId>`, default step=3).
- Code-craft gate runs automatically (`scripts/code-craft.sh <CompId> <slug>`, no render required).
- Music-sync gate runs automatically (`scripts/musicsync.sh <CompId> <slug>`); degrades to SKIP when no `public/<slug>/*.analysis.json` is present — SKIP never blocks ship.

Inspect the outputs:

```
cat out/review/<CompId>/ship/report.json   # machine verdict (shipReady, per-gate)
cat out/review/<CompId>/ship/report.txt    # human-readable table
```

## report.json shape

`computeShipVerdict` (exported from `scripts/ship-metrics.mjs`) returns:

```json
{
  "shipReady": true,
  "gates": {
    "hook":       { "ran": true, "hardGatesPass": true, "advisoryFailures": [], "justified": true },
    "retention":  { "ran": true, "hardGatesPass": true, "advisoryFailures": ["Energy build-to-climax"], "justified": false },
    "contrast":   { "ran": true, "hardGatesPass": true, "advisoryFailures": [], "justified": true },
    "motion":     { "ran": true, "hardGatesPass": true, "advisoryFailures": [], "justified": true },
    "legibility": { "ran": true, "hardGatesPass": true, "advisoryFailures": ["Reading-budget share"], "justified": false },
    "codeCraft":  { "ran": true, "hardGatesPass": true, "advisoryFailures": ["C1-emoji", "C1-font", "C2-hex", "C3-easing"], "justified": false },
    "musicsync":  { "ran": false, "hardGatesPass": true, "advisoryFailures": [], "justified": true }
  },
  "blockers": []
}
```

`musicsync.ran=false, hardGatesPass=true` is the expected shape when no audio analysis is present (graceful SKIP — never blocks ship). When analysis is present and MS1/MS2 hard gates pass, `ran=true, hardGatesPass=true`. A real hard-gate failure sets `hardGatesPass=false` and adds `"musicsync hard gates failed"` to `blockers`.

- `shipReady` — `true` iff every gate ran AND every gate's `hardGatesPass` is `true`.
- `gates.<name>.ran` — `false` if the gate's `metrics.json` was absent.
- `gates.<name>.hardGatesPass` — mirrors `hardGatesPass` from that gate's `metrics.json`.
- `gates.<name>.advisoryFailures` — names of failing advisory gates/pairs; never block.
- `gates.<name>.justified` — `true` when no advisory failures are present.
- `blockers` — list of hard blockers (missing gates, hard-gate failures); empty when ship-ready.

A missing or unreadable gate `metrics.json` is reported as `ran: false`,
`hardGatesPass: false`, and the gate name is added to `blockers`.

## Self-repair loop

When `ship-gate.sh` prints `SHIP: BLOCKED` (or any advisory failures exist), the
`report.txt` appends a `## How to fix` section — one entry per failure, ordered
hard blockers first then advisories. Each entry contains a `[gate] symptom`,
parameter/code-level `fix`, `ref: <docRef>`, and `inspect: <artifact>` line.
The `report.json` carries the same data as a top-level `remediations` array.

Loop:
1. Run `scripts/ship-gate.sh <CompId> <slug> [palette flags] [-- retention flags]`
2. If `SHIP: BLOCKED` or advisory failures exist, read `## How to fix` in `report.txt`.
3. Apply each fix recipe (code/parameter/palette change).
4. Re-run ship-gate.sh.

The fix recipes are deterministic: they map every gate identifier to a concrete
action. Advisory failures require a named written justification when the fix
is intentionally not applied (see each gate's doc for accepted exception classes).

**Retention Gate 4 (Full-video loop seam) advisory recipe:**
`loopable:false` when `loopSeamDelta ≥ 60.0`. Opportunity flag — CTA-card endings
legitimately do not loop. Fix: ease the final frame back toward the opening palette,
or record a named justification for the deliberate non-loop ending.
Inspect: `out/review/<CompId>/retention/metrics.json → gates[3].measured`.

**Retention Gate 5 (Ending hold / no-limp-tail) advisory recipe:**
`endingMode=limp` when final ~1.5s has neither a held card (mean < 1.5) nor a final
accent (max > 2.0). Fix: add a settled brand/CTA card held for ≥1.5s (mode=held), or
land a deliberate final punch (logo slam, typography reveal, delta > 2.0, mode=accented).
Inspect: `out/review/<CompId>/retention/metrics.json → gates[4].measured`.

## Per-gate semantics

See `hook.md`, `retention.md`, `contrast.md`, `motion.md`, `legibility.md`, `code-craft.md`, and `musicsync.md` for the full gate specs. In brief:

| Gate | Hard | Advisory |
|---|---|---|
| Hook 1–3 (motion / frame-0 contrast / loop seam) | BLOCKING | — |
| Hook 4–5 (background activity / frame-0 liveness) | — | named justification required |
| Retention 1 (dead-air) | BLOCKING | — |
| Retention 2–3 (energy build / re-hook cadence) | — | named justification required |
| Retention 4 (full-video loop seam) | — | opportunity flag — loopable:false when CTA-card ending; named justification required |
| Retention 5 (ending hold / no-limp-tail) | — | named justification required |
| Contrast text on bg/surface | BLOCKING (≥7:1) | — |
| Contrast textDim on bg/surface | BLOCKING (≥4.5:1) | — |
| Contrast accent/accentAlt on bg | — | named justification required |
| Motion M1 (stutter/jank) | BLOCKING | — |
| Motion M2 (easing presence) | — | named justification required |
| Motion M3 (sustained life) | — | named justification required |
| Legibility L1 (text-flash floor) | BLOCKING | — |
| Legibility L2 (reading-budget share) | — | named justification required |
| Legibility L3 (detail stability) | — | named justification required |
| Code-craft C1-emoji (emoji in source) | — | named justification required |
| Code-craft C1-font (system/default-stack primary font) | — | named justification required |
| Code-craft C2-hex (raw hex in scenes) | — | named justification required |
| Code-craft C3-easing (linear/absent easing) | — | named justification required |
| Music-sync MS1 (tempo lock) | BLOCKING when analysis present; SKIP otherwise | — |
| Music-sync MS2 (downbeat lock) | BLOCKING when analysis present; SKIP otherwise | — |
| Music-sync MS3 (climax on drop) | — | named justification required (skips when no drops/climax) |
| Music-sync MS4 (cut-on-beat coverage) | — | named justification required (skips when no analysis) |

Advisory failures appear in `advisoryFailures` and are never hard blockers, but each
one must have a named, written justification recorded in the review before continuing.

---

**Canonical video verdicts are machine-asserted in `scripts/dogfood.golden.json`.**
Run `npm run dogfood:check` to verify. The golden is the source of truth; the
human summaries below are context only.

### RelayLaunch

```bash
scripts/ship-gate.sh RelayLaunch relay \
  --bg='#0A0E0B' --surface='#131A14' --text='#F2F5F0' \
  --textDim='#8FA098' --accent='#B6F22E' --accentAlt='#E5484D' \
  --audio-not-bundled
```

**Summary: `shipReady: true` · `blockers: []`**

Advisory fails (all named):
- hook / Background activity — no AmbientField; single terminal region. Intentional airy identity for Relay.
- hook / Frame-0 liveness — narrow terminal at 4×4 grid; human review confirms mid-action. See `hook.md §2 RelayLaunch`.
- retention / Energy build-to-climax — opening act front-loads intensity; narrative climax has lower delta. True signal; use `--climax=<narrativeClimaxFrame>` to gate the actual climax directly.
- legibility / Reading-budget share — typing animation classifies as held-text (74.9%); not a wall-of-text violation.

### GranipaLaunch

```bash
scripts/ship-gate.sh GranipaLaunch granipa \
  --bg='#0A0B0E' --surface='#14161D' --text='#F1F2F6' \
  --textDim='#8E93A3' --accent='#3D8BFF' --accentAlt='#F4604C' \
  --audio-not-bundled
```

**Summary: `shipReady: true` · `blockers: []`**

Advisory fails (all named):
- hook / Frame-0 liveness — serif question spans row 1 only; arc F intentionally withholds action until icon stamps. See `hook.md §2 GranipaLaunch`.
- retention / Energy build-to-climax — opening act front-loads intensity; sovereignty reveal has lower pixel delta. True signal; use `--climax=<narrativeClimaxFrame>` directly.
- legibility / Reading-budget share — icon stamp animations inflate held-text share (87.7%); visual anchors, not a violation.
