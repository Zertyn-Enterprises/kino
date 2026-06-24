# Open PR Triage — 2026-06-24

Audit of 5 open PRs against `integration/plan-wbqc72` (= main + plan-u73hla work).
Every claim below was verified by reading the relevant file on the integration tip;
no inference presented as fact.

## Evidence Table

| PR | Title | Verdict | Evidence |
|----|-------|---------|----------|
| #96 | perf(ship-gate): build corpus once, run all 8 gates concurrently | **SUPERSEDED** | See §PR-96 |
| #129 | backend(h-b1acc8b3): three-state coverage model — kill silent false-READY | **NEEDS-REBASE** | See §PR-129 |
| #133 | feat: registry-sync gate — kill silent false-PASS in distinctiveness guard | **NEEDS-REBASE** | See §PR-133 |
| #183 | backend(h-6b239b92): retention-pattern registry — 9 gate-PASS templates | **SUPERSEDED** | See §PR-183 |
| #206 | backend(h-2c3aabf5): ambient motif family — --ambient flag, drift advisory | **SUPERSEDED** | See §PR-206 |

---

## §PR-96 — SUPERSEDED

**PR:** "perf(ship-gate): build corpus once, run all 8 gates concurrently"
**Base when opened:** `integration/plan-e3x0pm`
**Head:** `backend/h-8ffe0a79/ship-gate-concurrent`

**What the PR proposes:**
1. `scripts/render-corpus.mjs`: split `framesDir` into `relDir`/`absFramesDir` to avoid Remotion's
   dot-path check; route child stdout → stderr so `$(...)` capture works.
2. `scripts/ship-gate.sh`: add `START_SECONDS` timer; build one shared corpus before all gates;
   run all 8 gates as backgrounded jobs; collect exit codes and print buffered output in order.

**Verified current state:**
- `render-corpus.mjs` lines 179–184 already have the `relDir`/`relFramesDir`/`absFramesDir` split,
  and line 216 already uses `stdio: ['inherit', process.stderr, process.stderr]`.
- `ship-gate.sh` already contains section `0. Build shared render corpus once` (line 53) and
  section `1. Run all gates concurrently` (line 66).

**Superseding commits:**
- `5fc5aef` — render-corpus.mjs module (initial corpus module)
- `626b9bd` — ship-gate.sh builds one shared corpus before gates
- `b29d381` — run ship gates concurrently — bounded 8-job parallel

**Disposition:** SUPERSEDED — close with evidence.

---

## §PR-129 — NEEDS-REBASE

**PR:** "backend(h-b1acc8b3): three-state coverage model — kill silent false-READY"
**Base when opened:** `integration/plan-grv3ba`
**Head:** `backend/h-b1acc8b3/three-state-coverage-model`

**What the PR proposes:**
1. `ship-metrics.mjs`: add `coverage: 'ran'|'skip-na'|'coverage-gap'` field to every gate object;
   add `coverageGaps: string[]` to the verdict; update `shipReady` to require `coverageGaps.length === 0`.
2. `ship-gate.sh`: add `declaresMusic` auto-detection (grep Main.tsx); add `--audio-not-bundled` flag.
3. `musicsync.md`: replace "Graceful SKIP mode" section with "Coverage integrity" section.
4. `ship.md`: document the three-state model and `--audio-not-bundled` flag.
5. `remediation.mjs`/`remediation.test.mjs`: add coverage-gap blocker entries.
6. `ship-metrics.test.mjs`: tests for new coverage shapes.

