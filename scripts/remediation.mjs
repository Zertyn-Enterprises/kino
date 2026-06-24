#!/usr/bin/env node
// Deterministic failure→fix map for all ten ship gate identifiers.
// Maps every blocker string and advisory failure name emitted by the ten gates
// to a concrete { gate, symptom, severity, likelyCause, fix, docRef, inspect } entry.
//
// Usage (library):
//   import { buildRemediations } from './remediation.mjs';
//   const remediations = buildRemediations(computeShipVerdict({ ... }));
//
// Returns an ordered array — hard blockers first, then advisory failures.
// A ship-ready verdict (no blockers, no advisories) returns [].
// Unknown identifiers return a generic fallback entry (never throw).

// ── Per-gate doc references ────────────────────────────────────────────────────

const GATE_DOCS = {
  hook:            '.claude/skills/produce/hook.md',
  retention:       '.claude/skills/produce/retention.md',
  contrast:        '.claude/skills/produce/contrast.md',
  motion:          '.claude/skills/produce/quality.md',
  legibility:      '.claude/skills/produce/legibility.md',
  codeCraft:       '.claude/skills/produce/code-craft.md',
  musicsync:       '.claude/skills/produce/musicsync.md',
  payoff:          '.claude/skills/produce/payoff.md',
  remotionCorrect: '.claude/skills/produce/remotion-correct.md',
  distinct:        '.claude/skills/produce/distinct.md',
};

// ── Hard blocker → remediation map ────────────────────────────────────────────

