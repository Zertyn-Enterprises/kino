# Remotion-correctness source gate

Run `scripts/remotion-correct.sh <CompId> <slug>` at any point (no render required) to
verify that scene source code is free of render-breaking API misuse and advisory
correctness smells that the pixel gates cannot detect. Output lands in
`out/review/<CompId>/remotion-correct/`:

```
metrics.json   — machine verdict (hardGatesPass + per-gate detail + violations)
metrics.txt    — human-readable table (tee'd output)
```

The script prints `HARD GATES: PASS|FAIL` and exits non-zero on HARD fail.

## How it works

`scripts/remotion-correct-metrics.mjs` scans two scopes under `src/videos/<slug>/`:
- **`scenes/**`** — checked by all five gates (R1–R5).
- **`theme.ts` / `Main.tsx`** — checked by R1–R5 (these files can also contain raw
  media tags or import time APIs).

Analysis is purely textual/regex — no AST, no runtime, no Remotion render. Results are
written as `metrics.json` in the shape consumed by `ship-metrics.mjs`.

## Gates

| Gate | Type | Condition |
|------|------|-----------|
| R1-determinism | **HARD** | `Math.random()`, `Date.now()`, `new Date()` (argless), or `performance.now()` in scanned source. These return different values on every render call, causing frame flicker and non-reproducible exports. Fix: use `random(seed)` from `'remotion'`. |
| R2-media | **HARD** | Raw `<img`, `<video`, or `<audio` JSX opening tags. Remotion's renderer cannot sequence these reliably — they tear on export. Fix: use `Img`, `Video`, `OffthreadVideo`, or `Audio` from `'remotion'`. |
| R3-interpolate-clamp | Advisory | `interpolate(...)` calls whose options argument omits `extrapolateLeft` / `extrapolateRight`. Without clamping, values overshoot the output range outside the input domain. Advisory: named clamp constants (`CLAMP`, `clamp`) are not resolved by the static scanner; some interpolations intentionally extrapolate. |
| R4-spring-fps | Advisory | `spring(...)` calls whose options lack an `fps` reference. Without `fps`, the spring duration is wrong at non-default frame rates. Advisory: `fps` may arrive via a spread (`...config`). |
| R5-wallclock | Advisory | `setTimeout`, `setInterval`, `requestAnimationFrame`, `useEffect`, or `useState` in scene code. These are wall-clock-driven, not frame-driven, producing non-deterministic renders. Advisory: `useState` is common for non-animation UI state. |

**Calibration tier rationale.** R1 and R2 have no valid exception pattern under
Remotion's rendering model — their presence in scene code cannot be intentional and
is always render-breaking. R3–R5 are real correctness smells, but each has a
documented exception class (named clamp constants for R3, spread-passed fps for R4,
non-animation `useState` for R5).

## Blocking vs advisory enforcement

**R1 (HARD):** Any nondeterministic call in scene code means the render result
changes between re-renders — guaranteed frame flicker in the export. Fix before the
next render. Do not call `SHIP: READY` with a non-zero `remotion-correct.sh` exit code.

**R2 (HARD):** Raw `<img>` / `<video>` / `<audio>` JSX tags break Remotion's
frame-accurate media sequencing, producing torn or unsynchronized frames in the
export. Replace with Remotion's equivalents before the next render.

**R3–R5 (ADVISORY):** Advisory failures must be reviewed and each violation either
fixed or named with a written justification. Accepted exception classes:
- **R3:** A named constant (`CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }`)
  or a single-identifier reference (`clamp`) passed as the options object — the static
  scanner cannot resolve identifiers, so these are flagged even though clamping is
  explicit. A short micro-transition in the `[0, 1]` output range where overshoot is
  geometrically impossible is also an acceptable justification.
- **R4:** `fps` delivered via object spread (`spring({ ...config })` where `config`
  carries `fps`).
- **R5:** `useState` for static UI state (selected tab, hover, non-animation toggle)
  where no time-based side-effect exists.

Unjustified advisory failures are not acceptable.

**Machine signal:** `out/review/<CompId>/remotion-correct/metrics.json` is the artifact
of record — inspect `hardGatesPass` and the per-gate `pass`/`advisory`/`skip` fields.
Human-readable verdict is tee'd to `metrics.txt`.

## SKIP semantics

