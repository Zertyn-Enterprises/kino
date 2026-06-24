# Thumbnail — frame 0 as a scroll-stopping poster

On X (Twitter) the video's **first still** is the autoplay thumbnail.
Before the feed renders motion, that one frame must stop a scrolling thumb
cold. This is distinct from the hook (the first 2.5s of *motion*): the hook
earns 3 more seconds from a viewer who is already watching; the thumbnail
earns the *first* second from a viewer who is still scrolling.

## Why this deserves its own spec

The hook gates (gate 2: frame-0 contrast, gate 5: frame-0 liveness) reward
**pixel activity and contrast spread** — both of which skew toward busy
compositions. A uniform field of streaming strips passes both gates handily.
But a dense uniform frame makes no promise and stops no one. The scroll-stopper
is almost the opposite: **one dominant subject, everything else subordinate.**
This file gives the director the craft language to build both — a frame that
passes the machine gates AND makes a human stop.

---

## 1. Focal-subject hierarchy

**One dominant region. Not two. Not a balanced grid.**

The muted viewer's eye must land somewhere in < 0.5 s at feed size (~320 px
wide). If there is no clear answer to "where do I look first?", the frame
loses. Design frame 0 so one of these is unmistakably the hero:

- **A product interaction already mid-execution** — cursor blink on a result,
  command output streaming, a state change completing. The product IS the
  subject; the viewer reads competence without a caption.
- **Large display text** — ≥ 72 px display weight, ≤ 3 words in frame 0,
  filling 60–80 % of frame width. The claim IS the subject; everything else is
  atmosphere.
- **A desirable final state** (payoff flash-forward only) — the finished,
  lit, populated UI. The destination IS the subject; the viewer must want to
  arrive there.

Supporting elements (ambient strips, side panels, background data streams)
serve the hierarchy — they confirm the frame is alive, but they must not
**compete** for the eye. Rule: if a supporting element is the first thing your
eye lands on in the frame, it is misweighted. Reduce its luminance, scale, or
opacity until the focal subject wins.

**Luminance contrast to the rescue.** The fastest way to create hierarchy is
luminance differential: hero element at near-white or high-chroma accent;
everything else at ≤ 35 % of that luminance. A bright text label on a dim
AmbientField background is a well-composed thumbnail. A bright text label
competing with bright-strip AmbientField at full energy is not — reduce strip
opacity at frame 0 if needed.

---

## 2. Text legibility at feed scale

The feed renders at ~320 px wide (1× mobile). At this size:

| Type size (1080p canvas) | Feed equivalent | Readable? |
|---|---|---|
| ≥ 72 px display | ≥ 21 px | ✓ confident |
| 48–72 px large body | 14–21 px | ✓ — if weight ≥ 600 |
| 32–48 px body | 9–14 px | ⚠ — only in high contrast |
| < 32 px | < 9 px | ✗ invisible |

**Rules for text-in-thumbnail:**

1. **≤ 3 words** if the text is the focal subject. More words → each word
   gets less frame share → smaller at feed scale → unreadable.
2. **Weight ≥ 600** (semibold or heavier). Thin strokes vanish at feed scale.
   Light/hairline weights are great at full size; catastrophic at thumbnail.
3. **Contrast ≥ 7:1 against the immediate background** behind the text
   (not just the global frame average). WCAG AA is the floor; aim for AAA on
   the hero text.
4. **No gradient behind text** unless the lightest-to-darkest range of the
   gradient still passes ≥ 7:1 against the text color — spot-check the
   lowest-contrast zone.
5. **Letterforms must survive JPEG compression.** X recompresses uploaded
   video; fine serifs at small sizes blur to mush. At feed scale: prefer a
   grotesque with open counters, or a high-contrast slab. Delicate thin serif
   text that looks refined at 1080p can be unreadable as the thumbnail.

---

## 3. Feed contrast

The thumbnail competes in a feed full of other thumbnails. What stands out is
**contrast against the feed, not just internal contrast**:

- X's web feed has a near-white or near-black background depending on theme.
  A frame that is mid-gray in either direction disappears against both.