const BLOCKER_MAP = {
  'hook gate not run': {
    gate: 'hook',
    symptom: 'hook gate not run — metrics.json absent',
    likelyCause: 'scripts/hook.sh was not run before ship-gate.sh, or the corpus render failed',
    fix: 'Run `scripts/hook.sh <CompId>` (or re-run `scripts/ship-gate.sh <CompId> <slug> ...`) to render hook frames and produce metrics.json',
    docRef: '.claude/skills/produce/hook.md §2. Captured metrics',
    inspect: 'out/review/<CompId>/hook/ — check that frame0.png, early.png, mid.png, final.png exist',
  },
  'retention gate not run': {
    gate: 'retention',
    symptom: 'retention gate not run — metrics.json absent',
    likelyCause: 'scripts/retention.sh was not run before ship-gate.sh, or the corpus render failed',
    fix: 'Run `scripts/retention.sh <CompId>` with the correct --step/--holds/--climax flags to produce metrics.json',
    docRef: '.claude/skills/produce/retention.md §1. Retention gates',
    inspect: 'out/review/<CompId>/retention/ — check that sample frames and metrics.json exist',
  },
  'contrast gate not run': {
    gate: 'contrast',
    symptom: 'contrast gate not run — metrics.json absent',
    likelyCause: 'scripts/contrast.sh was not run (palette flags missing from ship-gate.sh call)',
    fix: 'Re-run `scripts/ship-gate.sh <CompId> <slug> --bg=#.. --surface=#.. --text=#.. --textDim=#.. --accent=#..` with all required palette flags',
    docRef: '.claude/skills/produce/contrast.md §1. Contrast gates',
    inspect: 'out/review/<slug>/contrast/ — check that metrics.json exists',
  },
  'motion gate not run': {
    gate: 'motion',
    symptom: 'motion gate not run — metrics.json absent',
    likelyCause: 'scripts/motion.sh was not run before ship-gate.sh, or the corpus render failed',
    fix: 'Run `scripts/motion.sh <CompId>` to render sample frames and compute M1/M2/M3 metrics',
    docRef: '.claude/skills/produce/quality.md §G · Ship gate',
    inspect: 'out/review/<CompId>/motion/ — check that sample frames and metrics.json exist',
  },
  'legibility gate not run': {
    gate: 'legibility',
    symptom: 'legibility gate not run — metrics.json absent',
    likelyCause: 'scripts/legibility.sh was not run before ship-gate.sh, or the corpus render failed',
    fix: 'Run `scripts/legibility.sh <CompId>` to render sample frames and compute L1/L2/L3 metrics',
    docRef: '.claude/skills/produce/legibility.md §Gates',
    inspect: 'out/review/<CompId>/legibility/ — check that sample frames and metrics.json exist',
  },
  'codeCraft gate not run': {
    gate: 'codeCraft',
    symptom: 'code-craft gate not run — metrics.json absent',
    likelyCause: 'scripts/code-craft.sh was not run before ship-gate.sh',
    fix: 'Run `scripts/code-craft.sh <CompId> <slug>` (no render required) to produce metrics.json',
    docRef: '.claude/skills/produce/code-craft.md §Gates',
    inspect: 'out/review/<CompId>/code-craft/metrics.json',
  },
  'codeCraft hard gates failed': {
    gate: 'codeCraft',
    symptom: 'code-craft hard gates failed — hardGatesPass=false in metrics.json',
    likelyCause: 'An unexpected hard-gate failure in the code-craft analyzer (in normal runs hardGatesPass is true when files are found — check for scanner errors or an empty scan directory)',
    fix: 'Inspect `out/review/<CompId>/code-craft/metrics.json` for the cause. Re-run `scripts/code-craft.sh <CompId> <slug>` to regenerate. Address any listed C1/C2/C3 violations per code-craft.md §Gates',
    docRef: '.claude/skills/produce/code-craft.md §Gates',
    inspect: 'out/review/<CompId>/code-craft/metrics.json → hardGatesPass, gates[]',
  },
  'hook hard gates failed': {
    gate: 'hook',
    symptom: 'hook hard gates failed — H1 (motion by f10), H2 (frame-0 contrast), or H3 (loop seam) failed',
    likelyCause: 'Frame 0 is too static, opening lacks motion by frame 10, or loop seam creates a jarring cut',
    fix: 'Check metrics.json → gates[] for which gate failed. H1 (id=1): add motion between f0 and f10 (ambient particle enter or element animate in). H2 (id=2): increase frame-0 luminance stddev by adding visual structure to the opening frame. H3 (id=3): ease the loop seam or set lastFrame = firstFrame with a subtle transition to avoid delta > 60',
    docRef: '.claude/skills/produce/hook.md §1. Hook gates',
    inspect: 'out/review/<CompId>/hook/metrics.json → gates[0..2].pass, measured, threshold',
  },
  'retention hard gates failed': {
    gate: 'retention',
    symptom: 'retention hard gates failed — Gate 1 (Dead-air) detected a static run > 1 second',
    likelyCause: 'A section of the video has no frame-to-frame luminance change for more than 1 second',
    fix: 'Locate the offending window in metrics.json (startFrame/endFrame). Add AmbientField, particle drift, or micro-animation to that region. Use --holds=S:E to exclude intentional freeze frames',
    docRef: '.claude/skills/produce/retention.md §1. Retention gates',
    inspect: 'out/review/<CompId>/retention/metrics.json → gates[0].measured (longestStaticSec, startFrame, endFrame)',
  },
  'contrast hard gates failed': {
    gate: 'contrast',
    symptom: 'contrast hard gates failed — a HARD pair (text/textDim on bg/surface) below WCAG floor',
    likelyCause: 'Palette hex values produce insufficient WCAG contrast ratio (text <7:1, textDim <4.5:1)',
    fix: 'Check metrics.json → pairs[] for the failing role. Lighten the foreground or darken the background until the ratio meets its floor: text ≥7:1, textDim ≥4.5:1. Validate with `scripts/contrast.sh <slug> --bg=#.. --text=#.. ...`',
    docRef: '.claude/skills/produce/contrast.md §1. Contrast gates',
    inspect: 'out/review/<slug>/contrast/metrics.json → pairs[].role, pairs[].ratio, pairs[].floor for each failing hard pair',
  },
  'motion hard gates failed': {
    gate: 'motion',
    symptom: 'motion hard gates failed — M1 (Stutter/jank) detected a dropped frame inside an active motion run',
    likelyCause: 'An animation drops to near-zero delta mid-run, creating a visible stutter (non-eased step or dropped frame)',
    fix: 'Check metrics.json → stutterAtFrame. Inspect that frame window in the filmstrip. Replace step-function transitions with interpolate({..., easing: Easing.bezier(...)}) or spring({fps, ...}). Declare scene-transition frame numbers with --cuts=F to mask them from M1',
    docRef: '.claude/skills/produce/quality.md §D · Motion under the laws',
    inspect: 'out/review/<CompId>/motion/metrics.json → gates[0].measured.stutterAtFrame; filmstrip frames near stutter',
  },
  'legibility hard gates failed': {
    gate: 'legibility',
    symptom: 'legibility hard gates failed — L1 (Text-flash floor) detected text held < 0.4s before a cut',
    likelyCause: 'A text-rich frame is cut away in fewer than 12 frames (0.4s at 30 fps)',
    fix: 'Check metrics.json → firstViolationFrame and firstViolationDwellFrames. Extend the hold duration of that text block to ≥12 frames before the cut. Run `scripts/legibility.sh <CompId> --step=1` to pinpoint the exact frame',
    docRef: '.claude/skills/produce/legibility.md §Gates',
    inspect: 'out/review/<CompId>/legibility/metrics.json → gates[0].measured (flashViolations, firstViolationFrame, firstViolationDwellFrames)',
  },
  'musicsync hard gates failed': {
    gate: 'musicsync',
    symptom: 'musicsync hard gates failed — MS1 (Tempo lock) or MS2 (Downbeat lock) failed',
    likelyCause: 'timeline.bpm does not match the detected BPM within ±2%, or firstDownbeatSec phase offset exceeds 1 frame',
    fix: 'Run `node scripts/analyze-music.mjs <slug>` to re-detect BPM and firstBeatSec. Update timeline.ts bpm and firstDownbeatSec to match. MS1 accepts octave relations (×2 / ÷2). Check metrics.json → deltaPercent (MS1) and phaseDiffSec (MS2)',
    docRef: '.claude/skills/produce/musicsync.md §Gates',
    inspect: 'out/review/<CompId>/musicsync/metrics.json → gates[0].measured.deltaPercent (MS1), gates[1].measured.phaseDiffSec (MS2)',
  },
  'payoff hard gates failed': {
    gate: 'payoff',
    symptom: 'payoff hard gates failed — P1 (Payoff presence & dwell) or P2 (Final-frame legibility) failed',
    likelyCause: 'The closing window has no settled identity card held for ≥0.4s (P1), or the last frame is visually empty/flat (P2)',
    fix: 'P1: Add a brand/logo end-card in the closing window and hold it steady for ≥12 frames. Check metrics.json → maxDwellFrames. P2: Ensure the final frame has edge density >0.30 and luminance stddev >5.0 — add text or a graphic element to the last frame',
    docRef: '.claude/skills/produce/payoff.md §Gates',
    inspect: 'out/review/<CompId>/payoff/metrics.json → gates[0] (P1: holdRuns, maxDwellFrames), gates[1] (P2: edgeDensity, contrast)',
  },
  'remotionCorrect hard gates failed': {
    gate: 'remotionCorrect',
    symptom: 'remotionCorrect hard gates failed — R1 (nondeterminism) or R2 (raw media tags) violations found in source',
    likelyCause: 'Source files use Math.random()/Date.now()/new Date() (R1) or raw <img>/<video>/<audio> JSX tags (R2)',
    fix: "R1: Replace Math.random() with random(seed) from 'remotion'; replace Date.now()/new Date() with useCurrentFrame()-based time expressions. R2: Replace <img> with <Img>, <video> with <OffthreadVideo>, <audio> with <Audio> from 'remotion'",
    docRef: '.claude/skills/produce/remotion-correct.md §Gates',
    inspect: 'out/review/<CompId>/remotion-correct/metrics.json → violations[] (gate, file, line, snippet)',
  },
  'distinct hard gates failed': {
    gate: 'distinct',
    symptom: 'distinct hard gates failed — candidate differs from a prior registry entry on fewer than 4 of 9 identity axes',
    likelyCause: 'New video too visually/structurally similar to an existing registry entry (palette, arc, type, texture, bpm, transitions converge)',
    fix: 'Run `scripts/distinct.sh <slug>` to see which axes collide. Change ≥4 of: palette-bg, palette-accent, luminance class, typefaces, arc (A–E), rhythm+signature-moves, grain%, transitions, bpm band. Update the treatment and re-register in _registry.md',
    docRef: '.claude/skills/produce/distinct.md §Nine identity axes',
    inspect: 'out/review/<slug>/distinct/metrics.json → perPrior[].collidingAxes for each failing prior',
  },
};