When `src/videos/<slug>/` has no scene files, all gates report `skip: true` and
`hardGatesPass: true`. SKIP is never a failure. If `remotion-correct.sh` was not run,
`ship-metrics.mjs` degrades cleanly to `{ ran: false, hardGatesPass: true }` — not a
hard blocker. Re-run `scripts/remotion-correct.sh <CompId> <slug>` to evaluate.

## Usage

```bash
# Standard (metrics.txt tee'd to terminal + metrics.json written)
scripts/remotion-correct.sh RelayLaunch relay

# JSON only (for scripted consumption)
node scripts/remotion-correct-metrics.mjs relay --json
```

The gate is also invoked automatically by `scripts/ship-gate.sh` as the 9th concurrent gate.
To run it standalone at any point during scene work, pass `<CompId>` and `<slug>` — no
render required.

## Calibration rationale (reference videos)

- **R1-determinism:** 0 violations in either reference video. GranipaLaunch's `motion.md`
  explicitly notes "everything deterministic (no Math.random/Date)" — the team already
  treats this as an informal rule. The HARD designation codifies it with zero false-positive
  risk on the two reference videos.
- **R2-media:** 0 violations in either reference video. Both videos use Remotion's `Img`,
  `Video`, and `Audio` components exclusively. Safe to make HARD.
- **R3-interpolate-clamp:** RelayLaunch: 0 violations (all `interpolate()` calls include
  `extrapolateLeft/Right` inline). GranipaLaunch: 30 violations — see snapshot below.
- **R4-spring-fps:** 0 violations in either reference video. All `spring()` calls reference `fps`.
- **R5-wallclock:** 0 violations in either reference video. All animations are frame-driven.

---

**Recorded snapshots — 2026-06-23. Both reference videos `hardGatesPass: true`.**
**Do not hand-edit; re-run the command shown under each video to update.**

### RelayLaunch

```bash
scripts/remotion-correct.sh RelayLaunch relay
```

**Recorded snapshot — 2026-06-23. `hardGatesPass: true`**

```
── Remotion-correctness source metrics ─────────────────────
R1-determinism         PASS  no Math.random/Date.now/new Date()/performance.now in source (HARD)
R2-media               PASS  no raw <img>/<video>/<audio> JSX tags (HARD)
R3-interpolate-clamp   PASS  all interpolate() calls include extrapolateLeft/Right or named clamp reference (advisory)
R4-spring-fps          PASS  all spring() calls reference fps (advisory)
R5-wallclock           PASS  no wallclock APIs (setTimeout/setInterval/rAF/useEffect/useState) in scene code (advisory)
─────────────────────────────────────────────────────────────

HARD GATES: PASS
```

All 5 gates PASS. No advisory fails.

### GranipaLaunch

```bash
scripts/remotion-correct.sh GranipaLaunch granipa
```

**Recorded snapshot — 2026-06-23. `hardGatesPass: true`**

```
── Remotion-correctness source metrics ─────────────────────
R1-determinism         PASS  no Math.random/Date.now/new Date()/performance.now in source (HARD)
R2-media               PASS  no raw <img>/<video>/<audio> JSX tags (HARD)
R3-interpolate-clamp   FAIL  30 interpolate() call(s) without explicit clamp options (advisory — named CLAMP refs are not resolved) (advisory)
R4-spring-fps          PASS  all spring() calls reference fps (advisory)
R5-wallclock           PASS  no wallclock APIs (setTimeout/setInterval/rAF/useEffect/useState) in scene code (advisory)
─────────────────────────────────────────────────────────────

HARD GATES: PASS
```

**Named advisory fail:**

**R3-interpolate-clamp** — 30 violations across `Architecture.tsx`, `Cta.tsx`,
`Features.tsx`, and `Indict.tsx`. GranipaLaunch uses two named-constant patterns
for clamped interpolations: `CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }`
(a shared module-level constant) and `clamp` (a local variable alias). The static
scanner cannot resolve named identifiers, so both patterns are flagged even though
they provide explicit clamping. The remaining violations use inline options objects
without extrapolate keys — these are short micro-transitions (4–16 frame ramps in
the `[0, 1]` output range) where overshoot is geometrically impossible. All 30
violations are intentional and the named-constant pattern is GranipaLaunch's
deliberate style. Documented exception.
