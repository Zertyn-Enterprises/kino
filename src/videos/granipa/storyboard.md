# Grañipa v3 — storyboard (arc F: indictment)

Production state under the quality.md contract. Layouts are LOCKED by the
verified styleframes (specs in `styleframes.md`, renders in
`out/review/granipa-v3/`); stage D animates ON TOP of those layouts — motion
serves the styleframe, never reflows it.

Copy is the founder's launch text — exact strings live in `styleframes.md`.

## Pipeline state

- [x] A · brand & truth intake (real icon, URL, prices, README facts)
- [x] B · design-system lock (`theme.ts` + `fonts.ts` + `ui/system.tsx` +
      `ui/icons.tsx`; specimen verified: `out/review/granipa-v3/design-lock.png`)
- [x] C · styleframes — 9/9 built + adversarially verified (18 agents, 0 fixes)
- [x] E1 · music pick — USER PICKED candidate-1 → `music.mp3`
- [x] timeline re-lock: 92bpm phase-locked grid (firstDownbeatSec 0.0826,
      74 beats, 1450f); reveal cut ON the 15.75s drop, BLOOM on the 31s bloom
- [x] D · motion pass — 9/9 verified (resume workflow after session-limit
      kill) + SFX cue sheet on the new grid
- [x] F · engagement audit (full cut) → 8 defects → ALL FIXED (see
      motion.md "Post-audit amendments")
- [x] CHECKPOINT 2 · rough v3 watched — VERDICT: first 5s weak, music+SFX
      must change, overall rhythm too slow. → v3.1 fast re-cut:
- [ ] **E1-v2 · music pick — USER GATE: 4 new 122bpm candidates
      (energy from beat 1, hard drop ~1/3)**
- [ ] v3.1 re-grid to the pick (~35s target, see plan below) + scene
      re-time pass + Main rewired to the new `public/granipa/sfx/` palette
- [ ] rough v4 → checkpoint 2b (watch + listen)
- [ ] G · ship gate (side-by-side vs reference class) → final render --crf=16
      + registry entry + v2 leftover cleanup (kit.tsx, theme compat exports)

## v3.1 fast re-cut plan (~35s @ ~122bpm, beat ≈ 14.75f)

Beat budget (re-fit to the picked track's REAL drop — the reveal cut must
land ON it, same phase-lock procedure as v3): hook 5 · indict 12 ·
gutpunch 3 · reveal 6 · features 16 · architecture 9 · sovereignty 7 ·
kicker 8 · cta 7 = 73 beats ≈ 36s.

Per-scene re-time intent: hook = question from f0, icons blink f8/14/20,
punch f24, cut ≈f74 (2.5s — no dead air possible). Charges every 4 beats
(~2s each). Panes 4 beats each. All holds still ≥18f. New SFX palette
(`public/granipa/sfx/`): stamp=charges · whoosh-tight=pre-rolls ·
riser-snap=into drop/slam · drop-hit+sub-boom=reveal/slam impacts ·
tick/pop/slide=UI foley · glow=reveal+cta bloom · type-burst=rm/transcript ·
strike=kicker strikes · chime-end=cta.

## Scene status

| # | id | scene | styleframe | motion |
|---|----|-------|------------|--------|
| 1 | hook | the question + menu bar | verified | verified |
| 2 | indict | three charges + coral siphon | verified | verified |
| 3 | gutpunch | "you handed over everything." | verified | verified |
| 4 | reveal | real icon + gradient "on-device." | verified | verified |
| 5 | features | rebuilt app window, live transcript | verified | verified |
| 6 | architecture | "your mac" boundary + $ claude beam | verified | verified |
| 7 | sovereignty | ~/Grañipa folder + rm -rf | verified | verified |
| 8 | kicker | struck stack → $0 | verified | verified |
| 9 | cta | lockup + URL chip + rec seam | verified | verified |

## Stage-D motion notes (director intent, per scene)

1. **hook** — type settles word-by-word (serif, no bounce); menu bar icons
   blink alive one at a time AFTER the line lands. Camera: slow 1% drift.
2. **indict** — charges stamp on `INDICT_BEATS`; coral strings rise
   continuously (the siphon); the window's doc scrolls subtly. Each stamp =
   whoosh-soft + tick.
3. **gutpunch** — line 1 already there; line 2 cuts in hard on a sub-drop;
   then NOTHING moves for ≥24 frames (the silence is the effect).
4. **reveal** — world flip on the track's bloom: bg crossfades cold→warm,
   icon scales in with `dramatic` spring + glow swell, gradient line wipes
   on. The biggest audio+visual hit of the film.
5. **features** — transcript words stream in (typing rhythm); live-pill dot
   pulses; the pane cycles tools on `FEATURE_POPS` while the dock highlights
   the active one. Keycaps press (1-frame down-state) as each tool arrives.
6. **architecture** — boundary draws (stroke-dashoffset), nodes light left
   to right, the ONE beam extends to `$ claude` on `BLOOM` (impact+sub).
7. **sovereignty** — folder rows tick in on `SOV_BEATS`; at `DELETE_AT` the
   rm command types, folder card dissolves upward to nothing (whoosh-reverse);
   "delete it — it's gone." holds alone.
8. **kicker** — chips strike through one per beat (tick); riser into
   `KICK_SLAM`: $0 slams with screen-shake ≤4px (impact-hard + sub-drop).
9. **cta** — lockup breathes in soft; URL chip pops last (ding); waveform
   bars animate at "recording" idle — the next meeting, already local.

## Open notes

- CTA's URL chip rendered as a LIGHT pill (agent deviation, verifier-passed):
  highest-contrast element = the ask. Intentional — keep.
- v2 leftovers to delete at stage-D cleanup: `scenes/ui/kit.tsx`, theme's
  `cold`/`spiral` compat exports, `music.mp3` (after pick replaces it).
