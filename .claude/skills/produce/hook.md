# Hook gate — frames 0–90 + loop seam

Run `scripts/hook.sh <CompId>` to produce the evidence this gate needs:
- `out/review/<CompId>/hook/frame0.png` — full-res frame 0 (thumbnail test)
- `out/review/<CompId>/hook/early.png` — full-res frame 9 (motion-by-frame-10 sample)
- `out/review/<CompId>/hook/mid.png` — full-res ~60% of hook window (background-activity sample)
- `out/review/<CompId>/hook/sheet/` — contact sheet, frames 0..hookFrames at step 3
- `out/review/<CompId>/hook/final.png` — full-res final frame (loop-seam comparison)
- `out/review/<CompId>/hook/metrics.json` — machine-readable gate verdict (source of truth)
- `out/review/<CompId>/hook/metrics.txt` — human-readable table (tee'd output)

Hook craft rules live in `direction.md` §2 (v1/v2/v3). This file turns them
into measurable pass/fail gates.

## 0. Anti-rubber-stamp

Same-session review drifts toward approval. Counteract mechanically:

For the hook you must either (a) name **3 concrete hook defects with frame
numbers** and fix the ones that matter, or (b) explicitly assert **each gate
below with its measured value** ("motion visible at frame 9 ✓", "promise on
screen at frame 68 ✓"). "Looks good" is not a review.

Judge `frame0.png` and the contact sheet BEFORE re-reading scene source —
the code's intent cannot excuse the pixels' reality.

## 1. Hook gates

| Gate | Pass |
|---|---|
| Frame-0 thumbnail | One focal point findable <0.5s at thumbnail size; frame is mid-action (motion already underway — not a logo, title card, or empty state); high contrast |
| Frame-0 liveness 🤖 | 4×4 grid cells on frame0 with local luminance stddev >10 must satisfy one of: (A) span ≥2 rows AND total ≥2 cells; OR (B) concentrated focal: total ≥2 cells AND at least one cell stddev >20 (≈2× threshold). Flat/near-solid frame-0 (all cells <10) fails both paths. |
| Text density 🤖 | If text present in the hook: ≤6 words per on-screen moment (machine-asserted from `promise.wordCount` in `timeline.ts`) |
| Motion by frame 10 | Visible change between tiles 0 and 3 in the contact sheet (frames 0 and 9 at step 3); not a freeze |
| Focal + alive | Exactly one dominant focal point in each key tile AND ≥1 active background/parallel layer (data stream, side panel, micro-update) — no tile fully static |
| Background activity 🤖 | 4×4 grid cells show mean-abs-luminance-delta (frame0 vs mid-hook frame) >5; must satisfy one of: (A) ≥2 active cells spatially separated (Chebyshev distance ≥2); OR (B) concentrated focal: highest active-cell delta >10 (≈2× floor). Frozen/low-motion single region (max delta 5–10) fails both paths. **Choose one living-background motif from `src/lib/fx.tsx` — `AmbientField` (strips), `MoteField`, `GridPulse`, or `EmberRise` — and compose it as the background layer; see AmbientCheck fixture for a reference PASS. All four motifs satisfy this gate by construction (use `--ambient=<key>` in `new-video.mjs` to wire one into the scaffold).** |
| Hook pattern committed | Treatment declares ONE pattern (mid-action demo / bold claim / dramatized pain / pattern interrupt / number); first 90 frames commit to it without mixing patterns |
| Promise by 2.5s 🤖 | A specific outcome or number ("what this changes for ME") is legible on screen at or before frame 75 (tile ~25 at step 3). **Pain-first arcs (B, F):** a tension number — the problem's cost or scale (e.g. a wait-time counter, a monthly cost) — satisfies this gate; record what the number represents. **Short hooks:** if your hook scene ends before frame 75, assess at hook-end and record the actual end frame. Machine-asserted from `promise.frame` in `timeline.ts` (`promise.frame ≤ round(2.5 × fps)`, HARD). |
| Open loop closed | The question the hook poses is answered by the reveal — not forgotten (satisfied = delight; dangling = clickbait) |
| Loop seam | `final.png` visually rhymes with `frame0.png` — compatible color field, similar energy level, or deliberate visual echo; autoplay restart is not jarring |

## 2. Captured metrics

`scripts/hook.sh` writes `metrics.json` and `metrics.txt` to `out/review/<CompId>/hook/` on every run — these are the source of truth for measured gate values. No manual transcription needed or expected.

```
cat out/review/<CompId>/hook/metrics.json   # machine verdict (hardGatesPass, per-gate results)
cat out/review/<CompId>/hook/metrics.txt    # human-readable table
```

The closing line of `hook.sh` prints `HARD GATES: PASS` or `HARD GATES: FAIL` and the script exits non-zero on hard-gate failure — consumable by automated loops.

## 3. Hook tournament

Building ≥2 archetype variants and running the tournament is the required hook authoring flow (see `SKILL.md §4`). The tournament ranks variants by gate-strongest metrics. Adopt a **decisive** winner; on a **contested** near-tie the director decides between the tied variants on the human-judged substance gates (promise-by-2.5s, hook-pattern-committed, frame-0 thumbnail focal) and records the chosen variant + one-line rationale.

```bash
scripts/hook-tournament.sh <CompId> [step] -- '<propsA>' '<propsB>' [..]
```

Convention: expose a `hookVariant` prop on the composition; the hook scene branches on it to render different cold-open treatments.

**Output:**
- `out/review/<CompId>/hook-tournament/variant-N/` — frame0, early, mid, final, metrics.json, props.txt per variant
- `out/review/<CompId>/hook-tournament/ranking.json` — machine result `{ ranking, winner }`
- `out/review/<CompId>/hook-tournament/summary.txt` — human-readable ranking table

**Ranking key:** PRIMARY = hard gates passed (1–3) descending; SECONDARY = normalized weighted composite of viral-relevant raw measures (background-activity active-cell count & separation, frame-0 liveness cells×rows, motion magnitude, frame-0 contrast); deterministic tie-break by label. See `scripts/hook-tournament-metrics.mjs` header for calibration rationale.

After the tournament, adopt the winner's `hookVariant` value as the production hook scene, then run `scripts/hook.sh` one final time to generate the canonical `hook/metrics.json` artifact of record.

**Recorded snapshot — RelayLaunch (2026-06-22)**

Run: `scripts/hook-tournament.sh RelayLaunch 3 -- '{"hookVariant":"A"}' '{"hookVariant":"B"}'`

Variant A = Archetype 3 Dramatized-pain (shipped hook, unchanged). Variant B = Archetype 2 Bold/contrast claim — "Your CI is lying." — KineticLine word-slam (`at={-3}`, slamFrames=6) + AmbientField (density=40, energy=0.8). Both pass all 3 hard gates. **B wins by composite score; delta = 0.4675 — not a tie-break.**

| Rank | Variant | Hard gates (1–3) | Composite |
|------|---------|-----------------|-----------|
| **1 (winner)** | B | 3/3 | 0.5438 |
| 2 | A | 3/3 | 0.0763 |

Winner B key measures: motion delta=4.69 (vs A=0.29), frame-0 contrast stddev=26.27 (vs A=7.45), frame-0 liveness rows=3 cells=5 (vs A rows=1 cells=2). B's KineticLine slam and AmbientField distribute energy across rows 0–2 from frame 0, lifting both liveness and motion far above A's single-row terminal.

`out/review/RelayLaunch/hook-tournament/ranking.json` committed.

---

**Recorded snapshot — 2026-06-20. Do not hand-edit; re-run `scripts/hook.sh <CompId>` to update.**

Gates marked 🤖 are machine-asserted (see `metrics.json`). Remaining gates are human-judged from the contact sheet.

### RelayLaunch

Hook scene: f0–f149 (10 beats @ 120 bpm). Hook window auto-derived: 149 frames (full hook, no manual override needed).

| Gate | Measured value | Pass? |
|---|---|---|
| Frame-0 thumbnail | `git push` half-typed, cursor block lit; terminal is single focal point; high-contrast white on near-black (#0A0E0B) | ✓ |
| Frame-0 liveness 🤖 | cells=2/16 rows=1 (stddev>10: (1,0)=11.7, (1,1)=23.4); max-stddev=23.4 > focal-threshold=20 | ✓ (focal path: max-stddev >20, cells ≥2) |
| Text density 🤖 | `git push` (2 words); promise.wordCount=2 ≤ 6 | ✓ |
| Motion by frame 10 🤖 | delta=0.29 (frame0 vs frame9); typing animation: f0 shows `git push █`, f9 shows more chars typed + cursor shift | ✓ (threshold >0.1) |
| Frame-0 contrast 🤖 | stddev=7.45; white terminal text on near-black field | ✓ (threshold >5.0) |
| Focal + alive | Terminal = sole focal ✓; background is static dark with no active parallel layer — "airy" identity choice for Relay, but the background-activity sub-gate is absent | ⚠ borderline |
| Background activity 🤖 | mid=frame89 (60% of hook); active=1/16 separated=false; cell (1,1) delta=12.2 > focal-threshold=10 | ✓ (focal path: max-delta >10) |
| Hook pattern committed | "Dramatized pain": typing → git output → "Queued — waiting for runner" (f52) → red elapsed timer (f75) | ✓ |
| Promise by 2.5s 🤖 | Red elapsed timer `0:00 elapsed` appears at exactly f75; **tension number** (wait-time counter, arc B) — clock accelerates to 14:32 by f148; pain scale is legible on element-1.png; promise.frame=52 ≤ 75 (round(2.5×30)) | ✓ (arc B) |
| Open loop closed | Hook poses "how long will I wait?" → closed at reveal scene (f240+, "Push. It's already live.") | ✓ |
| Loop seam 🤖 | delta=6.56 (frame0 vs final); dark terminal `git push` vs dark "Relay" wordmark — same near-black palette, quiet energy on both ends | ✓ (threshold <60) |

**Named defects:**
1. **f0/background static** — no active parallel layer behind the terminal in any hook frame. Terminal content is kinetic (text appears, cursor blinks); absence of a background layer is an intentional airy choice, but "Focal + alive" sub-gate (≥1 background layer) is not met. Gate 4 (Background activity 🤖) PASSes via the concentrated-focal path: single terminal cell (1,1) delta=12.2 > focal-threshold=10.0 (intentional identity choice; human "Focal + alive" sub-gate ⚠ borderline).
2. **f75 timer reads 0:00** — a reviewer reading only the contact sheet might not realize the timer _starts_ here and accelerates off-screen; element-1.png (second-page tiles) shows the clock in motion and confirms the number is real.
3. **f0 liveness: terminal in single grid row** — Gate 5 (Frame-0 liveness 🤖) PASSes via the concentrated-focal path: cells=2/16 rows=1, max-stddev=23.4 > focal-threshold=20.0. The terminal is genuinely live content (half-typed `git push`); the focal path correctly recognizes strong single-region liveness.

---

### GranipaLaunch

Hook scene: f0–f73 (5 beats @ 122 bpm = 2.46s). Hook window auto-derived: 73 frames (full hook, no indict-scene bleed).

| Gate | Measured value | Pass? |
|---|---|---|
| Frame-0 thumbnail | "what your mac tools see in a day:" in serif display; readable at thumbnail; menu bar composed at top; icons not yet visible — micro-settle only (opacity 0.85→1.0, 3px translate, f0–f8) | ⚠ borderline |
| Frame-0 liveness 🤖 | cells=3/16 rows=1 (stddev>10: (1,0)=45.0, (1,1)=49.3, (1,2)=43.4); max-stddev=49.3 > focal-threshold=20 | ✓ (focal path: max-stddev >20, cells ≥2) |
| Text density 🤖 | "what your mac tools see in a day:" = **8 words** — exceeds ≤6 limit; promise.wordCount=8 > 6 (HARD FAIL) | ✗ |
| Motion by frame 10 🤖 | delta=1.40 (frame0 vs frame9); line-settle animation (opacity + translateY) f0–f8 — measurable in pixels | ✓ (threshold >0.1) |
| Frame-0 contrast 🤖 | stddev=20.64; ominous serif question on dark field | ✓ (threshold >5.0) |
| Focal + alive | Serif question = dominant focal ✓; three icons stamp in as active secondary layer at f38, f46, f54 ✓ | ✓ |
| Background activity 🤖 | mid=frame43 (60% of hook); active=3/16 separated=true; (1,0)=6.1, (1,1)=8.0, (1,2)=6.2 all exceed floor; (1,0)↔(1,2) Chebyshev distance=2 | ✓ (threshold ≥2 separated, cell>5) |
| Hook pattern committed | Indictment / open question: "what your mac tools see in a day:" (open colon) sustained through f73 without mixing patterns | ✓ |
| Promise by 2.5s 🤖 | Hook ends f73 (2.46s); promise.text declared at byFrame=8 (ominous question text); arc F defers the positive number ("$0", "$14/mo → $0") to the kicker scene; promise.frame=8 ≤ round(2.5×30)=75 — frame gate passes, but wordCount gate fails (see Text density above) | ✗ (wordCount HARD FAIL; arc F copy defect) |
| Open loop closed | "what … in a day:" (surveillance open colon) → closed at reveal + sovereignty scenes ("your account. your rules.") | ✓ |
| Loop seam 🤖 | delta=9.46 (frame0 vs final); dark charcoal (#0A0B0E) ominous question vs dark blue (#0C0F17) Grañipa mark — compatible darkness; energy shift ominous→resolved is deliberate | ✓ (threshold <60) |

**Named defects:**
1. **Text density** — 8 words fails ≤6 gate. The full question is copy-essential for arc F indictment; shortening it breaks the setup. This is a known tension between the gate and copy-first hooks where the question IS the action. No fix without creative change.
2. **Frame-0 mid-action / title-card** — icons don't stamp until f38; f0 reads as a composed text-only card. The micro-settle (3px, opacity) is insufficient to satisfy "motion already underway" strictly. Gate 5 (Frame-0 liveness 🤖) PASSes via the concentrated-focal path: cells=3/16 rows=1, max-stddev=49.3 > focal-threshold=20.0. The serif question's high luminance-contrast text cells correctly register as live focused content, not a static card.
3. **Background activity PASS note** — Gate 4 PASSES (active=3/16 separated=true), but the 3 active cells at mid=f43 reflect the settle-animation residual delta across the text width (opacity 0.85→1.0 completed by f8, but f43 vs f0 still shows the delta). The icons' secondary-layer activity at f38–f54 contributes to (2,0) at later frames. The PASS is honest: motion at f43 IS spatially distributed (text spans cols 0–2 in row 1), confirming multi-region activity vs RelayLaunch's single-cell terminal.

---

### AmbientCheck (gate-pass reference fixture)

First recorded PASS for both gate 4 (Background activity 🤖) and gate 5 (Frame-0 liveness 🤖). This is a pure fixture — no product content. Compose `AmbientField` from `src/lib/fx.tsx` into any hook scene to achieve equivalent results.

Hook window: 90 frames (fallback; composition has no timeline.ts). Recorded 2026-06-21.

| Gate | Measured value | Pass? |
|---|---|---|
| Frame-0 thumbnail | Full-frame streaming strips on dark field; no single focal point (this is a mechanics fixture, not a product hook) | N/A |
| Frame-0 liveness 🤖 | cells=11/16 rows=4; AmbientField distributes strips across all 4 grid rows from frame 0 | ✓ (threshold ≥2 rows,≥2 cells) |
| Text density | No text | N/A |
| Motion by frame 10 🤖 | delta=1.80 (frame0 vs frame9); strips scroll at deterministic speeds — strong motion from frame 0 | ✓ (threshold >0.1) |
| Frame-0 contrast 🤖 | stddev=16.40; bright mint strips on near-black field (#060a12) | ✓ (threshold >5.0) |
| Focal + alive | N/A (fixture) | — |
| Background activity 🤖 | mid=frame54 (60% of hook); active=6/16 separated=true; strips cover 6 of 16 cells, spread across all grid rows and columns | ✓ (threshold ≥2 separated, cell>5) |
| Hook pattern committed | N/A (fixture) | — |
| Promise by 2.5s | N/A (fixture) | — |
| Open loop closed | N/A (fixture) | — |
| Loop seam 🤖 | delta=4.52 (frame0 vs final); strips wrap continuously — consistent visual density at both ends | ✓ (threshold <60) |

HARD GATES: PASS
