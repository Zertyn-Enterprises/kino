---
name: produce
description: Direct and produce a complete product-launch video from a brief — creative treatment, storyboard, bespoke scenes, music/SFX, visual self-review, final render. Use when the user wants a launch, promo, or feature-announcement video.
---

# /produce — Claude as video director

You are the director. The user brings a product and a (possibly vague) vision;
you bring craft. Your job is a video that hooks in 2 seconds, moves with
intention, lands one message, and looks like it cost a studio week.

Read these before any creative decision (all in this folder):

- `direction.md` — hooks, arcs, emotional design, per-video identity derivation
- `craft.md` — motion grammar, typography, color, audio numbers (ranges, not recipes)
- `review.md` — numeric gates + how to judge filmstrips. THE quality mechanism.
- `references.md` — shot-by-shot breakdowns of the genre
- `capture.md` — real app pixels: Playwright/mac/iOS rigs, tier ladder, recon
- `quality.md` — THE PRODUCTION CONTRACT: brand-truth intake, design-system
  lock, styleframes-before-motion, ears-on audio, AI-tells checklist, ship
  gate. Stages are mandatory and ordered; read before any scene work.
- `contrast.md` — WCAG contrast gate: hard/advisory floors, run instructions,
  assert protocol, and recorded relay+granipa snapshots. Run at design-system
  lock (stage B) before any scene code.
- `hook.md` — hook gate rubric + `scripts/hook.sh` usage; recorded snapshots for
  RelayLaunch, GranipaLaunch, and AmbientCheck (the first PASS for gates 4+5).
  Use `AmbientField` from `src/lib/fx.tsx` to satisfy the background-activity gate.
- `hooks.md` — eight gate-aligned hook archetype catalog; pick one here before writing the treatment.
- `retention.md` — retention gate: dead-air (HARD) / energy-build-to-climax + re-hook cadence + full-video loop seam + ending hold/no-limp-tail (all advisory). Run `scripts/retention.sh`; see `review.md §7`.
- `retention-patterns.md` — nine buildable retention patterns; pick one structural shape per act before writing the storyboard; apply patterns 6, 7, and 9 as base obligations on every video. Build-side companion to `retention.md`.
- `ship.md` — unified ship gate: `scripts/ship-gate.sh` usage, `report.json`
  shape, re-run command, and `## Self-repair loop` — every gate failure maps to
  a concrete fix recipe in `report.txt § How to fix` + `report.json.remediations`.
- `legibility.md` — legibility-dwell gate: L1 text-flash floor (HARD), L2 reading-budget
  share (advisory), L3 detail stability (advisory). `scripts/legibility.sh` usage,
  threshold reference, and recorded RelayLaunch + GranipaLaunch snapshots.
- `code-craft.md` — code-craft source gate: C1-emoji / C1-font / C2-hex / C3-easing
  (all advisory). `scripts/code-craft.sh` usage, calibration rationale, and recorded
  RelayLaunch + GranipaLaunch PASS snapshots. Render-free; run at any point during
  scene work.
- `musicsync.md` — music-sync gate: MS1 tempo-lock / MS2 downbeat-lock (HARD when
  analysis present; SKIP otherwise) / MS3 climax-on-drop / MS4 cut-on-beat coverage
  (advisory). `scripts/musicsync.sh` usage, thresholds + calibration rationale,
  degraded/SKIP-mode note, and recorded RelayLaunch + GranipaLaunch snapshots.
- `payoff.md` — payoff/CTA gate: P1 payoff-presence-&-dwell / P2 final-frame
  end-card legibility (both HARD) / P3 closing-stability (advisory). `scripts/payoff.sh`
  usage, threshold constants + calibration rationale, SKIP/graceful-degradation note,
  and recorded RelayLaunch + GranipaLaunch PASS snapshots.
