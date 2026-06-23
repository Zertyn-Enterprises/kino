# Preflight gate — structural-integrity check

Run `scripts/preflight.sh <CompId> <slug>` before any render to verify that a
video is correctly wired. It is a **pre-render** gate — no Remotion render
required, no rendered corpus. Output lands in `out/review/<CompId>/preflight/`:

```
metrics.json   — machine verdict (hardGatesPass + per-gate detail)
metrics.txt    — human-readable table (tee'd output)
```

The script prints `PREFLIGHT: PASS|BLOCKED` and exits non-zero on HARD fail.

Use `node scripts/new-video.mjs <slug> <CompId>` to scaffold a new video
directory that **passes P1 and P2 by construction** — correctly registered,
all required files present, palette token placeholders in place.

## How it works

`scripts/preflight-metrics.mjs` reads source files as text (no AST, no Remotion
render, no import resolution). All inputs are read up front by the shell wrapper
and passed as plain strings/booleans to the pure `computePreflightVerdict`
function — safe to call from unit tests without any filesystem dependency.

## Gates

| Gate | Type | Condition |
|------|------|-----------|
| P1-registration | **HARD** | Composition `<CompId>` registered in `src/Root.tsx` with `width={1920}`, `height={1080}`, `fps={30}` (or bound to a `.fps` property), and `durationInFrames` bound to a timeline identifier (not a hardcoded integer literal). Parsed as text — no import. |
| P2-files | **HARD** | `src/videos/<slug>/` contains all six required items: `treatment.md`, `storyboard.md`, `theme.ts`, `timeline.ts`, `Main.tsx`, and a non-empty `scenes/` directory (at least one non-dotfile). |
| P3-approved | Advisory | `treatment.md` contains `Status: APPROVED`. Warns (does NOT block) when `Status: DRAFT` — preflight can and should run early in the storyboard phase. |
| P4-metadata | Advisory | `theme.ts` exports all five palette tokens (`bg`, `surface`, `text`, `textDim`, `accent`); `public/<slug>/MANIFEST.md` exists; `storyboard.md` contains the per-scene status table header (`\| #`). |
| P5-promise | Advisory | `timeline.ts` contains a `promise:` field on the hook scene. Warns (does NOT block) when absent — `hook.sh` Promise-by-2.5s and Text-density gates will HARD FAIL if undeclared. |
| P6-payoff | Advisory | When `promise:` is declared, `timeline.ts` must also contain a `payoff:` field on the climax/CTA scene. SKIPs when no promise is declared (no open loop to close). Warns (does NOT block) — the HARD enforcement lives in the closure gate (`scripts/payoff.sh` C1/C2) at ship time. |

**P1 and P2 are HARD gates.** Any P1 or P2 failure means `hardGatesPass: false`
and `scripts/preflight.sh` exits non-zero.

## Blocking vs advisory enforcement

**P1 (HARD):** An unregistered or mis-configured Composition means Remotion
cannot render the video at all. Fix before any render attempt.

