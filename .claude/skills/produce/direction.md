# Direction — hooks, arcs, emotion, identity

How to decide WHAT the video is before any code exists. Output of this file's
procedures = the treatment.

## 1. The viewer's reality (design for this, always)

- They are scrolling a feed, **muted**, thumb already moving. You have ~1.5s
  of peripheral attention to earn 3 more seconds, and 3s to earn the rest.
- The video must work **silent** (text + image carry meaning; audio rewards
  attention, never carries it) and **loop** (X/Twitter autoplays on repeat —
  a final frame that visually rhymes with the first makes the loop graceful
  instead of jarring).
- Frame 1 is also the thumbnail. It must be readable as a static image:
  high contrast, a focal point, ideally mid-action (motion already underway).
- They don't care about the product. They care about themselves. Every beat
  answers "what does this change for ME" — features are evidence, not content.

## 2. Hooks (the first 75 frames)

Never open with: logo on black, slow fade-in, "Introducing…" before showing
anything, or an establishing shot of a full UI (nothing to focus on).

Hook patterns — pick ONE, commit hard:

- **Mid-action demo**: the product already doing its most impressive thing,
  cropped tight on the exact pixels that matter. Curiosity: "wait, what did
  that just do?"
- **Bold claim**: 3–6 words of typography that pick a fight with the status
  quo ("Your CI is lying to you."). The claim must be earned by the video.
- **The pain, dramatized**: 1–2s of the ugly familiar thing (error wall,
  23 browser tabs, a spinner) — recognition is the strongest silent emotion —
  then the interrupt.
- **Pattern interrupt**: something visually wrong-on-purpose (UI element
  behaving impossibly, type breaking physics) that demands explanation.
- **A number**: a metric counting fast toward something absurd ("0 → 14,000
  deploys"), context delivered at the peak.

Hook rules: motion within the first 10 frames; one focal point; if there is
text, ≤6 words; the hook's question must be ANSWERED by the reveal (open
loops you close = satisfaction; open loops you forget = clickbait).

### Hook rules v2 (retention data + 2025-2026 X-viral research)

From analysis of top viral X product launches (high-engagement demos and "best of" launch threads):

- **Provocative contrast claim + instant visual "magic" payoff in first 1-3s** (core of unmissable hooks): Bold "world's first", contrarian ("AI is making X dumber/worse" vs "should make geniuses/faster"), or "AI now does Y better than human". Cut immediately to live mid-action demo of the product doing impressive things. Must work **muted** (big clear text + strong visuals tell the full story in 3s); audio rewards if on (distinctive tap/whoosh/impact in first 0.5s).
- **Mid-action multi-layer demo with constant background elements**: Product already "on" and doing the magic (transcription streaming, names resolving, data flowing, agents/tools updating in parallel). Background layers always active (subtle parallax, micro-updates, side panels ticking, data streams) so the frame never feels static or slow — things happening everywhere to fight swipe on X feed. Frame 1 must be high-contrast, in-focus, mid-action (motion underway).
- **Payoff flash-forward or pattern interrupt**: 0.3–0.5s flash of finished result at frame 0, hard cut back (strongest for retention). Or visual "wrong-on-purpose" that demands explanation.
- **Promise by 2.5s, with a number or specific outcome**: One measurable "what this changes for ME" (e.g. "3 bullets → perfect notes", "no bot, live on your Mac, using the AI you already pay for").
- **Re-hook every 5–8s + accelerating pace**: New layer, angle, punch-in, on-screen stat, or action card. Fast cuts, overlapping parallel processes. No drift — front-load hero workflow by second 6 or deliberately withhold for agitation.
- **Macro shape for ~30-40s X hero (with thread shorts)**: hook 0–3s (contrast claim + live multi-layer demo) · escalation 3s–80% (orchestrated velocity with constant micro-updates) · payoff in last 15–25% · CTA/loop final 3–5s. Short 10-70s clips per thread for algorithm (one hook/pain/demo/cred per clip). Works silent first; loopable final frame that visually rhymes with frame 1.

**Viral anti-patterns (what kills engagement):** Static screen recordings or stills with camera moves, long holds (>1-2s), no background activity or parallel elements, logo fades, "introducing" before showing magic, flat compositions, weak first 3s.

### Hook rules v3 (X virality + our system)

- The hook is the #1 thing. It must be unmissable — cannot pass as background noise in a muted feed. Always research current top viral X launches before writing treatment; steal the contrast + instant live demo + parallel background motion pattern.
- Motion from frame 1; one dominant focal point but rich supporting layers (background always has things happening).
- ≤6 words text in hook; the hook's question must be answered by the reveal.

## 3. Identity derivation (do this BEFORE the treatment)

This is the anti-template procedure. Write the intermediate steps into the
treatment — they are the justification for every aesthetic choice.

1. **Extract 3–5 metaphors from the product's actual domain.** What does it
   physically DO? (deploy tool → push, propagate, ripple outward, go live;
   AI search → focus, surface, illuminate, converge; finance API → precision,
   ledger lines, increments, settle). Nouns and verbs, not adjectives.
2. **Derive 2–3 signature moves** — motion behaviors that embody those
   metaphors. (propagate → reveals that ripple outward from a point of
   change; precision → movements that snap to a visible grid, counters that
   tick in exact increments; illuminate → a light source that precedes every
   reveal.) A signature move is a BEHAVIOR, not an effect: it can recur at
   hook, transitions, and climax in different sizes. **Signature moves are
   bespoke code** — library math (springs, noise, timeline), never library
   components. For X-viral: moves must enable **constant parallel live updates and background activity** (e.g. streaming text + resolving elements + tool panels ticking simultaneously).
