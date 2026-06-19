#!/usr/bin/env node
// Generates a music bed (or N candidates with --n) via the ElevenLabs Music API.
//
// Usage: node scripts/gen-music.mjs <slug> "<prompt>" [--n=1] [--seconds=34]
//
// Writes public/<slug>/music-candidates/candidate-<i>.mp3. Reads
// ELEVENLABS_API_KEY from .env. Prompts must follow the Eleven Music terms:
// describe by attributes only — never artist/songwriter names, song or album
// titles, label names, or recognizable lyrics.

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
try {
  process.loadEnvFile(resolve(root, ".env"));
} catch {
  // .env optional if the key is already in the environment
}

const API_KEY = process.env.ELEVENLABS_API_KEY;
if (!API_KEY) {
  console.error(
    "ERROR: ELEVENLABS_API_KEY missing — add it to .env (see .env.example)",
  );
  process.exit(1);
}

const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith("--"));
const flag = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? Number(hit.split("=")[1]) : fallback;
};

const [slug, prompt] = positional;
if (!slug || !prompt) {
  console.error(
    'Usage: node scripts/gen-music.mjs <slug> "<prompt>" [--n=1] [--seconds=34]',
  );
  process.exit(1);
}
const n = flag("n", 1);
const seconds = flag("seconds", 34);

const outDir = resolve(root, "public", slug, "music-candidates");
mkdirSync(outDir, { recursive: true });

const generate = async (i) => {
  const res = await fetch(
    "https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128",
    {
      method: "POST",
      headers: { "xi-api-key": API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        music_length_ms: seconds * 1000,
        model_id: "music_v1",
        force_instrumental: true,
      }),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ElevenLabs ${res.status}: ${body.slice(0, 400)}`);
  }
  const audio = Buffer.from(await res.arrayBuffer());
  const file = resolve(outDir, `candidate-${i}.mp3`);
  writeFileSync(file, audio);
  console.log(`candidate-${i}.mp3  (${(audio.length / 1024).toFixed(0)} kB)`);
};

console.log(`Generating ${n} candidate(s) × ${seconds}s for "${slug}"…`);
for (let i = 1; i <= n; i++) {
  await generate(i);
}
console.log(
  `Done. Quota used: ~${((n * seconds) / 60).toFixed(1)} min of music.`,
);
console.log(`Listen, pick one, then: node scripts/analyze-music.mjs ${slug}`);
