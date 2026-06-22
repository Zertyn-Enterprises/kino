# Ship gate — unified verdict

Run `scripts/ship-gate.sh <CompId> <slug> [palette flags...] [-- retention flags...]`
to run all three gates (hook, retention, contrast) in sequence and produce:
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
    "hook":      { "ran": true, "hardGatesPass": true, "advisoryFailures": [], "justified": true },
    "retention": { "ran": true, "hardGatesPass": true, "advisoryFailures": ["energy build-to-climax"], "justified": false },
    "contrast":  { "ran": true, "hardGatesPass": true, "advisoryFailures": [], "justified": true }
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

See `hook.md`, `retention.md`, and `contrast.md` for the full gate specs. In brief:

| Gate | Hard | Advisory |
|---|---|---|
| Hook 1–3 (motion / frame-0 contrast / loop seam) | BLOCKING | — |
| Hook 4–5 (background activity / frame-0 liveness) | — | named justification required |
| Retention 1 (dead-air) | BLOCKING | — |
| Retention 2–3 (energy build / re-hook cadence) | — | named justification required |
| Contrast text on bg/surface | BLOCKING (≥7:1) | — |
| Contrast textDim on bg/surface | BLOCKING (≥4.5:1) | — |
| Contrast accent/accentAlt on bg | — | named justification required |

Advisory failures appear in `advisoryFailures` and are never hard blockers, but each
one must have a named, written justification recorded in the review before continuing.

---

**Recorded snapshots — do not hand-edit; re-run the command shown under each
video to update.**

### RelayLaunch

```bash
scripts/ship-gate.sh RelayLaunch relay \
  --bg='#0A0E0B' --surface='#131A14' --text='#F2F5F0' \
  --textDim='#8FA098' --accent='#B6F22E' --accentAlt='#E5484D'
```

_Snapshot pending — run the command above to record the first verified verdict._

### GranipaLaunch

```bash
scripts/ship-gate.sh GranipaLaunch granipa \
  --bg='#0A0B0E' --surface='#14161D' --text='#F1F2F6' \
  --textDim='#8E93A3' --accent='#3D8BFF' --accentAlt='#F4604C'
```

_Snapshot pending — run the command above to record the first verified verdict._
