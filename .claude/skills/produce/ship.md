# Ship gate — unified verdict

Run `scripts/ship-gate.sh <CompId> <slug> [palette flags...] [-- retention flags...]`
to run all five gates (hook, retention, contrast, motion, legibility) in sequence and produce:
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
  and forwarded to `retention.sh`.
- Motion gate runs automatically (`scripts/motion.sh <CompId>`, default step=3).
- Legibility gate runs automatically (`scripts/legibility.sh <CompId>`, default step=3).

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
    "legibility": { "ran": true, "hardGatesPass": true, "advisoryFailures": ["Reading-budget share"], "justified": false }
  },
  "blockers": []
}
```

- `shipReady` — `true` iff every gate ran AND every gate's `hardGatesPass` is `true`.
- `gates.<name>.ran` — `false` if the gate's `metrics.json` was absent.
- `gates.<name>.hardGatesPass` — mirrors `hardGatesPass` from that gate's `metrics.json`.
- `gates.<name>.advisoryFailures` — names of failing advisory gates/pairs; never block.
- `gates.<name>.justified` — `true` when no advisory failures are present.
- `blockers` — list of hard blockers (missing gates, hard-gate failures); empty when ship-ready.

A missing or unreadable gate `metrics.json` is reported as `ran: false`,
`hardGatesPass: false`, and the gate name is added to `blockers`.

## Per-gate semantics

See `hook.md`, `retention.md`, `contrast.md`, `motion.md`, and `legibility.md` for the full gate specs. In brief:

| Gate | Hard | Advisory |
|---|---|---|
| Hook 1–3 (motion / frame-0 contrast / loop seam) | BLOCKING | — |
| Hook 4–5 (background activity / frame-0 liveness) | — | named justification required |
| Retention 1 (dead-air) | BLOCKING | — |
| Retention 2–3 (energy build / re-hook cadence) | — | named justification required |
| Contrast text on bg/surface | BLOCKING (≥7:1) | — |
| Contrast textDim on bg/surface | BLOCKING (≥4.5:1) | — |
| Contrast accent/accentAlt on bg | — | named justification required |
| Motion M1 (stutter/jank) | BLOCKING | — |
| Motion M2 (easing presence) | — | named justification required |
| Motion M3 (sustained life) | — | named justification required |
| Legibility L1 (text-flash floor) | BLOCKING | — |
| Legibility L2 (reading-budget share) | — | named justification required |
| Legibility L3 (detail stability) | — | named justification required |

Advisory failures appear in `advisoryFailures` and are never hard blockers, but each
one must have a named, written justification recorded in the review before continuing.

---

**Recorded snapshots — 2026-06-22. Do not hand-edit; re-run the command shown under each
video to update.**

### RelayLaunch

```bash
scripts/ship-gate.sh RelayLaunch relay \
  --bg='#0A0E0B' --surface='#131A14' --text='#F2F5F0' \
  --textDim='#8FA098' --accent='#B6F22E' --accentAlt='#E5484D'
```

**Recorded snapshot — 2026-06-22. `shipReady: true` · `blockers: []`**

| Gate | Hard gates | Advisory failures |
|---|---|---|
| hook 🤖 | PASS | Background activity, Frame-0 liveness |
| retention 🤖 | PASS | Energy build-to-climax |
| contrast 🤖 | PASS | — |
| motion 🤖 | PASS | — |
| legibility 🤖 | PASS | Reading-budget share |

Motion measured: M1 stutterDetected=false (windows=8, cuts=7) · M2 ratio=17.674 · M3 minWindowMean=0.0627

Legibility measured: L1 intervals=31 eligible=17 violations=0 shortestDwell=15f · L2 share=74.9% · L3 meanCv=0.033

**Named advisory fails:**
1. **hook / Background activity** — no `AmbientField`; single terminal region (active=1/16, not separated). Intentional airy identity for Relay. Add `AmbientField` to pass on future productions.
2. **hook / Frame-0 liveness** — terminal in single grid row (cells=2/16, rows=1). Named: narrow terminal at 4×4 resolution; human review confirms mid-action. See `hook.md §2 RelayLaunch`.
3. **retention / Energy build-to-climax** — pixel-energy peak at f265, before first-third boundary (f318). Named: large scene transition coincides with pixel peak, not narrative climax. Supply `--climax=F` to gate the actual climax on future productions.
4. **legibility / Reading-budget share** — typing animation in the terminal holds high edge density while remaining temporally stable; algorithm classifies animation pauses as held-text intervals (share 74.9% > 60%). Intentional: the typing IS readable text, not a wall-of-text violation.

### GranipaLaunch

```bash
scripts/ship-gate.sh GranipaLaunch granipa \
  --bg='#0A0B0E' --surface='#14161D' --text='#F1F2F6' \
  --textDim='#8E93A3' --accent='#3D8BFF' --accentAlt='#F4604C'
```

**Recorded snapshot — 2026-06-22. `shipReady: true` · `blockers: []`**

| Gate | Hard gates | Advisory failures |
|---|---|---|
| hook 🤖 | PASS | Frame-0 liveness |
| retention 🤖 | PASS | Energy build-to-climax |
| contrast 🤖 | PASS | — |
| motion 🤖 | PASS | — |
| legibility 🤖 | PASS | Reading-budget share |

Motion measured: M1 stutterDetected=false (windows=2, cuts=1) · M2 ratio=19.201 · M3 minWindowMean=0.1538

Legibility measured: L1 intervals=21 eligible=15 violations=0 shortestDwell=36f · L2 share=87.7% · L3 meanCv=0.061

**Named advisory fails:**
1. **hook / Frame-0 liveness** — text confined to single grid row (cells=3/16, rows=1). Named: serif question spans row 1 only; arc F intentionally withholds action until icon stamps at f38–f54. See `hook.md §2 GranipaLaunch`.
2. **retention / Energy build-to-climax** — pixel-energy peak at f290, before first-third boundary (f373). Named: scene transition (largest visual delta) precedes narrative climax. Supply `--climax=F` to gate the actual climax on future productions.
3. **legibility / Reading-budget share** — icon stamp animations hold high edge density while dipping below the temporal-delta threshold; algorithm classifies these as held-text intervals (share 87.7% > 60%). Intentional: these are visual anchors, not a wall-of-text violation.