3. **Pick the rhythm signature** — the pacing fingerprint, stated in one
   sentence. ("Slow build, one explosive moment, long calm resolve" /
   "relentless 2s cuts, then a dead stop" / "waves: three accelerations,
   each bigger".) Rhythm is more recognizable than color; two videos with
   the same rhythm feel like the same template even with opposite palettes.
   **X-viral default: "orchestrated velocity with constant micro-updates and background elements"** — fast, parallel processes always happening, no static frames, re-hook every 5-8s with new layer/action. (See viral research in references.md: Tempo parallel agents, Koji live sketching + interaction.)
4. **Pick positions on every axis** in `craft.md` §1 (light/dark, airy/dense,
   etc.) — derived from the audience and the metaphors, not from habit.
   Bias "kinetic/viral" energy + dense purposeful layers with active background for feed engagement.
5. **Diff against `src/videos/_registry.md`.** Must differ on ≥4 axes from
   every prior video. If it doesn't, return to step 1 with the constraint
   "not that".

Honesty bound: this genre (Apple/Linear/Vercel launch film) is itself a
recognizable style — distinctness is WITHIN-genre. Identity comes from 2–3
signature moves executed perfectly, not ten executed loosely. When in doubt,
professional beats novel. For maximum X virality, research current top launch videos before every treatment (hooks + live parallel demos + constant background motion are the repeatable winners).

## 4. Arc menu (pick one shape; never default to the same one twice)

Acts with typical share of runtime. Emotions are the design target — name
them per act in the treatment.

- **A · Demo-first cold open** (confidence): impressive use 15% → what/who
  it's for 15% → proof montage 45% → differentiator climax 15% → CTA 10%.
  For products whose demo IS the argument. Emotion: curiosity → recognition
  → conviction.
- **B · Problem-first** (catharsis): dramatized pain 20% → turn ("there's
  another way") 10% → reveal 15% → proof 35% → climax 10% → CTA 10%.
  For products replacing a hated workflow. Emotion: recognition → relief →
  desire. The pain must be SPECIFIC (the actual error text, the actual mess).
- **C · Manifesto** (belonging): claim 15% → escalating claims woven with
  flash-proof 50% → product as the conclusion 20% → CTA 15%. Type-led; for
  category creation or rebrands. Emotion: provocation → agreement → identity.
  Hardest to earn; needs genuinely sharp copy.
- **D · Transformation** (before/after): the before, honest and drab 25% →
  the crossing (signature move at full size) 10% → the after, same task
  reshot bright and fast 40% → proof beats 15% → CTA 10%. Emotion: weariness
  → lift. The before/after must be the SAME task, visibly.
- **E · Feature symphony** (abundance): micro-hook 10% → 4–7 feature beats,
  each claim+proof in 3–6s, accelerating 70% → full-picture pullback 10% →
  CTA 10%. For big releases/changelogs. Emotion: mounting "it does THAT
  too?". Needs the strictest beat discipline or it mushes.

- **F · Indictment** (betrayal → sanctuary): name what the incumbent tools
  quietly do to the viewer 25% (one accusation per beat, factual, each with
  its "e.g. competitor" receipt) → the gut punch ("you signed up for X,
  you handed over everything") 8% → founder reveal in first person ("so I
  built…") 12% → proof montage 25% → the architecture moment (the claim
  that ends the argument, shown) 15% → kicker (price/license twist) 8% →
  CTA 7%. Type-led; emotion: creeping dread → betrayal → relief → trust →
  delight. Keep accusations FACTUAL and verifiable — name competitors only
  for things that are publicly true of them.

CTA act, all arcs: calm down, music resolves, logo + product name + one line
+ URL. Hold ≥3s. End ON the beat, ON the last frame — never trail.

## 4.5 Copy-first production (when launch copy exists)

If the founder wrote launch copy, the copy IS the script. Do not invent a
parallel narrative: distill each copy line to a ≤7-word on-screen beat
(keeping the founder's voice — first person stays first person), map lines
to music beats BEFORE designing visuals, then build each scene as the
PERFORMANCE of its line (the visual proves the sentence). Reorder only with
reason; cut darlings, never the receipts (specifics, prices, names).

## 5. Copy rules (words on screen)

- One message per video; one idea per scene; ≤7 words per text moment
  (hero claims ≤6).
- Verbs over adjectives; specifics over superlatives ("merges in 40ms" beats
  "blazingly fast"). Numbers are protagonists — animate them counting.
- Never say "simple", "powerful", "seamless", "supercharge", "revolutionize",
  or "10x" — show the thing that would make a viewer say it.
- Reading time: hold text ≥ `0.3s × word_count + 0.6s` AFTER its reveal
  finishes, longer if the viewer is also parsing UI.
- Sentence case. No exclamation marks. The product name appears exactly
  twice: reveal and CTA.

## 6. Working with product UI

- Real (or realistic bespoke-mock) UI only: plausible dense data, real-looking
  names/values, no Lorem, no "John Doe", no empty states unless the story is
  empty states. The audience lives in these tools; fakeness reads instantly.
- Never show a whole screen and expect the viewer to find the point. Crop,
  zoom, or mask to the exact region; the camera (pan/zoom between focus
  points) and a cursor are your protagonist and narrator.
- UI interactions on screen get physical responses (press states, cursor
  arrives BEFORE the click, results follow with causal timing — 100–250ms
  feel) — see `craft.md` §2.
- Screenshots/recordings at 2× resolution so push-ins stay sharp.
