#!/usr/bin/env node
// Scaffold a new video: src/videos/<slug>/ + public/<slug>/MANIFEST.md +
// src/Root.tsx registration. Refuses if slug or CompId already exists.
//
// Usage: node scripts/new-video.mjs <slug> <CompId>
//   slug     video slug: src/videos/<slug>/ (e.g. myproduct)
//   CompId   Remotion composition ID: PascalCase (e.g. MyProductLaunch)
//
// Generates a hook-gate-green scaffold by construction:
//   P1: Root.tsx Composition registered with 1920×1080, fps 30, timeline binding
//   P2: all required files present + non-empty scenes/
//   Hook gates 4+5: AmbientField living-background (PASS from frame 0)
//   Hook gates 1+2: valid starter palette (all 5 slots are real 7-char hex)
//                   Hook scene renders promise.text as frame-0 focal element

import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

const [slug, CompId] = process.argv.slice(2).filter(a => !a.startsWith('--'));

if (!slug || !CompId) {
  process.stderr.write('Usage: node scripts/new-video.mjs <slug> <CompId>\n');
  process.exit(1);
}

// ── Existence checks ──────────────────────────────────────────────────────────

const videoDir    = join(PROJECT_ROOT, 'src', 'videos', slug);
const rootTsxPath = join(PROJECT_ROOT, 'src', 'Root.tsx');
const rootContent = readFileSync(rootTsxPath, 'utf8');

if (existsSync(videoDir)) {
  process.stderr.write(`ERROR: src/videos/${slug}/ already exists — refuse to overwrite\n`);
  process.exit(1);
}
if (new RegExp(`id=["']${CompId}["']`).test(rootContent)) {
  process.stderr.write(`ERROR: Composition id="${CompId}" already registered in Root.tsx\n`);
  process.exit(1);
}

// ── Identifier derivation ─────────────────────────────────────────────────────

// camelCase from kebab slug: my-video → myVideo
const camelSlug   = slug.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const themeVar    = `${camelSlug}Theme`;
const timelineVar = `${camelSlug}Timeline`;

// ── Create directories ────────────────────────────────────────────────────────

mkdirSync(videoDir, { recursive: true });
mkdirSync(join(videoDir, 'scenes'), { recursive: true });
mkdirSync(join(PROJECT_ROOT, 'public', slug), { recursive: true });

// ── Scaffold files ────────────────────────────────────────────────────────────

writeFileSync(join(videoDir, 'treatment.md'), `# Treatment — ${slug} (${CompId})

Status: DRAFT

## Logline

TODO: one sentence — the message this launch must communicate.

## Emotional arc

TODO: chosen arc shape + the emotion of each act.

## Hook

TODO: exactly what the first 75 frames do, and why a muted scroller stops.

## Identity

TODO: palette, type pairing, motion identity, rhythm signature, texture.

## Music direction

TODO: bpm, energy map, where the drop/impact lands.

## Scene list

TODO: scene name · intent · beats · one-line visual.

## Registry diff

TODO: which ≥4 axes differ from each prior registry entry (run distinct.sh).
`);

writeFileSync(join(videoDir, 'storyboard.md'), `# Storyboard — ${slug} (${CompId}, 1920×1080@30)

TODO: beat grid, scene boundaries, and per-scene shot specs.

## Scene status

| # | scene id | beats | status |
|---|----------|-------|--------|
| 1 | TODO     | TODO  | pending |

TODO: expand per storyboard spec — intent, copy, visual description, camera/motion, SFX cues.
`);

// Neutral starter palette — all 7-char hex (renderable from frame 0); TODO-commented for director.
writeFileSync(join(videoDir, 'theme.ts'), `import { SPRING } from "../../lib/springs";
import { defineTheme } from "../../lib/theme";

export const ${themeVar} = defineTheme({
  name: "${slug}",
  palette: {
    bg: "#0a0a0f",      // TODO: set video background color
    surface: "#16161e", // TODO: set surface/card color
    text: "#e8e8f0",    // TODO: set primary text color
    textDim: "#6b6b80", // TODO: set secondary/muted text color
    accent: "#7effc9",  // TODO: set accent/brand color
  },
  fonts: {
    display: { family: "TODO", weight: 700 },
    body: { family: "TODO", weight: 500 },
  },
  radius: { sm: 4, md: 8, lg: 16 },
  motion: {
    springs: {
      snap: SPRING.snap,
      settle: SPRING.settle,
      dramatic: SPRING.heavy,
    },
    enterFrames: 12,
    staggerFrames: 4,
    holdFrames: 12,
  },
  texture: { grainOpacity: 0, vignette: 0 },
});
`);