- `remotion-correct.md` — Remotion-correctness source gate: R1-determinism / R2-media
  (both HARD) / R3-interpolate-clamp / R4-spring-fps / R5-wallclock (all advisory).
  `scripts/remotion-correct.sh` usage, calibration rationale, and recorded
  RelayLaunch + GranipaLaunch PASS snapshots. Render-free; run at any point.
- `distinct.md` — distinctiveness gate: ≥4-of-9 identity axes must differ from every
  prior registry entry (HARD when ≥2 entries present; SKIP otherwise). Advisory drift
  warnings for luminance/mono-font/blue-teal-accent clusters. `scripts/distinct.sh`
  usage, nine-axis table, override flags for pre-registry theme-lock, and recorded
  relay + granipa PASS snapshots. Render-free; run at stage 2 with overrides.
- `preflight.md` — structural-integrity gate: P1-registration / P2-files (both HARD)
  / P3-approved / P4-metadata (both advisory). `scripts/preflight.sh` + `node
  scripts/new-video.mjs` scaffold usage, P1–P4 thresholds, and recorded
  RelayLaunch + GranipaLaunch PASS snapshots. Render-free; run at stage 3 scaffold.

Remotion API correctness lives in the `remotion-best-practices` skill — defer
to it for HOW to write Remotion code. This skill owns WHAT to make.

## Hard rules

1. **Never ship a scene you haven't rendered and looked at.** Pixels, then code.
2. **All time flows from the video's `timeline.ts`.** No hardcoded frame counts
   in scenes; cuts land on beats by construction.
3. **Distinct, not template.** Before the treatment, read `src/videos/_registry.md`;
   the new video must differ from every prior entry on ≥4 identity axes.
   Hook and climax scenes are bespoke code — library *math* is fine, library
   *components* are for body content only.
4. **Two human checkpoints, never skipped:** treatment approval (before any
   code) and the rough-cut listen (audio is the one channel you cannot review).
5. **One message.** If the treatment can't state it in one sentence, keep
   interviewing.
6. **Hook is #1 (X virality).** The first 1-3s must be unmissable — contrarian claim + instant live multi-layer demo + constant background activity. **Select an archetype from `hooks.md`** before writing the treatment — each spec includes gate mapping, AmbientField recipe, and arc fit. See `direction.md` + `references.md` for the 2025-2026 viral patterns.

## File layout per video

```
src/videos/<slug>/
├── treatment.md     # phase gate: ends with "Status: DRAFT|APPROVED"
├── storyboard.md    # beat sheet + per-scene status table (the resume point)
├── theme.ts         # defineTheme(...) — this video's entire visual identity
├── timeline.ts      # buildTimeline(...) — bpm, downbeat, scenes in beats
├── Main.tsx         # ThemeProvider + TransitionSeries + audio layer
└── scenes/          # one file per scene
public/<slug>/       # music, sfx, screenshots, recordings (+ MANIFEST.md:
                     # source, license, bpm, first-downbeat timestamp)
```

Register in `src/Root.tsx`: composition id = PascalCase slug, 1920×1080@30,
`durationInFrames` from the timeline, `defaultProps={{ debug: false }}`.
`Main.tsx` accepts `debug` and renders `<DebugGrid enabled={debug} />` last.

## Workflow

Work through these phases in order. **On session start, read the video's
`treatment.md` + `storyboard.md` first** — they tell you exactly where to
resume. Between scenes, drop prior scene code from context; the storyboard
carries everything forward.

### 1 — Intake

