/**
 * Catalog integrity test — all 8 hook archetypes resolve to a verified proof.
 *
 * For the 6 smoke-fixture archetypes (1,2,4,5,6,8): asserts the corresponding
 * CompId is registered as a <Composition> in src/Root.tsx.
 * For the 2 in-video proof archetypes (3,7): asserts the cited scene file exists.
 *
 * This prevents silent catalog drift: if a fixture is renamed, removed, or its
 * Root.tsx registration is dropped, these tests fail immediately.
 *
 * Run: npm test -- --reporter=verbose hook-fixtures
 */

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

/** Parse all Composition id="..." values from src/Root.tsx. */
function parseRootCompositionIds() {
  const src = readFileSync(resolve(PROJECT_ROOT, 'src/Root.tsx'), 'utf8');
  const ids = new Set();
  for (const m of src.matchAll(/id="([^"]+)"/g)) {
    ids.add(m[1]);
  }
  return ids;
}

// ---------------------------------------------------------------------------
// Catalog — mirrors the 8 archetypes in .claude/skills/produce/hooks.md
//
// compId:  resolved via src/Root.tsx registration (smoke fixtures)
// proof:   resolved via file existence (in-video proofs for archetypes 3 + 7)
// video:   the video the proof is embedded in (for context in failure messages)
// ---------------------------------------------------------------------------

const ARCHETYPES = [
  { id: 1, name: 'Mid-action demo',          compId: 'Hook01MidActionDemo' },
  { id: 2, name: 'Bold / contrast claim',    compId: 'Hook02BoldClaim' },
  { id: 3, name: 'Dramatized pain',          proof: 'src/videos/relay/scenes/Hook.tsx',   video: 'RelayLaunch' },
  { id: 4, name: 'Pattern interrupt',        compId: 'Hook04PatternInterrupt' },
  { id: 5, name: 'Number-counting',          compId: 'Hook05NumberCounting' },
  { id: 6, name: 'Payoff flash-forward',     compId: 'Hook06PayoffFlashForward' },
  { id: 7, name: 'Open question/indictment', proof: 'src/videos/granipa/scenes/Hook.tsx', video: 'GranipaLaunch' },
  { id: 8, name: 'Multi-layer live demo',    compId: 'Hook08MultiLayerLiveDemo' },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('hook archetype catalog — all 8 archetypes resolve to a verified proof', () => {
  const registeredIds = parseRootCompositionIds();

  for (const archetype of ARCHETYPES) {
    if (archetype.compId) {
      it(`Archetype ${archetype.id} (${archetype.name}): "${archetype.compId}" registered in src/Root.tsx`, () => {
        expect(
          registeredIds.has(archetype.compId),
          `Composition id="${archetype.compId}" not found in src/Root.tsx — ` +
          `add or restore the <Composition> registration for this hook fixture`,
        ).toBe(true);
      });
    } else {
      it(`Archetype ${archetype.id} (${archetype.name}): in-video proof "${archetype.proof}" exists (${archetype.video})`, () => {
        expect(
          existsSync(resolve(PROJECT_ROOT, archetype.proof)),
          `Scene file "${archetype.proof}" not found — ` +
          `this is the in-video proof for Archetype ${archetype.id} embedded in ${archetype.video}`,
        ).toBe(true);
      });
    }
  }
});
