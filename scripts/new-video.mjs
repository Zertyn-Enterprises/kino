#!/usr/bin/env node
// Scaffold a new video: src/videos/<slug>/ + public/<slug>/MANIFEST.md +
// src/Root.tsx registration. Refuses if slug or CompId already exists.
//
// Usage: node scripts/new-video.mjs <slug> <CompId> [--hook=<key>] [--body=<key>] [--distinct] [--ambient=<key>]
//   slug       video slug: src/videos/<slug>/ (e.g. myproduct)
//   CompId     Remotion composition ID: PascalCase (e.g. MyProductLaunch)
//   --hook     optional archetype key from hook-archetypes.mjs; emits a
//              gate-green archetype Hook.tsx instead of the generic scaffold.
//              Run with an unknown key to print valid keys.
//   --body     optional pattern key from retention-patterns.mjs; emits
//              retention-gate-green Body + Climax|Cta scenes.
//   --distinct read src/videos/_registry.md and emit an anti-convergence starter
//              palette + font pairing (distinct-gate-green by construction).
//              Without this flag, the generic dark/teal starter is emitted.
//              Also auto-selects a non-strips ambient motif from the registry.
//   --ambient  optional ambient-field motif key (strips/motes/grid-pulse/ember-rise);
//              overrides the auto-selected motif when --distinct is used.
//              Without --distinct, specifying --ambient still wires the chosen motif.
//              Run with an unknown key to print valid keys.
//
// Generates a hook-gate-green scaffold by construction:
//   P1: Root.tsx Composition registered with 1920×1080, fps 30, timeline binding
//   P2: all required files present + non-empty scenes/
//   Hook gates 4+5: ambient living-background (PASS from frame 0)
//   Hook gates 1+2: valid starter palette (all 5 slots are real 7-char hex)
//                   Hook scene renders promise.text as frame-0 focal element

import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HOOK_ARCHETYPES, HOOK_ARCHETYPE_KEYS } from './hook-archetypes.mjs';
import { RETENTION_PATTERNS, RETENTION_PATTERN_KEYS } from './retention-patterns.mjs';
import { computeIdentitySeed } from './identity-seed.mjs';
import { AMBIENT_MOTIF_KEYS, AMBIENT_MOTIF_COMPONENT_NAMES } from './ambient-motif-keys.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

// Extract --hook=, --body=, --distinct, and --ambient= before the positional arg filter.
const rawArgs = process.argv.slice(2);
const hookFlagArg = rawArgs.find(a => a.startsWith('--hook='));
const hookKey = hookFlagArg ? hookFlagArg.slice('--hook='.length) : null;
const bodyFlagArg = rawArgs.find(a => a.startsWith('--body='));
const bodyKey = bodyFlagArg ? bodyFlagArg.slice('--body='.length) : null;
const distinctFlag = rawArgs.includes('--distinct');
const ambientFlagArg = rawArgs.find(a => a.startsWith('--ambient='));
const ambientFlagKey = ambientFlagArg ? ambientFlagArg.slice('--ambient='.length) : null;

const [slug, CompId] = rawArgs.filter(a => !a.startsWith('--'));

if (!slug || !CompId) {
  process.stderr.write('Usage: node scripts/new-video.mjs <slug> <CompId> [--hook=<key>] [--body=<key>] [--distinct] [--ambient=<key>]\n');
  process.exit(1);
}

// Validate --hook key before doing any filesystem work.
if (hookKey !== null) {
  if (!hookKey || !HOOK_ARCHETYPES[hookKey]) {
    process.stderr.write(
      `ERROR: unknown --hook key "${hookKey}"\nValid keys: ${HOOK_ARCHETYPE_KEYS.join(', ')}\n`,
    );
    process.exit(1);
  }
}

// Validate --body key before doing any filesystem work.
if (bodyKey !== null) {
  if (!bodyKey || !RETENTION_PATTERNS[bodyKey]) {
    process.stderr.write(
      `ERROR: unknown --body key "${bodyKey}"\nValid keys: ${RETENTION_PATTERN_KEYS.join(', ')}\n`,
    );
    process.exit(1);
  }
}

