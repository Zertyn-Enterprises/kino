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
6. **Hook is #1 (X virality).** The first 1-3s must be unmissable (contrarian claim + instant live multi-layer demo with constant background elements/things happening). Research current top viral X launch videos before every treatment. Video must feel fast/professional with parallel activity — no static/slow frames or people swipe. See direction.md + references.md for the 2025-2026 patterns.

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
- Registry diff: which ≥4 axes differ from each prior video, stated.
- `Status: DRAFT`

Present the treatment to the user conversationally (not just the file).
Iterate until they approve, then set `Status: APPROVED`. **No scene code
before approval.**

### 3 — Storyboard

`storyboard.md`: per scene — intent, copy (exact words on screen), visual
description, camera/motion notes, beats, SFX cues (beat-anchored), and a
status table:

```
| # | scene id | beats | status |   <!-- pending → built → reviewed -->
```

Then scaffold `theme.ts`, `timeline.ts`, `Main.tsx` (scenes as placeholders),
register the composition, and verify `npm run lint` + a 1-frame still render.

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
   **Hook scene only**: also run `scripts/hook.sh <Comp>` and assert every
   gate in `hook.md` (see `review.md` §6) before continuing.
5. Mark `built` → after gates pass, `reviewed` in the storyboard table.

Commit after each scene passes (small commits = resumable production).

### 5 — Full-cut review

- `scripts/filmstrip.sh <Comp> 15` — judge the WHOLE video per `review.md` §3:
  rhythm, dead air, attention flow, transition placement.
- `scripts/retention.sh <Comp>` — assert the retention gate per `retention.md` (`review.md` §7).
  Hard gate (dead-air) must pass; record advisory verdicts with named justification if failing.
- `scripts/hook.sh <Comp>` — re-assert the hook gate per `hook.md` (`review.md` §6)
  before the rough-cut listen.
- Render stills of frame 0 (thumbnail test) and the final frame (CTA hold).
- Fix at the timeline level if pacing is off (that's why it's one file).

### 6 — Rough cut with music (CHECKPOINT 2)

`npx remotion render <Comp> out/<slug>-rough.mp4` and have the user WATCH and
LISTEN. Ask pointed questions: does the impact land on the drop? any moment
that drags or jumps? does the energy match? Apply notes; re-timing means
editing `timeline.ts`, not scenes.

### 7 — Finish

- Final render: `npx remotion render <Comp> out/<slug>.mp4 --crf=16`
  (and `--scale=2` if 4K is wanted). Verify with `npx remotion ffprobe`.
- Append the video's identity fingerprint to `src/videos/_registry.md`.
- If any pattern was written twice across videos and survived review, propose
  extracting it to `src/lib/` (do not extract single-use code).
- Run `npm run lint && npm test` — must be green before calling it done.