- **Deep darks and bright accents win.** The canonical tech-launch dark palette
  (#08–#10 bg, one electric accent) scans as high-contrast on both feed themes.
- **Near-white frames** (light bg videos) must pair with a very dark focal
  element — the contrast energy is the same physics, just inverted.
- **Single accent color.** The feed is visually noisy. One pure-accent focal
  element reads as intentional signal; two or three competing accent hues read
  as noise. Your theme's `accent` is the one allowed high-chroma element in
  the thumbnail.

**The silhouette test.** Desaturate the frame 0 still. Does the focal subject
read as a clear dark-on-light or light-on-dark silhouette? If the answer is
"kind of, in one spot" — the hierarchy is too weak. A strong thumbnail passes
the silhouette test decisively.

---

## 4. Mid-action, not paused

The thumbnail communicates genre. A static, composed, symmetric frame reads
as a title card — it signals "this video will be slow". A frame where something
is visibly mid-process signals "I arrived mid-story; it's already moving".

**Mid-action cues that read at feed scale:**

- Partial text output or command — some chars typed, cursor block visible
- Streaming data — first line resolved, more appearing
- Transition in progress — element settling, opacity still resolving
- Counter mid-value — not 0, not final; clearly running
- UI state mid-change — before/after visible simultaneously

**AmbientField as mid-action proof:** the ambient-motif layer (`AmbientField`,
`MoteField`, `GridPulse`, `EmberRise`) guarantees gate-5 liveness and gate-4
background-activity from frame 0. Its scrolling/floating/pulsing strips signal
"alive" at a visceral level. This is its primary thumbnail function — not
decoration but genre signal.

---

## 5. Stop-the-scroll checklist

Run this against `frame0.png` (`out/review/<CompId>/hook/frame0.png`) before
declaring the hook review done. Check at ~320px wide (feed scale) — resize
the file or zoom out your viewer.

```
[ ] One focal region wins: eye lands there in < 0.5 s at feed scale
[ ] Focal subject is mid-action (not logo, not title card, not empty state)
[ ] Supporting elements (ambient, panels, bg) do not compete with focal
[ ] If text in frame 0: ≤ 3 words, ≥ 72 px, weight ≥ 600, contrast ≥ 7:1
[ ] Silhouette test: desaturated frame reads as clear dark-vs-light shape
[ ] Single accent color; no competing high-chroma elements
[ ] Frame dark enough (or bright enough) to stand out in a mid-value feed
[ ] Gate-2 contrast (stddev > 5.0) AND gate-5 liveness ✓ in metrics.json
```

The last line is the machine floor. The seven lines above it are the craft
ceiling — they are not machine-asserted but they determine whether the frame
stops a real scroll.

**If the checklist reveals a weakness**, the usual fix is luminance redistribution
— not a structural scene rewrite. Reducing AmbientField opacity, increasing hero
text weight, or adding a scrim behind the focal element often closes the gap
without touching the hook's motion.

---

## 6. Archetype thumbnail notes

Each hook archetype has a thumbnail orientation. These are reminders, not
repeats of `hooks.md` — read that file for the full spec; use these as
checklist addenda when judging `frame0.png`.

| Archetype | Thumbnail risk | Fix |
|---|---|---|
| 1 Mid-action demo | Focal output too small/dim at feed scale | Crop tighter; push-in starts at frame 0 if needed |
| 2 Bold / contrast claim | Too many words visible (lines 2–3 already in frame) | Hold line 1 solo for ≥ 12 frames; lines 2–3 enter only after that |
| 3 Dramatized pain | Pain element too familiar — reads as "broken screenshot", not a hook | Add explicit kinetic cue (counter, blinking cursor) so "live" is obvious |
| 4 Pattern interrupt | Wrongness too subtle at 320px | Increase scale of impossible element; contrast against bg must be > 5:1 at feed size |
| 5 Number-counting | Number mid-count but looks like a static label | Ensure tabular-nums + AmbientField; add Shake on a frame ≤ 10 to signal motion |
| 6 Payoff flash-forward | Final state looks like a static screenshot | Confirm AmbientField is live at frame 0; UI must have at least one visible animation |
| 7 Open question | Text too long to read at feed scale | Limit to the first line at frame 0; rest enters after the hook's first beat |
| 8 Multi-layer live demo | Too busy — eye has no anchor | Increase focal layer luminance 20%; dim ≥2 supporting layers 30% |

---

## 7. Relationship to the hook gates

This doc is a companion to the machine-asserted gates in `hook.md §1`:

- **Gate 2 (frame-0 contrast, HARD):** machine floor (`stddev > 5.0` across
  4×4 grid). Passing it means contrast exists somewhere. The craft spec
  (§1–§3 above) means it exists *in the right place* — concentrated on the
  focal subject, not spread uniformly.
- **Gate 5 (frame-0 liveness, HARD advisory):** machine floor (cells with
  stddev > 10). Passing it means the frame has local pixel variance. The craft
  spec (§4 above) means that variance reads as *intentional mid-action motion*,
  not noise.
- **The focal signal (advisory):** `hook-metrics.mjs` exposes a `focal`
  advisory field (see `hook.md §1`) — a concentration statistic on the frame-0
  4×4 luminance grid that scores high for a dominant focal region and low for
  uniform busyness. Use it as a director-judgment input alongside this
  checklist: a high focal score + checklist PASS = poster-grade thumbnail;
  a low focal score with a passing gate-2/5 = machine-green but poster-weak.

The thumbnail checklist does NOT replace gate 2 and gate 5 — it extends them.
A frame can pass both machine gates and still fail the checklist if the
contrast energy is distributed uniformly (every cell the same) rather than
concentrated on a subject. That is the busyness trap; this doc exists to
prevent it.