// Validate --ambient key before doing any filesystem work.
if (ambientFlagKey !== null) {
  if (!ambientFlagKey || !AMBIENT_MOTIF_COMPONENT_NAMES[ambientFlagKey]) {
    process.stderr.write(
      `ERROR: unknown --ambient key "${ambientFlagKey}"\nValid keys: ${AMBIENT_MOTIF_KEYS.join(', ')}\n`,
    );
    process.exit(1);
  }
}

// ── Anti-convergence seed (--distinct) ───────────────────────────────────────

let identitySeed = null;
if (distinctFlag) {
  const registryPath = join(PROJECT_ROOT, 'src', 'videos', '_registry.md');
  if (!existsSync(registryPath)) {
    process.stderr.write(`ERROR: --distinct requires src/videos/_registry.md (not found at ${registryPath})\n`);
    process.exit(1);
  }
  const registryText = readFileSync(registryPath, 'utf8');
  identitySeed = computeIdentitySeed(registryText);
}

// ── Ambient motif resolution ──────────────────────────────────────────────────
// Priority: --ambient flag > --distinct seed > default (strips → AmbientField).
const ambientKey = ambientFlagKey ?? (identitySeed ? identitySeed.ambientMotifKey : null);
const ambientComponent = AMBIENT_MOTIF_COMPONENT_NAMES[ambientKey ?? 'strips'];

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

// ── Ambient motif substitution helper ────────────────────────────────────────

/**
 * Substitute the AmbientField import in a generated scene source string with an
 * import alias for the chosen motif component. JSX references (<AmbientField …/>)
 * remain unchanged because the alias makes them resolve to the chosen component.
 *
 * Only operates on import statements (lines containing "import … { … AmbientField")
 * so JSX prop names and other occurrences are left untouched.
 *
 * Example:
 *   'import { AmbientField, Flash } from "../../../lib/fx"'
 *   → 'import { MoteField as AmbientField, Flash } from "../../../lib/fx"'
 */