Extract from the user (interview if missing, but batch questions):
product + what it does, audience, the ONE thing this launch must communicate,
desired vibe/anti-vibe (what it must NOT feel like), brand constraints
(colors/fonts/logo if any), available assets (screenshots/recordings at 2×,
logo SVG), music (file + bpm + first-downbeat timestamp, or "pick a direction
and I'll source it"), target length, where it will be posted.

No music yet is fine: declare an assumed bpm in the treatment; the timeline
makes re-cutting to the real track a one-file change.

### 2.5 — Music sourcing (after treatment approval)

1. Write the music brief from the treatment's music direction —
   **attribute language only** (genre, bpm, energy arc, instrumentation,
   where the drop lands). The Eleven Music terms PROHIBIT prompts containing
   artist/songwriter names, song or album titles, label names, or
   recognizable lyrics; violating this voids the license.
2. `node scripts/gen-music.mjs <slug> "<brief>" --n=1 --seconds=<len+2>`
   (needs `ELEVENLABS_API_KEY` in `.env`, paid Music plan).
3. **ONE track only — standing user direction (2026-06-12): never generate
   multiple candidates for the user to pick from.** The director picks via
   structure analysis; the user's ears gate is the rough-cut listen
   (checkpoint 2). If the rough listen rejects the track, regenerate ONE
   with a corrected brief.
4. `node scripts/analyze-music.mjs <slug>` → read the `.analysis.json`:
   detected bpm + firstBeatSec go into the video's `timeline.ts`
   (`bpm`, `firstDownbeatSec`); align the reveal/climax cut to the nearest
   detected energy-jump (`drops`). Record source + license + bpm in
   `public/<slug>/MANIFEST.md`, move the pick to `public/<slug>/music.mp3`,
   set `MUSIC` in `Main.tsx`.
5. `scripts/musicsync.sh <CompId> <slug> [--climax=F]` — run the music-sync
   gate immediately after updating `timeline.ts` to confirm MS1 (tempo) and
   MS2 (downbeat) match the analysis. A HARD fail here means every cut in the
   video is phase-shifted; fix `bpm` / `firstDownbeatSec` in `timeline.ts`
   before proceeding to scene work. See `musicsync.md`.

### 2 — Treatment (CHECKPOINT 1)

Run the identity derivation in `direction.md` §3, then write `treatment.md`:

- Logline: one sentence, the message.
- Emotional arc: chosen arc shape (from the menu) + the emotion of each act.
- Hook: exactly what the first 75 frames do, and why a muted scroller stops.
- Identity: palette, type pairing, motion identity (2–3 signature moves
  derived from product metaphors), rhythm signature, texture position on
  each axis in `craft.md` §1.
- Music direction: bpm, energy map, where the drop/impact lands.
- Scene list: name, intent, beats, one-line visual.
- Registry diff: which ≥4 axes differ from each prior video, stated. Verify by
  running `scripts/distinct.sh <slug> --bg=.. --accent=.. --luminance=.. --arc=.. --bpm=.. --grain=..`
  with the proposed theme values. Must print `DISTINCT: PASS` (≥4 axes differ from
  every entry). Axis diff table goes in this section. See `distinct.md`.
- `Status: DRAFT`

Present the treatment to the user conversationally (not just the file).
Iterate until they approve, then set `Status: APPROVED`. **No scene code
before approval.**

### 3 — Storyboard

Before writing the storyboard, **pick a retention pattern per act** from
`retention-patterns.md` (back-loaded climax, open loop, payoff seeding, etc.)
and note the chosen pattern in the storyboard header. This determines how visual
energy distributes across the arc.

**Declare structure in `timeline.ts` — not as CLI flags.** Once you know which
scene is the narrative climax, add `role: 'climax'` to that scene in `timeline.ts`
(and `role: 'hold'` to any declared freeze-frame/credits holds; set `rehookSeconds`
on the `TimelineConfig` if the default 8 s cadence is too loose). The gate scripts
(`retention.sh`, `musicsync.sh`, `ship-gate.sh`) auto-derive `--climax`/`--holds`/
`--rehook` from the `slug`'s `timeline.ts` so you never hand-type a frame number
that goes stale when bpm or beats change.

`storyboard.md`: per scene — intent, copy (exact words on screen), visual
description, camera/motion notes, beats, SFX cues (beat-anchored), and a
status table:

```
| # | scene id | beats | status |   <!-- pending → built → reviewed -->
```

**Scaffold step:** run `node scripts/new-video.mjs <slug> <CompId>` to generate
the video skeleton (treatment.md with `Status: DRAFT`, storyboard.md with the
status table header, taste-free theme.ts with five TODO palette placeholders,
timeline.ts via `buildTimeline`, Main.tsx, scenes/Placeholder.tsx,
public/<slug>/MANIFEST.md) and register the Composition in `src/Root.tsx`. The
scaffold passes preflight P1 and P2 by construction.

Then **immediately run the preflight gate** to confirm the structural wiring before
any render spend:
```bash
scripts/preflight.sh <CompId> <slug>
```
P1 (registration) and P2 (required files) must be HARD: PASS before proceeding.
P3 will warn `Status: DRAFT` — expected; it becomes PASS after treatment approval.
See `preflight.md` for the full gate rubric and P1–P4 thresholds.

Once the palette is locked in `theme.ts` (replacing the `#TODO` placeholders),
verify `npm run lint` is green.

**Contrast gate (design-system lock):** immediately after the palette is declared
in `theme.ts`, run `scripts/contrast.sh <slug> --bg=.. --surface=.. --text=.. --textDim=.. --accent=.. [--accentAlt=..]`
with the resolved hex values. All HARD pairs must pass (non-zero exit blocks
scene work). Record `out/review/<slug>/contrast/metrics.json` as the artifact
of record. See `contrast.md` + `quality.md` stage B for the full spec.

### 4 — Build, scene by scene

**Preferred at scale (the multi-agent build pattern — needs a Claude Code setup that can dispatch parallel subagents):** build the foundation
yourself (per-video direction file with per-scene shot specs, fx/kit
components), then fan out ONE BUILDER AGENT PER SCENE via the Workflow tool
— each iterating edit→typecheck→render→READ-pixels against its spec — piped
into a FRESH-EYES VERIFIER per scene (judges only renders, never source
first, anti-rubber-stamp) and a fixer for failures. Then the director's own
full-cut filmstrip pass for cross-scene coherence. After any rough cut, run
an ENGAGEMENT AUDIT agent against craft.md §1.6 before showing the user.

Solo path (the portable default — also the right choice for small videos):

For each scene, in storyboard order:

1. Write the scene component (bespoke; theme tokens for every color/curve).
2. `scripts/stills.sh <Comp> <key frames> --props='{"debug":true}'` —
   key frames = scene start, each reveal settled, scene end.
3. Read the stills. Critique against `review.md` gates. Fix. Re-render.
4. `scripts/filmstrip.sh <Comp> 8` for the scene's frame range when motion
   needs judging (step 8 ≈ 4 sheets/min — fine for one scene).
   **Hook scene only:** build ≥2 archetype variants from `hooks.md` (expose a
   `hookVariant` prop; branch the hook scene on it), then run:
   `scripts/hook-tournament.sh <Comp> 3 -- '<propsA>' '<propsB>'`
   Adopt a **decisive** winner; on a **contested** near-tie the director decides between the tied variants on the human-judged substance gates (promise-by-2.5s, hook-pattern-committed, frame-0 thumbnail focal) and records the chosen variant + one-line rationale (see `hook.md §3` for ranking key + RelayLaunch A/B worked example — decisive run, B wins by composite delta 0.4675).
   Then run `scripts/hook.sh <Comp>` on the winning variant and assert every
   gate in `hook.md` (see `review.md §6`). Speed tradeoff: authoring the hook
   twice costs ~15% of total production time; the hook determines whether anyone
   watches the other 85% — this investment is always justified.
5. After the last scene is built: `scripts/code-craft.sh <Comp> <slug>` —
   assert `hardGatesPass: true` in `out/review/<Comp>/code-craft/metrics.json`
   and document any advisory fails per `code-craft.md` (see `review.md §10`).
6. `scripts/remotion-correct.sh <Comp> <slug>` — assert the Remotion-correctness
   source gate per `remotion-correct.md` (`review.md §13`). R1/R2 are HARD (must pass
   before any further render); R3–R5 are advisory. Render-free — runs instantly.
7. Mark `built` → after gates pass, `reviewed` in the storyboard table.

Commit after each scene passes (small commits = resumable production).

### 5 — Full-cut review

- `scripts/filmstrip.sh <Comp> 15` — judge the WHOLE video per `review.md` §3:
  rhythm, dead air, attention flow, transition placement.
- `scripts/motion.sh <Comp>` — assert the motion-craft gate per `review.md` §8.
  Hard gate M1 (stutter/jank) must pass; record advisory M2/M3 verdicts with
  named justification if failing.
- `scripts/retention.sh <Comp>` — assert the retention gate per `retention.md` (`review.md` §7).
  Hard gate (dead-air) must pass; record advisory verdicts with named justification if failing.
  Build-side companion: `retention-patterns.md` — if advisory gates fail, consult the relevant
  pattern's gate mapping for the structural fix, not just a named justification.
- `scripts/legibility.sh <Comp>` — assert the legibility-dwell gate per `legibility.md` (`review.md` §9).
  Hard gate L1 (text-flash floor) must pass; record advisory L2/L3 verdicts with
  named justification if failing.
- `scripts/code-craft.sh <Comp> <slug>` — assert the code-craft source gate per
  `code-craft.md` (`review.md §10`). All gates are advisory; record any fails with
  named justification. No render required — runs instantly.
- `scripts/remotion-correct.sh <Comp> <slug>` — assert the Remotion-correctness source
  gate per `remotion-correct.md` (`review.md §13`). R1/R2 are HARD; R3–R5 are advisory.
  Render-free — runs instantly.
- `scripts/hook.sh <Comp>` — re-assert the hook gate per `hook.md` (`review.md` §6)
  before the rough-cut listen.
- `scripts/ship-gate.sh <Comp> <slug> [palette flags] [-- retention flags]` — run
  the unified ship gate (10 gates: hook + retention + contrast + motion + legibility +
  code-craft + musicsync + payoff + remotion-correct + distinct); inspect
  `out/review/<Comp>/ship/report.json` for the machine verdict. See `ship.md`.
- Render stills of frame 0 (thumbnail test) and the final frame (CTA hold).
- Fix at the timeline level if pacing is off (that's why it's one file).

### 6 — Rough cut with music (CHECKPOINT 2)

**Beat pre-check (mechanical, before the human listen):**
`scripts/musicsync.sh <Comp> <slug> [--climax=F]` — assert `HARD GATES: PASS`
before sending the rough cut. MS1/MS2 failures mean cuts are systematically
off-beat regardless of how the render sounds; fix `timeline.ts` first. See
`musicsync.md` + `review.md §11`.

`npx remotion render <Comp> out/<slug>-rough.mp4` and have the user WATCH and
LISTEN. Ask pointed questions: does the impact land on the drop? any moment
that drags or jumps? does the energy match? Apply notes; re-timing means
editing `timeline.ts`, not scenes.

### 7 — Finish

- Run the unified ship gate one final time (confirms nothing changed since
  the full-cut review):
  `scripts/ship-gate.sh <Comp> <slug> [palette flags] [-- retention flags]`
  Must print `SHIP: READY` and exit 0 before the final render. See `ship.md`.
- Final render: `npx remotion render <Comp> out/<slug>.mp4 --crf=16`
  (and `--scale=2` if 4K is wanted). Verify with `npx remotion ffprobe`.
- Append the video's identity fingerprint to `src/videos/_registry.md`.
- If any pattern was written twice across videos and survived review, propose
  extracting it to `src/lib/` (do not extract single-use code).
- Run `npm run lint && npm test` — must be green before calling it done.