// ── Advisory failure → remediation map ────────────────────────────────────────

const ADVISORY_MAP = {
  // Hook
  'Background activity': {
    gate: 'hook',
    symptom: 'Hook G4 (Background activity) — fewer than 2 spatially-separated active grid cells at mid-hook',
    likelyCause: 'Motion is confined to a single screen region with no parallel background or ambient layer',
    fix: "Add AmbientField (from src/lib/fx.tsx) or a secondary animated element (particles, ambient gradient drift, grid shimmer) that is active at mid-hook and spans ≥2 non-adjacent 4×4 grid cells. See AmbientCheck in src/smoke/ for the gate-PASS reference",
    docRef: '.claude/skills/produce/hook.md §1. Hook gates',
    inspect: 'out/review/<CompId>/hook/metrics.json → gates[3].measured (active, total, separated)',
  },
  'Frame-0 liveness': {
    gate: 'hook',
    symptom: 'Hook G5 (Frame-0 liveness) — content cells span only 1 row of the 4×4 grid on frame 0',
    likelyCause: 'Opening frame has a narrow text/logo band in one horizontal strip with a flat background',
    fix: 'Spread visual content vertically on frame 0: use a full-bleed background element, a 2-row-spanning graphic, or position title elements in different grid rows so that content cells span ≥2 of the 4 rows',
    docRef: '.claude/skills/produce/hook.md §1. Hook gates',
    inspect: 'out/review/<CompId>/hook/frame0.png; metrics.json → gates[4].measured (cells, rows)',
  },

  // Retention
  'Energy build-to-climax': {
    gate: 'retention',
    symptom: 'Retention G2 (Energy build-to-climax) — smoothed peak energy falls before the first-third boundary',
    likelyCause: 'Opening act front-loads visual intensity (transitions/reveals); narrative climax has lower pixel delta',
    fix: 'Pass --climax=<narrativeClimaxFrame> to retention.sh to gate against the actual narrative climax frame rather than the first-third heuristic. Alternatively, reduce opening-act cut density and build energy toward the true climax',
    docRef: '.claude/skills/produce/retention.md §1. Retention gates',
    inspect: 'out/review/<CompId>/retention/metrics.json → gates[1].measured (peakFrame, boundaryFrame, rawPeakFrame, peakAfterBoundary)',
  },
  'Re-hook cadence': {
    gate: 'retention',
    symptom: 'Retention G3 (Re-hook cadence) — a body stretch exceeds 8s without an energy spike ≥2.0',
    likelyCause: 'Mid-video section has sustained low-energy animation with no punchy scene change or motion event',
    fix: 'Add a mid-video re-hook punch in the flagged window: a scene cut, camera move, bold typography reveal, or any motion event with luminance delta ≥2.0. Check longestFlatStartFrame to locate the dead zone',
    docRef: '.claude/skills/produce/retention.md §1. Retention gates',
    inspect: 'out/review/<CompId>/retention/metrics.json → gates[2].measured (longestFlatSec, longestFlatStartFrame)',
  },
  'Full-video loop seam': {
    gate: 'retention',
    symptom: 'Retention G4 (Full-video loop seam) — loopable=false; frame 0 vs final frame delta ≥60.0',
    likelyCause: 'Video ends on a visually distinct frame (CTA card, title card) that does not match the opening frame — the video does not loop cleanly',
    fix: 'Opportunity flag, not a hard blocker. If looping is desired: ease the final frame back toward the opening palette (fade to black then up, or match bg color at start/end). If a CTA card is intentional: record a named justification noting the deliberate non-loop ending. Check loopSeamDelta in metrics.json',
    docRef: '.claude/skills/produce/retention.md §1. Retention gates',
    inspect: 'out/review/<CompId>/retention/metrics.json → gates[3].measured (loopSeamDelta, loopable, frame0Idx, finalFrameIdx)',
  },
  'Ending hold / no-limp-tail': {
    gate: 'retention',
    symptom: 'Retention G5 (Ending hold / no-limp-tail) — endingMode=limp; final window has mid-level energy with no held card and no final accent',
    likelyCause: 'Video fades out or trails off with monotone energy decay — no stable held end-state and no final punch',
    fix: 'Add a clearly resolved ending: either (a) hold a settled brand/CTA card in the final 1.5s so endingMeanEnergy drops below 1.5 (mode=held), or (b) land a deliberate final accent punch (scene flash, logo slam, typography reveal) with delta >2.0 (mode=accented). Check windowStartFrame to locate the ending window',
    docRef: '.claude/skills/produce/retention.md §1. Retention gates',
    inspect: 'out/review/<CompId>/retention/metrics.json → gates[4].measured (endingMode, endingMeanEnergy, endingMaxEnergy, windowStartFrame)',
  },

  // Contrast
  'accent-on-bg': {
    gate: 'contrast',
    symptom: 'Contrast advisory — accent-on-bg ratio below 4.5:1',
    likelyCause: 'Primary accent color has insufficient contrast against the background for graphical/decorative elements',
    fix: 'Adjust the accent hex to increase the WCAG ratio vs bg to ≥4.5:1. Verify with `scripts/contrast.sh <slug> --bg=#.. --accent=#..`. If the accent is used purely graphically and the ratio is intentional, record a named justification in the review notes',
    docRef: '.claude/skills/produce/contrast.md §1. Contrast gates',
    inspect: "out/review/<slug>/contrast/metrics.json → pairs where role === 'accent-on-bg' (ratio, floor)",
  },
  'accentAlt-on-bg': {
    gate: 'contrast',
    symptom: 'Contrast advisory — accentAlt-on-bg ratio below 4.5:1',
    likelyCause: 'Secondary accent color (accentAlt) has insufficient contrast against the background',
    fix: 'Adjust the accentAlt hex to increase the WCAG ratio vs bg to ≥4.5:1. Verify with `scripts/contrast.sh <slug> --bg=#.. --accentAlt=#..`. Record a justification if the lower ratio is intentional for graphical use',
    docRef: '.claude/skills/produce/contrast.md §1. Contrast gates',
    inspect: "out/review/<slug>/contrast/metrics.json → pairs where role === 'accentAlt-on-bg' (ratio, floor)",
  },

  // Motion
  'Easing presence': {
    gate: 'motion',
    symptom: 'Motion M2 (Easing presence) — peak/mean delta ratio below 1.5, indicating robotic linear animation',
    likelyCause: 'Animations use linear easing or a flat energy plateau with no acceleration/deceleration arc',
    fix: 'Replace linear transitions with eased interpolate({..., easing: Easing.bezier(x1,y1,x2,y2)}) calls or spring({fps, config: {mass, damping, stiffness}}). Ensure at least one high-energy peak (scene cut, element enter) keeps the peak/mean ratio above 1.5',
    docRef: '.claude/skills/produce/quality.md §D · Motion under the laws',
    inspect: 'out/review/<CompId>/motion/metrics.json → gates[1].measured (peakDelta, meanDelta, ratio)',
  },
  'Sustained life': {
    gate: 'motion',
    symptom: 'Motion M3 (Sustained life) — windowed-min delta in the body below 0.02, indicating a dead background',
    likelyCause: 'Body section has a window with no background animation; background is fully static',
    fix: "Add AmbientField (src/lib/fx.tsx) or a continuous background animation (particle drift, gradient shift, grain motion) that keeps the windowed-min above 0.02 throughout the body. Check minWindowStartPair to locate the dead zone",
    docRef: '.claude/skills/produce/quality.md §D · Motion under the laws',
    inspect: 'out/review/<CompId>/motion/metrics.json → gates[2].measured (minWindowMean, minWindowStartPair)',
  },

  // Legibility
  'Reading-budget share': {
    gate: 'legibility',
    symptom: 'Legibility L2 (Reading-budget share) — detected held-text time exceeds 60% of runtime',
    likelyCause: 'Animated content pauses (typing, icon settle) are classified as held-text by the edge-density+delta detector, inflating the share metric',
    fix: 'If the share reflects a true wall-of-text: reduce held-text density by adding motion or cuts in text-heavy sections. If the classification is a known false positive (animation pauses), record a named justification noting that it is not a reading-budget violation',
    docRef: '.claude/skills/produce/legibility.md §Gates',
    inspect: 'out/review/<CompId>/legibility/metrics.json → gates[1].measured (share, totalHeldFrames, totalFrames)',
  },
  'Detail stability': {
    gate: 'legibility',
    symptom: 'Legibility L3 (Detail stability) — edge density coefficient of variation during text holds above 0.40',
    likelyCause: 'Text or graphic elements animate, blur, or shift during their hold intervals',
    fix: 'Ensure text elements are fully settled before the hold interval begins. Use a spring with low stiffness to reach the stable position before the read window. Avoid animating stroke, blur, or opacity of text during held reading phases',
    docRef: '.claude/skills/produce/legibility.md §Gates',
    inspect: 'out/review/<CompId>/legibility/metrics.json → gates[2].measured (meanCv, intervals)',
  },

  // Code-craft
  'C1-emoji': {
    gate: 'codeCraft',
    symptom: 'Code-craft C1-emoji — emoji codepoints found in string literals in scene/theme source files',
    likelyCause: 'On-screen copy uses emoji as visual shorthand (a common AI-generated shortcut)',
    fix: 'Remove emoji from string literals in scene files; replace with brand-appropriate SVG icons or typographic Unicode symbols. If the emoji is intentional UGC mock (e.g. a social-proof tweet), add a named justification in the review notes',
    docRef: '.claude/skills/produce/code-craft.md §Gates',
    inspect: "out/review/<CompId>/code-craft/metrics.json → violations where gate === 'C1-emoji' (file, line, snippet)",
  },
  'C1-font': {
    gate: 'codeCraft',
    symptom: 'Code-craft C1-font — system UI font (system-ui, sans-serif, Roboto, etc.) as primary fontFamily',
    likelyCause: 'Scene or theme uses a generic/system font stack instead of a bespoke brand typeface',
    fix: 'Replace primary fontFamily with a bespoke typeface loaded from src/lib/fonts.ts or a self-hosted/Google font. If system-ui is intentional (e.g. mock browser UI), record a named justification',
    docRef: '.claude/skills/produce/code-craft.md §Gates',
    inspect: "out/review/<CompId>/code-craft/metrics.json → violations where gate === 'C1-font' (file, line, snippet)",
  },
  'C2-hex': {
    gate: 'codeCraft',
    symptom: 'Code-craft C2-hex — raw hex color literals in scene files (outside theme.ts)',
    likelyCause: 'Scene components hardcode hex values instead of referencing palette tokens from theme.ts',
    fix: 'Move all hex color literals to src/videos/<slug>/theme.ts and reference them as theme.bg, theme.accent, etc. in scene components. Exception: mock-UI elements (terminal chrome, browser chrome) may use inline hex with a named justification',
    docRef: '.claude/skills/produce/code-craft.md §Gates',
    inspect: "out/review/<CompId>/code-craft/metrics.json → violations where gate === 'C2-hex' (file, line, snippet)",
  },
  'C3-easing': {
    gate: 'codeCraft',
    symptom: 'Code-craft C3-easing — interpolate() calls without easing: key, or explicit Easing.linear usage',
    likelyCause: 'Animation uses default linear interpolation instead of a crafted easing curve',
    fix: 'Add easing: Easing.bezier(x1, y1, x2, y2) to every interpolate() call. Replace Easing.linear with a crafted curve. For named CLAMP constants spread into interpolate(), ensure the constant or the call includes easing',
    docRef: '.claude/skills/produce/code-craft.md §Gates',
    inspect: "out/review/<CompId>/code-craft/metrics.json → violations where gate === 'C3-easing' (file, line, snippet)",
  },

  // Music sync
  'Music sync unverified': {
    gate: 'musicsync',
    symptom: 'Music-sync gate: UNVERIFIED — music intent declared but analysis not run',
    likelyCause: "Main.tsx imports MusicBed or references a music asset, but no .analysis.json is present in public/<slug>/",
    fix: "Run `node scripts/analyze-music.mjs <slug>` to detect BPM, firstBeatSec, and drops. Commit the .analysis.json, then re-run `scripts/musicsync.sh <CompId> <slug>` to verify MS1/MS2 alignment",
    docRef: '.claude/skills/produce/musicsync.md §Graceful SKIP mode',
    inspect: 'out/review/<CompId>/musicsync/metrics.json → verdict, musicIntent, analysisPresent',
  },
  'Climax on drop': {
    gate: 'musicsync',
    symptom: 'Music-sync MS3 (Climax on drop) — declared climax frame is more than 3 frames from the nearest detected drop',
    likelyCause: 'The climax scene cut does not land on the nearest music energy drop/peak',
    fix: 'Run `node scripts/analyze-music.mjs <slug>` to see detected drops. Adjust the climax scene cut in timeline.ts to land within ±3 frames of the nearest drop.t × fps. Or pass --climax=<frame> matching a detected drop',
    docRef: '.claude/skills/produce/musicsync.md §Gates',
    inspect: 'out/review/<CompId>/musicsync/metrics.json → gates[2].measured (climaxFrame, nearestDropFrame, distFrames)',
  },
  'Cut-on-beat coverage': {
    gate: 'musicsync',
    symptom: 'Music-sync MS4 (Cut-on-beat coverage) — fewer than 90% of scene cuts land within 1 frame of the beat grid',
    likelyCause: 'Scene-boundary cut frames in timeline.ts do not align with the music beat grid',
    fix: 'Run `node scripts/analyze-music.mjs <slug>` to get the detected beat grid. Adjust scene cut frames in timeline.ts to land on Math.round((firstBeatSec + n × beatPeriodSec) × fps). Check metrics.json → cuts[] for which cuts are off-beat and by how many frames',
    docRef: '.claude/skills/produce/musicsync.md §Gates',
    inspect: 'out/review/<CompId>/musicsync/metrics.json → gates[3].measured.cuts[] (frame, distFrames, onBeat per cut)',
  },

  // Payoff
  'Closing stability': {
    gate: 'payoff',
    symptom: 'Payoff P3 (Closing stability) — last 2 sample pairs before end are not held steady (delta ≥0.5)',
    likelyCause: 'Video ends mid-animation or with a transition; final frames are not a fully settled state',
    fix: 'Extend the settled end-card hold by ≥2 more step-intervals (at step=3: ≥6 frames). Ensure the animation reaches its final state at least 2 step-intervals before the last frame. Check maxTailDelta to see the worst-pair delta',
    docRef: '.claude/skills/produce/payoff.md §Gates',
    inspect: 'out/review/<CompId>/payoff/metrics.json → gates[2].measured (tailPairsChecked, maxTailDelta, stable)',
  },

  // Remotion correct
  'R3-interpolate-clamp': {
    gate: 'remotionCorrect',
    symptom: 'Remotion R3 (interpolate-clamp) — interpolate() calls without extrapolateLeft/Right clamp options',
    likelyCause: 'Animations may overshoot their value range when the frame falls outside the input domain',
    fix: "Add { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } to each interpolate() call, or define a shared CLAMP constant and spread it: interpolate(f, [a,b], [c,d], { ...CLAMP, easing: ... })",
    docRef: '.claude/skills/produce/remotion-correct.md §Gates',
    inspect: "out/review/<CompId>/remotion-correct/metrics.json → violations where gate === 'R3-interpolate-clamp'",
  },
  'R4-spring-fps': {
    gate: 'remotionCorrect',
    symptom: 'Remotion R4 (spring-fps) — spring() calls without an fps parameter',
    likelyCause: 'spring() without fps uses an incorrect default velocity that mismatches the video fps at render time',
    fix: 'Pass fps to every spring() call: spring({ frame, fps, config: { ... } }). Obtain fps from useVideoConfig() or pass it as a prop from Main.tsx',
    docRef: '.claude/skills/produce/remotion-correct.md §Gates',
    inspect: "out/review/<CompId>/remotion-correct/metrics.json → violations where gate === 'R4-spring-fps'",
  },
  'R5-wallclock': {
    gate: 'remotionCorrect',
    symptom: 'Remotion R5 (wallclock) — setTimeout/setInterval/requestAnimationFrame/useEffect/useState found in scene code',
    likelyCause: 'Scene uses time-based React hooks or browser timers instead of frame-driven animation',
    fix: 'Replace useEffect/useState with useCurrentFrame() + interpolate()/spring() for all animation state. Remove setTimeout/setInterval/rAF — all state must derive deterministically from the frame number',
    docRef: '.claude/skills/produce/remotion-correct.md §Gates',
    inspect: "out/review/<CompId>/remotion-correct/metrics.json → violations where gate === 'R5-wallclock'",
  },
};