// Minimal two-scene timeline: director replaces bpm + scene list from treatment.
writeFileSync(join(videoDir, 'timeline.ts'), `import { buildTimeline } from "../../lib/timeline";

// TODO: update bpm + scenes to match your treatment.
export const ${timelineVar} = buildTimeline({ fps: 30, bpm: 120 }, [
  { id: "hook", beats: 10, promise: { text: "TODO: ≤6-word outcome/number by frame 75", byFrame: 60 } },
  { id: "cta", beats: 8, payoff: { text: "TODO: one-line resolution of the hook promise" } },
] as const);
`);

// Main.tsx: AmbientField living-background + Hook scene + DebugGrid last (hook-gate-green).
writeFileSync(join(videoDir, 'Main.tsx'), `import { AbsoluteFill } from "remotion";
import { AmbientField } from "../../lib/fx";
import { DebugGrid } from "../../lib/DebugGrid";
import { ThemeProvider } from "../../lib/theme";
import { ${themeVar} } from "./theme";
import { ${timelineVar} } from "./timeline";
import { Hook } from "./scenes/Hook";

export const ${CompId}: React.FC<{ debug?: boolean }> = ({ debug = false }) => {
  return (
    <ThemeProvider value={${themeVar}}>
      <AbsoluteFill style={{ background: ${themeVar}.palette.bg }}>
        <AmbientField
          color={${themeVar}.palette.accent}
          colorDim={${themeVar}.palette.textDim}
          density={80}
          energy={1.5}
          itemH={8}
        />
        <Hook promise={${timelineVar}.structure?.promise?.text} />
        <DebugGrid enabled={debug} />
      </AbsoluteFill>
    </ThemeProvider>
  );
};
`);

// Hook.tsx: minimal focal scene — renders promise.text centered; director replaces with archetype.
writeFileSync(join(videoDir, 'scenes', 'Hook.tsx'), `import { AbsoluteFill } from "remotion";
import { useTheme } from "../../../lib/theme";

export function Hook({ promise }: { promise?: string }) {
  const theme = useTheme();
  return (
    <AbsoluteFill
      style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <div
        style={{
          color: theme.palette.text,
          fontFamily: theme.fonts.display.family,
          fontWeight: theme.fonts.display.weight,
          fontSize: 64,
          textAlign: "center",
          padding: "0 80px",
        }}
      >
        {promise}
      </div>
    </AbsoluteFill>
  );
}
`);

writeFileSync(join(PROJECT_ROOT, 'public', slug, 'MANIFEST.md'), `# Assets — ${slug}

## Audio

TODO: document music source, license, bpm, and first-downbeat timestamp.
Record the track at public/${slug}/music.mp3 once sourced.
`);

// ── Root.tsx: insert imports + Composition ────────────────────────────────────

const newImports = `import { ${CompId} } from "./videos/${slug}/Main";
import { ${timelineVar} } from "./videos/${slug}/timeline";`;

const newComposition = `      <Composition
        id="${CompId}"
        component={${CompId}}
        durationInFrames={${timelineVar}.totalDurationInFrames}
        fps={${timelineVar}.fps}
        width={1920}
        height={1080}
        defaultProps={{ debug: false }}
      />`;

// Locate "export const RemotionRoot" to split imports from component body.
const exportIdx = rootContent.indexOf('export const RemotionRoot');
if (exportIdx === -1) {
  process.stderr.write('ERROR: cannot find "export const RemotionRoot" in Root.tsx\n');
  process.exit(1);
}
const beforeExport = rootContent.slice(0, exportIdx);
const afterExport  = rootContent.slice(exportIdx);

// Insert new Composition just before `    </>` (fragment close, 4-space indent).
const FRAG_CLOSE   = '\n    </>';
const fragCloseIdx = afterExport.lastIndexOf(FRAG_CLOSE);
if (fragCloseIdx === -1) {
  process.stderr.write('ERROR: cannot find fragment close "    </>" in Root.tsx\n');
  process.exit(1);
}

// fragCloseIdx is the index of the \n before "    </>"; +1 skips past that \n.
const updatedRoot =
  beforeExport +
  newImports + '\n\n' +
  afterExport.slice(0, fragCloseIdx + 1) +   // includes the trailing \n
  newComposition + '\n' +
  afterExport.slice(fragCloseIdx + 1);        // "    </>\n  );\n};\n"

writeFileSync(rootTsxPath, updatedRoot);

// ── Done ──────────────────────────────────────────────────────────────────────

process.stdout.write(`Scaffolded ${CompId} (${slug}) — hook-gate-green by construction:
  src/videos/${slug}/treatment.md
  src/videos/${slug}/storyboard.md
  src/videos/${slug}/theme.ts        (valid 7-char hex palette — TODO-commented for director)
  src/videos/${slug}/timeline.ts
  src/videos/${slug}/Main.tsx        (AmbientField + Hook scene; hook gates 4+5 PASS from frame 0)
  src/videos/${slug}/scenes/Hook.tsx (renders promise.text as focal element)
  public/${slug}/MANIFEST.md
  src/Root.tsx  — ${CompId} registered

Next: scripts/hook.sh ${CompId}
      scripts/preflight.sh ${CompId} ${slug}
`);