**P2 (HARD):** Missing required files mean the director has skipped mandatory
structure (see Hard Rule #4 and the file-layout contract in SKILL.md). A video
with no `treatment.md` has had no director checkpoint. Fix before any render.

**P3 (advisory):** Treatment approval is a human checkpoint — P3 failing is
expected during the storyboard phase (status is `DRAFT`). P3 PASS (status:
`APPROVED`) is the gate for starting scene code (Hard Rule #4).

**P4 (advisory):** Advisory failures should be reviewed:
- `theme.ts` palette tokens: a missing token means scene components reading the
  theme will get `undefined` at runtime — fix before scene code.
- `MANIFEST.md` absent: required for any bundled asset; create the stub early.
- Storyboard status table absent: the resume mechanism relies on it.

**P5 (advisory):** Warns when `timeline.ts` has no `promise:` field on any scene. Without this declaration, `scripts/hook.sh` cannot machine-assert the Promise-by-2.5s and Text-density gates (gates 6 and 7 in `hooks.md`), and they will HARD FAIL. The scaffold from `scripts/new-video.mjs` includes a TODO placeholder by construction.

**P6 (advisory):** Warns when `timeline.ts` has a `promise:` field but no `payoff:` field. The open loop opened in the hook MUST close at the climax/CTA. The advisory here is an early warning — the HARD enforcement fires at ship time via the closure gate (`scripts/payoff.sh` C1 payoffDeclared / C2 payoffLandsLate). SKIPs when no `promise:` is declared (no open loop to close). The scaffold from `scripts/new-video.mjs` includes a TODO payoff stub on the CTA scene by construction.

**Machine signal:** `out/review/<CompId>/preflight/metrics.json` is the artifact
of record — inspect `hardGatesPass` and the per-gate `pass`/`advisory`/`skip`.

## Thresholds

All checks are textual/regex with the following rules:

| Check | Rule |
|-------|------|
| P1 width | `width={1920}` literal |
| P1 height | `height={1080}` literal |
| P1 fps | `fps={30}` literal OR `fps={<expr>.fps}` property reference |
| P1 durationInFrames | value must NOT match `/^\d+$/` (i.e. not a bare integer) |
| P2 scenes/ non-empty | `readdirSync(scenesDir).some(f => !f.startsWith('.'))` |
| P3 approved | `/^Status:\s*APPROVED/m` or `/^##\s*Status:\s*APPROVED/m` |
| P4 tokens | each of `bg`, `surface`, `text`, `textDim`, `accent` appears as `\b<token>\s*:` in `theme.ts` |
| P4 storyboard table | `/^\|[\s]*#/m` matches a row header in `storyboard.md` |
| P5 promise | `/\bpromise\s*:/` matches anywhere in `timeline.ts` |
| P6 payoff | SKIP when no `promise:` found; PASS when `/\bpayoff\s*:/` also matches; FAIL (advisory) when `promise:` present but `payoff:` absent |

---

**Recorded snapshots — 2026-06-23. Both reference videos `hardGatesPass: true`.**

### RelayLaunch

```bash
scripts/preflight.sh RelayLaunch relay
```

```
── Preflight structural-integrity metrics ───────────────────
P1-registration    PASS  Composition "RelayLaunch" registered: 1920×1080, fps 30, durationInFrames bound to timeline (HARD)
P2-files           PASS  all required files present (treatment.md, storyboard.md, theme.ts, timeline.ts, Main.tsx, scenes/) (HARD)
P3-approved        FAIL  treatment.md Status: DRAFT — get director approval before scene work (advisory) (advisory)
P4-metadata        PASS  theme tokens present (bg/surface/text/textDim/accent); MANIFEST.md present; storyboard status table present (advisory)
P5-promise         PASS  hook scene declares promise field in timeline.ts (advisory)
─────────────────────────────────────────────────────────────

Preflight review — out/review/RelayLaunch/preflight/
  metrics.json
  metrics.txt
PREFLIGHT: PASS
```

**P3 advisory:** treatment.md is `Status: DRAFT` — the relay treatment was never set to APPROVED in the open-source repo. P1/P2 pass; advisory does not block.

### GranipaLaunch

```bash
scripts/preflight.sh GranipaLaunch granipa
```

```
── Preflight structural-integrity metrics ───────────────────
P1-registration    PASS  Composition "GranipaLaunch" registered: 1920×1080, fps 30, durationInFrames bound to timeline (HARD)
P2-files           PASS  all required files present (treatment.md, storyboard.md, theme.ts, timeline.ts, Main.tsx, scenes/) (HARD)
P3-approved        FAIL  treatment.md has no Status: APPROVED marker — add "Status: APPROVED" when ready (advisory)
P4-metadata        PASS  theme tokens present (bg/surface/text/textDim/accent); MANIFEST.md present; storyboard status table present (advisory)
P5-promise         PASS  hook scene declares promise field in timeline.ts (advisory)
─────────────────────────────────────────────────────────────

Preflight review — out/review/GranipaLaunch/preflight/
  metrics.json
  metrics.txt
PREFLIGHT: PASS
```

**P3 advisory:** granipa treatment has no `Status:` line matching the approved pattern. P1/P2 pass; advisory does not block.
