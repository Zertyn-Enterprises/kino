#!/usr/bin/env node
// Generates one SFX one-shot via the ElevenLabs sound-generation API.
//
// Usage: node scripts/gen-sfx.mjs <outFile.mp3> "<prompt>" [seconds]
//
// Reads ELEVENLABS_API_KEY from .env. Minimum duration the API accepts
// is 0.5s. Prompts: describe transient, body, tail and tone — like a
// sound designer, not a label.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
try {
  process.loadEnvFile(resolve(root, ".env"));
} catch {
  // .env optional if the key is already in the environment
}

const API_KEY = process.env.ELEVENLABS_API_KEY;
if (!API_KEY) {
  console.error("ERROR: ELEVENLABS_API_KEY missing — add it to .env");
  process.exit(1);
}

const [out, prompt, secondsArg] = process.argv.slice(2);
if (!out || !prompt) {
  console.error(
    'Usage: node scripts/gen-sfx.mjs <outFile.mp3> "<prompt>" [seconds]',
  );
  process.exit(1);
}
const seconds = Math.max(0.5, Number(secondsArg ?? 1));

const res = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
  method: "POST",
  headers: { "xi-api-key": API_KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ text: prompt, duration_seconds: seconds }),
});
if (!res.ok) {
  console.error(`ERROR: ElevenLabs ${res.status}: ${await res.text()}`);
  process.exit(1);
}
const audio = Buffer.from(await res.arrayBuffer());
const file = resolve(root, out);
mkdirSync(dirname(file), { recursive: true });
writeFileSync(file, audio);
console.log(`${out}  (${(audio.length / 1024).toFixed(0)} kB, ${seconds}s)`);