// ── Distinct drift advisory entries (matched by prefix) ───────────────────────
// distinct advisory names: "Advisory: bg-luminance drift (...)", "Advisory: mono-font drift (...)",
// "Advisory: accent-hue drift (...)". These are dynamic — matched by startsWith.

const DISTINCT_DRIFT_MAP = [
  {
    prefix: 'Advisory: bg-luminance drift',
    gate: 'distinct',
    symptom: 'Distinct advisory — bg-luminance drift: multiple registry entries share the dark/tonal luminance family',
    likelyCause: 'The dark/tonal bg luminance class is the default-drift direction; the library is converging on a single look',
    fix: 'Choose a light, vivid, or otherwise non-dark luminance class for the new video. Change the luminance field in the treatment (e.g. "light" or "tonal" with a genuinely different, high-chroma palette). Re-run `scripts/distinct.sh <slug>` to confirm the axis diverges',
    docRef: '.claude/skills/produce/distinct.md §Advisory drift warnings',
    inspect: 'out/review/<slug>/distinct/metrics.json → perPrior[].differingAxes (check for missing luminance axis)',
  },
  {
    prefix: 'Advisory: mono-font drift',
    gate: 'distinct',
    symptom: 'Distinct advisory — mono-font drift: multiple registry entries use JetBrains Mono',
    likelyCause: 'JetBrains Mono is the default monospace and keeps being chosen for terminal/code content',
    fix: 'Choose a different monospace typeface (Fira Code, Cascadia Code, IBM Plex Mono, or drop the mono entirely). Update the type field in the treatment to a unique font stack',
    docRef: '.claude/skills/produce/distinct.md §Advisory drift warnings',
    inspect: 'out/review/<slug>/distinct/metrics.json → perPrior[].differingAxes (check for missing type axis)',
  },
  {
    prefix: 'Advisory: accent-hue drift',
    gate: 'distinct',
    symptom: 'Distinct advisory — accent-hue drift: multiple registry entries have a blue/teal accent (151°–240° hue)',
    likelyCause: 'Blue/teal is the default-drift accent direction — confident, safe, and over-used',
    fix: 'Choose an accent hue outside the blue-teal band: warm oranges (0°–30°), electric greens (80°–150°), magentas (280°–340°), or high-chroma yellows. Update palette.accent in the treatment and re-run `scripts/distinct.sh <slug>`',
    docRef: '.claude/skills/produce/distinct.md §Advisory drift warnings',
    inspect: 'out/review/<slug>/distinct/metrics.json → perPrior[].differingAxes (check for missing palette-accent axis)',
  },
];

