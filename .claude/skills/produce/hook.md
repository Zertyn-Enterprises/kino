# Hook gate — frames 0–90 + loop seam

Run `scripts/hook.sh <CompId>` to produce the evidence this gate needs:
- `out/review/<CompId>/hook/frame0.png` — full-res frame 0 (thumbnail test)
- `out/review/<CompId>/hook/sheet/` — contact sheet, frames 0–90 at step 3
- `out/review/<CompId>/hook/final.png` — full-res final frame (loop-seam comparison)

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
| Text density | If text present in the hook: ≤6 words per on-screen moment |
| Motion by frame 10 | Visible change between tiles 0 and 3 in the contact sheet (frames 0 and 9 at step 3); not a freeze |
| Focal + alive | Exactly one dominant focal point in each key tile AND ≥1 active background/parallel layer (data stream, side panel, micro-update) — no tile fully static |
| Hook pattern committed | Treatment declares ONE pattern (mid-action demo / bold claim / dramatized pain / pattern interrupt / number); first 90 frames commit to it without mixing patterns |
| Promise by 2.5s | A specific outcome or number ("what this changes for ME") is legible on screen at or before frame 75 (tile ~25 at step 3). **Pain-first arcs (B, F):** a tension number — the problem's cost or scale (e.g. a wait-time counter, a monthly cost) — satisfies this gate; record what the number represents. **Short hooks:** if your hook scene ends before frame 75, assess at hook-end and record the actual end frame. |
| Open loop closed | The question the hook poses is answered by the reveal — not forgotten (satisfied = delight; dangling = clickbait) |
| Loop seam | `final.png` visually rhymes with `frame0.png` — compatible color field, similar energy level, or deliberate visual echo; autoplay restart is not jarring |

## 2. Example results

Recorded 2026-06-20. Command: `scripts/hook.sh <CompId>` (defaults: hookFrames=90, step=3).

### RelayLaunch

Hook scene: f0–f149 (10 beats @ 120 bpm). Sheet covers f0–f90 (6 of 10 hook beats — useful; full hook extends to f149).

| Gate | Measured value | Pass? |
|---|---|---|
| Frame-0 thumbnail | `git push` half-typed, cursor block lit; terminal is single focal point; high-contrast white on near-black (#0A0E0B) | ✓ |
| Text density | `git push` (2 words) | ✓ |
| Motion by frame 10 | Typing animation: tile 0 (f0) shows `git push █`; tile 3 (f9) shows more chars typed + cursor shift | ✓ |
| Focal + alive | Terminal = sole focal ✓; background is static dark with no active parallel layer — "airy" identity choice for Relay, but the background-activity sub-gate is absent | ⚠ borderline |
| Hook pattern committed | "Dramatized pain": typing → git output → "Queued — waiting for runner" (f52) → red elapsed timer (f75) | ✓ |
| Promise by 2.5s | Red elapsed timer `0:00 elapsed` appears at exactly f75; **tension number** (wait-time counter, arc B) — clock accelerates to 14:32 by f148; pain scale is legible by f90 (tile 30, element-1.png) | ✓ (arc B) |
| Open loop closed | Hook poses "how long will I wait?" → closed at reveal scene (f240+, "Push. It's already live.") | ✓ |
| Loop seam | final.png: dark, "Relay" wordmark, relay.dev CTA; f0: dark terminal, `git push` — same near-black palette, quiet energy on both ends | ✓ |

**Named defects:**
1. **f0/background static** — no active parallel layer behind the terminal in any hook frame. Terminal content is kinetic (text appears, cursor blinks); absence of a background layer is an intentional airy choice, but "Focal + alive" sub-gate (≥1 background layer) is not met.
2. **f75 timer reads 0:00** — a reviewer reading only the contact sheet might not realize the timer _starts_ here and accelerates off-screen; element-1.png (the 31st tile, f90) shows the clock in motion and confirms the number is real.
3. **element-1.png overflow page** — 31 tiles at 30-per-page puts f90 alone on a second page; not a script bug (ContactSheet layout), but looks like a nearly empty sheet. Expected; not actionable.

---

### GranipaLaunch

Hook scene: f0–f73 (5 beats @ 122 bpm = 2.46s). Sheet covers f0–f90 — the final ~16 frames (tiles 25–29 in element-0.png) are the first beat of the **indict** scene, not the hook.

| Gate | Measured value | Pass? |
|---|---|---|
| Frame-0 thumbnail | "what your mac tools see in a day:" in serif display; readable at thumbnail; menu bar composed at top; icons not yet visible — micro-settle only (opacity 0.85→1.0, 3px translate, f0–f8) | ⚠ borderline |
| Text density | "what your mac tools see in a day:" = **8 words** — exceeds ≤6 limit | ✗ |
| Motion by frame 10 | Subtle: line-settle animation (opacity + translateY) f0–f8; imperceptible at contact-sheet scale but measurable in source | ✓ (subtle) |
| Focal + alive | Serif question = dominant focal ✓; three icons stamp in as active secondary layer at f38, f46, f54 ✓ | ✓ |
| Hook pattern committed | Indictment / open question: "what your mac tools see in a day:" (open colon) sustained through f73 without mixing patterns | ✓ |
| Promise by 2.5s | Hook ends f73 (2.46s); no promise/number within the hook — Arc F defers the positive number ("$0", "$14/mo → $0") to the kicker scene. f75 is already the indict scene for this comp. | N/A (arc F) |
| Open loop closed | "what … in a day:" (surveillance open colon) → closed at reveal + sovereignty scenes ("your account. your rules.") | ✓ |
| Loop seam | final.png: Grañipa mark, dark blue (#0C0F17), "open source · on-device · free"; f0: dark charcoal (#0A0B0E), ominous question — compatible darkness; energy shift ominous→resolved is deliberate | ✓ |

**Named defects:**
1. **Text density** — 8 words fails ≤6 gate. The full question is copy-essential for arc F indictment; shortening it breaks the setup. This is a known tension between the gate and copy-first hooks where the question IS the action. No fix without creative change.
2. **Frame-0 mid-action** — icons don't stamp until f38; f0 reads as a composed text-only card. The micro-settle (3px, opacity) is insufficient to satisfy "motion already underway" strictly. Mitigation: the open colon is rhetorical motion; the gate's spirit (not a logo or empty state) is met.
3. **Sheet overlap into indict** — tiles 25–29 on element-0.png are from the indict scene (f75–f87). Useful as transition context but could mislead a reviewer into assessing non-hook frames against hook gates. When your hook is shorter than 90 frames, pass the actual hook length: `scripts/hook.sh GranipaLaunch 73`.
