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
| Promise by 2.5s | A specific outcome or number ("what this changes for ME") is legible on screen at or before frame 75 (tile ~25 at step 3) |
| Open loop closed | The question the hook poses is answered by the reveal — not forgotten (satisfied = delight; dangling = clickbait) |
| Loop seam | `final.png` visually rhymes with `frame0.png` — compatible color field, similar energy level, or deliberate visual echo; autoplay restart is not jarring |