function substituteAmbientMotif(source, componentName) {
  if (componentName === 'AmbientField') return source;
  return source.replace(
    /(\bimport\b[^;{]*\{[^}]*)\bAmbientField\b/g,
    (_, pre) => `${pre}${componentName} as AmbientField`,
  );
}

// ── Scaffold files ────────────────────────────────────────────────────────────

const hookSection = hookKey
  ? (() => {
      const arch = HOOK_ARCHETYPES[hookKey];
      const archNum = HOOK_ARCHETYPE_KEYS.indexOf(hookKey) + 1;
      return `\
## Hook

Archetype: ${arch.title} (\`${hookKey}\`) — hooks.md §${archNum}
AmbientField recipe: density=${arch.ambientRecipe.density}, energy=${arch.ambientRecipe.energy}
Signature primitive: ${arch.signaturePrimitive}
Best-fit arcs: ${arch.arcFit.join(', ')}

Gate mapping (gate-green by construction):
| Gate | Verdict |
|------|---------|
| 1 Motion by frame 10 (HARD) | PASS — signature primitive fires by frame 9 |
| 2 Frame-0 contrast (HARD) | PASS — focal element on dark background |
| 4 Background activity (advisory) | PASS — AmbientField active from frame 0 |
| 5 Frame-0 liveness (advisory) | PASS — AmbientField active from frame 0 |
| 6 Promise by 2.5s (HARD) | PASS — set promise.text + byFrame≤75 in timeline.ts |
| 7 Text density (HARD) | PASS — keep promise.text ≤ 6 words |

TODO: describe exactly what the first 75 frames do, and why a muted scroller stops.
TODO: re-derive bespoke copy, visual, and motion identity per Hard Rule 3.`;
    })()
  : `\
## Hook

TODO: exactly what the first 75 frames do, and why a muted scroller stops.`;

writeFileSync(join(videoDir, 'treatment.md'), `# Treatment — ${slug} (${CompId})

Status: DRAFT

## Logline

TODO: one sentence — the message this launch must communicate.

## Emotional arc

TODO: chosen arc shape + the emotion of each act.

${hookSection}

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

// theme.ts: anti-convergence seed palette when --distinct; neutral starter otherwise.
// Either way all 5 palette slots are valid 7-char hex (renderable from frame 0).
const themeSrc = identitySeed
  ? `import { SPRING } from "../../lib/springs";
import { defineTheme } from "../../lib/theme";

export const ${themeVar} = defineTheme({
  name: "${slug}",
  palette: {
    bg: "${identitySeed.bg}",           // TODO: anti-convergence seed — refine to taste
    surface: "${identitySeed.surface}", // TODO: anti-convergence seed — refine to taste
    text: "${identitySeed.text}",       // TODO: anti-convergence seed — refine to taste
    textDim: "${identitySeed.textDim}", // TODO: anti-convergence seed — refine to taste
    accent: "${identitySeed.accent}",   // TODO: anti-convergence seed — refine to taste
  },
  fonts: {
    display: { family: "${identitySeed.displayFamily}", weight: 700 }, // TODO: anti-convergence seed — refine to taste
    body: { family: "${identitySeed.bodyFamily}", weight: 500 },       // TODO: anti-convergence seed — refine to taste
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
  texture: { grainOpacity: ${identitySeed.grainPct / 100}, vignette: 0 }, // TODO: anti-convergence seed — refine to taste
});
`
  : `import { SPRING } from "../../lib/springs";
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
`;
writeFileSync(join(videoDir, 'theme.ts'), themeSrc);

// timeline.ts: body-pattern timelineSrc when --body set; minimal 2-beat generic otherwise.
const bodyResult = bodyKey
  ? RETENTION_PATTERNS[bodyKey].renderBodyScenes({ themeVar, timelineVar })
  : null;

writeFileSync(
  join(videoDir, 'timeline.ts'),
  bodyResult
    ? bodyResult.timelineSrc
    : `import { buildTimeline } from "../../lib/timeline";

// TODO: update bpm + scenes to match your treatment.
export const ${timelineVar} = buildTimeline({ fps: 30, bpm: 120 }, [
  { id: "hook", beats: 10, promise: { text: "TODO: ≤6-word outcome/number by frame 75", byFrame: 60 } },
  { id: "cta", beats: 8, payoff: { text: "TODO: one-line resolution of the hook promise" } },
] as const);
`,
);

// Main.tsx: 4 cases — generic, hook-only, body-only, hook+body.
// generic: ambient component at top level (gate-4/5 PASS from frame 0).
// hook-only: Hook.tsx provides the ambient component per-recipe (archetype scaffold).
// body-only: ambient component at top level for opening/cta_hold gaps + scene Sequences.
// hook+body: ambient component at top level for gaps + Hook + Body + Climax|Cta Sequences.

// Ambient component JSX for Main.tsx (direct import; no itemH for non-AmbientField motifs).
const ambientMainImport = `import { ${ambientComponent} } from "../../lib/fx";`;
const ambientMainJsx = ambientComponent === 'AmbientField'
  ? `      <AmbientField
        color={${themeVar}.palette.accent}
        colorDim={${themeVar}.palette.textDim}
        density={80}
        energy={1.5}
        itemH={8}
      />`
  : `      <${ambientComponent}
        color={${themeVar}.palette.accent}
        colorDim={${themeVar}.palette.textDim}
        density={80}
        energy={1.5}
      />`;

let mainTsx;
if (bodyResult) {
  const bodyScenes = bodyResult.scenes; // [{filename, source}]
  const compBFile  = bodyScenes[1].filename;       // 'Climax.tsx' or 'Cta.tsx'
  const CompB      = compBFile.replace('.tsx', ''); // 'Climax' or 'Cta'
  const sceneId2   = CompB.toLowerCase();           // 'climax' or 'cta'

  if (hookKey) {
    // hook + body: Hook provides ambient component; top-level ambient covers gaps.
    mainTsx = `import { AbsoluteFill, Sequence } from "remotion";
${ambientMainImport}
import { DebugGrid } from "../../lib/DebugGrid";
import { ThemeProvider } from "../../lib/theme";
import { ${themeVar} } from "./theme";
import { ${timelineVar} } from "./timeline";
import { Hook } from "./scenes/Hook";
import { Body } from "./scenes/Body";
import { ${CompB} } from "./scenes/${compBFile.replace('.tsx', '')}";

const _sc = ${timelineVar}.scenes;

export const ${CompId}: React.FC<{ debug?: boolean }> = ({ debug = false }) => (
  <ThemeProvider value={${themeVar}}>
    <AbsoluteFill style={{ background: ${themeVar}.palette.bg }}>
${ambientMainJsx}
      <Sequence from={_sc.hook.from} durationInFrames={_sc.hook.durationInFrames}>
        <Hook
          promise={${timelineVar}.structure?.promise?.text}
          byFrame={${timelineVar}.structure?.promise?.frame}
        />
      </Sequence>
      <Sequence from={_sc.body.from} durationInFrames={_sc.body.durationInFrames}>
        <Body />
      </Sequence>
      <Sequence from={_sc.${sceneId2}.from} durationInFrames={_sc.${sceneId2}.durationInFrames}>
        <${CompB} />
      </Sequence>
      <DebugGrid enabled={debug} />
    </AbsoluteFill>
  </ThemeProvider>
);
`;
  } else {
    // body-only: ambient component at top level covers opening/cta_hold gaps.
    mainTsx = `import { AbsoluteFill, Sequence } from "remotion";
${ambientMainImport}
import { DebugGrid } from "../../lib/DebugGrid";
import { ThemeProvider } from "../../lib/theme";
import { ${themeVar} } from "./theme";
import { ${timelineVar} } from "./timeline";
import { Body } from "./scenes/Body";
import { ${CompB} } from "./scenes/${compBFile.replace('.tsx', '')}";

const _sc = ${timelineVar}.scenes;

export const ${CompId}: React.FC<{ debug?: boolean }> = ({ debug = false }) => (
  <ThemeProvider value={${themeVar}}>
    <AbsoluteFill style={{ background: ${themeVar}.palette.bg }}>
${ambientMainJsx}
      <Sequence from={_sc.body.from} durationInFrames={_sc.body.durationInFrames}>
        <Body />
      </Sequence>
      <Sequence from={_sc.${sceneId2}.from} durationInFrames={_sc.${sceneId2}.durationInFrames}>
        <${CompB} />
      </Sequence>
      <DebugGrid enabled={debug} />
    </AbsoluteFill>
  </ThemeProvider>
);
`;
  }
} else if (hookKey) {
  // hook-only: archetype Hook.tsx provides the ambient component per-recipe.
  mainTsx = `import { AbsoluteFill } from "remotion";
import { DebugGrid } from "../../lib/DebugGrid";
import { ThemeProvider } from "../../lib/theme";
import { ${themeVar} } from "./theme";
import { ${timelineVar} } from "./timeline";
import { Hook } from "./scenes/Hook";

export const ${CompId}: React.FC<{ debug?: boolean }> = ({ debug = false }) => {
  return (
    <ThemeProvider value={${themeVar}}>
      <AbsoluteFill style={{ background: ${themeVar}.palette.bg }}>
        <Hook
          promise={${timelineVar}.structure?.promise?.text}
          byFrame={${timelineVar}.structure?.promise?.frame}
        />
        <DebugGrid enabled={debug} />
      </AbsoluteFill>
    </ThemeProvider>
  );
};
`;
} else {
  // generic: ambient component at top level + generic Hook.tsx focal element.
  mainTsx = `import { AbsoluteFill } from "remotion";
${ambientMainImport}
import { DebugGrid } from "../../lib/DebugGrid";
import { ThemeProvider } from "../../lib/theme";
import { ${themeVar} } from "./theme";
import { ${timelineVar} } from "./timeline";
import { Hook } from "./scenes/Hook";

export const ${CompId}: React.FC<{ debug?: boolean }> = ({ debug = false }) => {
  return (
    <ThemeProvider value={${themeVar}}>
      <AbsoluteFill style={{ background: ${themeVar}.palette.bg }}>
${ambientMainJsx}
        <Hook promise={${timelineVar}.structure?.promise?.text} />
        <DebugGrid enabled={debug} />
      </AbsoluteFill>
    </ThemeProvider>
  );
};
`;
}

writeFileSync(join(videoDir, 'Main.tsx'), mainTsx);

// Hook.tsx: archetype scene from renderHookScene, or generic focal scaffold.
// For archetypes: substitute the ambient component if non-default (alias import).
writeFileSync(
  join(videoDir, 'scenes', 'Hook.tsx'),
  hookKey
    ? substituteAmbientMotif(HOOK_ARCHETYPES[hookKey].renderHookScene({ themeVar, timelineVar }), ambientComponent)
    : `import { AbsoluteFill } from "remotion";
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
`,
);

// Body scenes: write each scene file from renderBodyScenes() when --body is set.
// Substitute the ambient component if non-default (alias import keeps JSX refs valid).
if (bodyResult) {
  for (const scene of bodyResult.scenes) {
    writeFileSync(
      join(videoDir, 'scenes', scene.filename),
      substituteAmbientMotif(scene.source, ambientComponent),
    );
  }
}

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

const archLabel = hookKey
  ? `archetype ${HOOK_ARCHETYPES[hookKey].title} (--hook=${hookKey})`
  : null;
const bodyLabel = bodyKey
  ? `pattern ${RETENTION_PATTERNS[bodyKey].title} (--body=${bodyKey})`
  : null;

const bodySceneLines = bodyResult
  ? bodyResult.scenes
      .map(s => `  src/videos/${slug}/scenes/${s.filename}`)
      .join('\n')
  : null;

const ambientLabel = ambientComponent === 'AmbientField'
  ? 'AmbientField'
  : `${ambientComponent} (${ambientKey ?? 'strips'})`;

const mainTsxNote = bodyResult
  ? (hookKey
      ? `Hook + Body + ${bodyResult.scenes[1].filename.replace('.tsx','')} Sequences; ${ambientLabel} at top level`
      : `Body + ${bodyResult.scenes[1].filename.replace('.tsx','')} Sequences; ${ambientLabel} at top level (gate-1 PASS)`)
  : (hookKey
      ? `archetype Hook scene; ${ambientLabel} in Hook.tsx`
      : `${ambientLabel} + Hook scene; hook gates 4+5 PASS from frame 0`);

// --distinct summary line (printed before the file list).
const distinctSummary = identitySeed
  ? (() => {
      const open = identitySeed.openAxes.length > 0
        ? identitySeed.openAxes.join(', ')
        : '(all partially crowded)';
      const colliders = Object.keys(identitySeed.collidersByAxis).length > 0
        ? Object.entries(identitySeed.collidersByAxis)
            .map(([ax, slugs]) => `${ax}: ${slugs.join(',')}`)
            .join('; ')
        : 'none';
      return `\n  Distinct identity seed (--distinct):
    bg:      ${identitySeed.bg}  (${identitySeed.luminance})
    accent:  ${identitySeed.accent}
    display: ${identitySeed.displayFamily} (${identitySeed.displayClass}) · body: ${identitySeed.bodyFamily} (${identitySeed.bodyClass})
    arc ${identitySeed.arc} · ${identitySeed.bpmBpm}bpm (${identitySeed.bpmBand}) · grain ${identitySeed.grainPct}% (${identitySeed.grainBand})
    ambient: ${ambientKey ?? identitySeed.ambientMotifKey} (${ambientFlagKey ? 'explicit --ambient flag' : 'auto-selected from registry'})
    Open axes (zero prior uses): ${open}
    Colliders avoided: ${colliders}`;
    })()
  : '';

process.stdout.write(`Scaffolded ${CompId} (${slug}) — gate-green by construction:${distinctSummary}
  src/videos/${slug}/treatment.md
  src/videos/${slug}/storyboard.md
  src/videos/${slug}/theme.ts        (${identitySeed ? 'anti-convergence seed palette — distinct-gate-green by construction, refine to taste' : 'valid 7-char hex palette — TODO-commented for director'})
  src/videos/${slug}/timeline.ts     (${bodyLabel ? `retention pattern — role:'climax' + role:'hold' + rehookSeconds` : '2-beat generic — replace bpm + scenes from treatment'})
  src/videos/${slug}/Main.tsx        (${mainTsxNote})
  src/videos/${slug}/scenes/Hook.tsx (${archLabel ?? 'renders promise.text as focal element'})
${bodySceneLines ? bodySceneLines + '\n' : ''}  public/${slug}/MANIFEST.md
  src/Root.tsx  — ${CompId} registered

Next: scripts/hook.sh ${CompId}
      scripts/preflight.sh ${CompId} ${slug}${identitySeed ? `
      scripts/distinct.sh ${slug}` : ''}${hookKey ? `
      Hook archetype: ${archLabel} — re-derive bespoke copy/motion per Hard Rule 3` : ''}${bodyLabel ? `
      Body pattern: ${bodyLabel} — re-derive bespoke content per Hard Rule 3
      scripts/retention.sh ${CompId} --slug=${slug}` : ''}
`);