// ── Generic fallback per gate ─────────────────────────────────────────────────

function genericFallback(identifier, gateName) {
  const doc = GATE_DOCS[gateName] ?? '.claude/skills/produce/ship.md §Per-gate semantics';
  return {
    gate: gateName,
    symptom: `${gateName} — unknown failure identifier: ${identifier}`,
    likelyCause: 'Unrecognized gate sub-identifier; check the gate\'s metrics.json for details',
    fix: `Inspect the gate's metrics.json artifacts and compare against the gate rubric in ${doc}`,
    docRef: doc,
    inspect: `out/review/<CompId>/${gateName}/metrics.json`,
  };
}

// ── Gate name extractor for blocker strings ───────────────────────────────────

const BLOCKER_GATE_RE = /^(.+?) (gate not run|hard gates failed)$/;

function gateFromBlocker(blocker) {
  const m = blocker.match(BLOCKER_GATE_RE);
  return m ? m[1] : 'unknown';
}

// ── Advisory identifier → gate name ──────────────────────────────────────────
// Derive the gate name from the advisory identifier using static lookup first,
// then the distinct-drift prefix table, then the gate's advisoryFailures context.

function gateForAdvisory(identifier) {
  if (ADVISORY_MAP[identifier]) return ADVISORY_MAP[identifier].gate;
  for (const entry of DISTINCT_DRIFT_MAP) {
    if (identifier.startsWith(entry.prefix)) return entry.gate;
  }
  return 'unknown';
}