**Verified current state:**
- `ship-metrics.mjs` has **no** `coverage` field, **no** `coverageGaps` array (only `ran: boolean`).
- `ship-gate.sh` has **no** `declaresMusic` detection, **no** `--audio-not-bundled` handling.
- `remediation.mjs` has **no** `musicsync coverage-gap` or `payoff coverage-gap` entries.
- `musicsync.md` already has a three-state model (skip/unverified/verified, from PR #202) — different
  taxonomy from the coverage-gap/skip-na/ran model proposed here; the two conflict at the text level.
- `ship.md` dogfood examples do use `--audio-not-bundled` (added by later PRs) but the
  `ship-gate.sh` script itself does not yet handle the flag programmatically.

**Unique delta not on main:**
The `coverage` field + `coverageGaps[]` model in `ship-metrics.mjs`, the declaresMusic detection in
`ship-gate.sh`, and the remediation entries are all absent from main and provide genuine new value.

**Why NEEDS-REBASE (not UNIQUE-VALUE):**
The PR was authored against `integration/plan-grv3ba`. The `musicsync.md` section it replaces
was subsequently rewritten by PR #202 (merged) with a different three-state vocabulary.
`ship.md` has also shifted (ten→ten gates, interim wording changes). Applying this PR now would
produce a textual conflict on at least `musicsync.md` and `ship.md`. A human rebase or cherry-pick
of the functional code changes (ship-metrics.mjs, ship-gate.sh, remediation.mjs) with fresh doc
diffs against current HEAD is needed before merge.

---

## §PR-133 — NEEDS-REBASE

**PR:** "feat: registry-sync gate — kill silent false-PASS in distinctiveness guard"
**Base when opened:** `integration/plan-8s6l08`
**Head:** `backend/h-a3125e73/registry-sync-gate`

**What the PR proposes:**
1. `scripts/registry-sync-metrics.mjs` — NEW pure module for registry↔filesystem sync gate.
2. `scripts/registry-sync.sh` — NEW shell runner.
3. `scripts/distinct-metrics.mjs`: add `allowUnregistered = false` param to `computeDistinctMetrics`;
   when false and candidateSlug absent from registry, return HARD FAIL instead of synthesizing.
4. `scripts/preflight-metrics.mjs`: add P5-registry-sync HARD gate + P5-registry-orphan advisory.
5. `scripts/ship-metrics.mjs`: add registrySync as 11th gate.
6. `scripts/ship-gate.sh`: invoke registry-sync gate.
7. Docs: distinct.md registry-sync section, preflight.md P5 gates, ship.md "eleven gates", AGENTS.md, CLAUDE.md.
8. `scripts/dogfood.golden.json` / `scripts/dogfood.mjs`: updated for new gate.
9. Tests: registry-sync-metrics.test.mjs, distinct-metrics.test.mjs, preflight-metrics.test.mjs, ship-metrics.test.mjs.

**Verified current state:**
- `scripts/registry-sync-metrics.mjs` does **not** exist.
- `scripts/registry-sync.sh` does **not** exist.
- `distinct-metrics.mjs` does **not** have `allowUnregistered` — currently synthesizes a candidate from
  overrides when candidateSlug is absent (the silent false-PASS this PR targets).
- `preflight-metrics.mjs` uses P5 for the **promise** advisory gate (added post-plan-8s6l08); PR #133
  introduces P5-registry-sync as a HARD gate — a naming collision.
- `ship-metrics.mjs` has 10 gates (no registrySync).
- AGENTS.md/CLAUDE.md: no `registry-sync.sh` entry.
- NOTE: `distinct-metrics.mjs` already has a `registry-completeness` HARD check (from PR #142/f5cd049)
  that blocks distinct.sh when registry entries are missing or orphaned — related but orthogonal to the
  allowUnregistered false-PASS fix.

**Unique delta not on main:**
`registry-sync-metrics.mjs`, `registry-sync.sh`, `allowUnregistered` param (kills silent false-PASS),
and the 11th ship gate wiring are all absent and provide genuine value.

**Why NEEDS-REBASE (not UNIQUE-VALUE):**
The PR was authored against `integration/plan-8s6l08`. Since then:
- `preflight-metrics.mjs` added P5-promise advisory; PR #133's P5-registry-sync HARD gate collides
  on the P5 name (or renumbers gates, breaking existing tests).
- `ship-metrics.mjs` / `ship-gate.sh` have evolved significantly (10 gates, concurrent corpus, three-state
  musicsync model). A direct merge will produce conflicts on both files.
- `dogfood.golden.json` will certainly conflict with current golden values.
A human rebase against `integration/plan-wbqc72` HEAD is required before any merge decision.

---

## §PR-183 — SUPERSEDED

**PR:** "backend(h-6b239b92): retention-pattern registry — 9 gate-PASS templates in retention-patterns.mjs"
**Base when opened:** `integration/plan-5tcp5j`
**Head:** `backend/h-6b239b92/retention-patterns-registry`

**What the PR proposes:** Create `scripts/retention-patterns.mjs` as a new file with 9 gate-PASS
retention-pattern templates (1193 lines in the PR diff).

**Verified current state:**
```bash
$ ls scripts/retention-patterns.mjs
scripts/retention-patterns.mjs
$ wc -l scripts/retention-patterns.mjs
1486 scripts/retention-patterns.mjs
```

`scripts/retention-patterns.mjs` already exists with **1486 lines** — more content than the PR's 1193
(subsequent patterns or expansions were added). The file was introduced by commit `1534d07`
(`--body=<key>` flag + retention-patterns registry).

**Superseding commit:** `1534d07` — `backend(h-60deddfe): --body=<key> flag + retention-patterns registry`

**Disposition:** SUPERSEDED — close with evidence.

---

## §PR-206 — SUPERSEDED

**PR:** "backend(h-2c3aabf5): ambient motif family — --ambient flag, identity-seed auto-pick, drift advisory"
**Base when opened:** `integration/plan-00mldu`
**Head:** `backend/h-2c3aabf5/ambient-motif-scaffold-wiring`

**What the PR proposes:**
1. `scripts/ambient-motifs.mjs` — NEW file: motif registry for scaffold code gen.
2. `scripts/distinct-metrics.mjs`: add ambient-motif drift check.
3. `scripts/hook-archetypes.mjs`: add `ambientComponentName` param to `renderHookScene`.
4. Docs: hook.md background-activity gate text, hooks.md motif palette table, AGENTS.md/CLAUDE.md new-video command.

**Verified current state — every item already superseded:**

| PR #206 change | Current tree status | Superseding commit |
|---|---|---|
| `ambient-motifs.mjs` (new) | Superseded by `scripts/ambient-motif-keys.mjs` — richer API (`AMBIENT_MOTIF_COMPONENT_NAMES` + `AMBIENT_MOTIF_GATE_RECIPES`) | `7a37d73` (PR #207) |
| ambient-motif drift in `distinct-metrics.mjs` | Already present (lines 319–320, 462–473 in current file) | `65c931b` (PR #208) |
| `ambientComponentName` in `hook-archetypes.mjs` | Not present, but superseded: `new-video.mjs` uses `substituteAmbientMotif()` for equivalent string substitution at call site | `7a37d73` (PR #207) |
| `hook.md` background-activity gate update | Current line 36 already cites all 4 motifs (`AmbientField`/`MoteField`/`GridPulse`/`EmberRise`) | `89da30e` (PR #211) |
| `hooks.md` motif palette table | Lines 27–40 already contain full 4-motif table | `7a37d73` (PR #207) |
| `AGENTS.md`/`CLAUDE.md` `--ambient=<key>` | Both files already document `--ambient=<key>` with complete descriptions | `7a37d73` (PR #207) |

**Superseding commits:** `840dd64` (MoteField/GridPulse/EmberRise in fx.tsx), `7a37d73`
(--ambient flag in new-video.mjs + ambient-motif-keys.mjs), `65c931b` (ambient-motif drift docs + tests)

**Disposition:** SUPERSEDED — close with evidence.

---

## Recommended Actions

| PR | Action | Who |
|----|--------|-----|
| #96 | Close — cite superseding commits 5fc5aef / 626b9bd / b29d381 | Agent (Task 2) |
| #129 | Leave open — annotate as NEEDS-REBASE; functional delta is valuable | Human rebase decision |
| #133 | Leave open — annotate as NEEDS-REBASE; functional delta is valuable | Human rebase decision |
| #183 | Close — cite superseding commit 1534d07 | Agent (Task 2) |
| #206 | Close — cite superseding commits 840dd64 / 7a37d73 / 65c931b | Agent (Task 2) |

**Note for #129 and #133 human rebase:** These two PRs also touch overlapping files
(`ship-metrics.mjs`, `ship-gate.sh`, `ship.md`, `remediation.mjs`). They should be
rebased and merged in dependency order: #129 (coverage model) before #133 (registry-sync
builds on it), or consolidated into a single branch.