// ── Build advisory failure entries from all gates ─────────────────────────────

function advisoryEntries(verdict) {
  const entries = [];

  for (const [gateName, gate] of Object.entries(verdict.gates)) {
    if (!gate.advisoryFailures || gate.advisoryFailures.length === 0) continue;
    for (const id of gate.advisoryFailures) {
      let template = ADVISORY_MAP[id];

      if (!template) {
        // Try distinct drift prefix match
        const driftMatch = DISTINCT_DRIFT_MAP.find(d => id.startsWith(d.prefix));
        if (driftMatch) {
          template = driftMatch;
        }
      }

      if (template) {
        entries.push({
          gate: template.gate,
          symptom: template.symptom,
          severity: 'advisory',
          likelyCause: template.likelyCause,
          fix: template.fix,
          docRef: template.docRef,
          inspect: template.inspect,
        });
      } else {
        entries.push({
          ...genericFallback(id, gateName),
          severity: 'advisory',
        });
      }
    }
  }

  return entries;
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Build remediation entries for every failure in the ship verdict.
 *
 * @param {{ shipReady: boolean, gates: object, blockers: string[] }} verdict
 *   The return value of computeShipVerdict().
 * @returns {Array<{ gate, symptom, severity, likelyCause, fix, docRef, inspect }>}
 *   Ordered: hard blockers first, then advisory failures.
 *   Returns [] when shipReady is true and no advisories exist.
 *   Unknown identifiers produce a generic entry (never throw).
 */
export function buildRemediations(verdict) {
  if (verdict.shipReady && !Object.values(verdict.gates).some(g => g.advisoryFailures?.length > 0)) {
    return [];
  }

  const blockerEntries = (verdict.blockers ?? []).map(blocker => {
    const template = BLOCKER_MAP[blocker];
    if (template) {
      return { ...template, severity: 'blocker' };
    }
    // Generic fallback for unrecognized blocker string
    const gateName = gateFromBlocker(blocker);
    return { ...genericFallback(blocker, gateName), severity: 'blocker' };
  });

  const advisories = advisoryEntries(verdict);

  return [...blockerEntries, ...advisories];
}
