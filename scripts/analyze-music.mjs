#!/usr/bin/env node
// Analyzes music files so the timeline can be cut to the REAL track:
// BPM + beat grid (music-tempo), first-beat offset, and an RMS energy curve
// with the biggest energy jumps (drop candidates). Claude cannot hear —
// this is how music becomes readable data.
//
// Usage: node scripts/analyze-music.mjs <slug>            # all candidates
//        node scripts/analyze-music.mjs <slug> --file=public/<slug>/music.mp3

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import MusicTempo from "music-tempo";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith("--"));
const fileArg = args.find((a) => a.startsWith("--file="))?.split("=")[1];
if (!slug && !fileArg) {
  console.error(
    "Usage: node scripts/analyze-music.mjs <slug> [--file=path/to.mp3]",
  );
  process.exit(1);
}

const files = fileArg
  ? [resolve(root, fileArg)]
  : (() => {
      const dir = resolve(root, "public", slug, "music-candidates");
      if (!existsSync(dir)) {
        console.error(`ERROR: ${dir} does not exist — run gen-music first`);
        process.exit(1);
      }
      return readdirSync(dir)
        .filter((f) => f.endsWith(".mp3"))
        .sort()
        .map((f) => resolve(dir, f));
    })();

const decodeToMono44k = (mp3Path) => {
  const tmpDir = resolve(root, "out", "tmp");
  mkdirSync(tmpDir, { recursive: true });
  const wavPath = resolve(tmpDir, `${basename(mp3Path)}.wav`);
  execFileSync(
    "npx",
    [
      "remotion",
      "ffmpeg",
      "-y",
      "-i",
      mp3Path,
      "-ac",
      "1",
      "-ar",
      "44100",
      "-f",
      "wav",
      wavPath,
    ],
    { stdio: "pipe" },
  );
  const buf = readFileSync(wavPath);
  // Walk RIFF chunks to find 16-bit PCM "data".
  let offset = 12;
  let dataStart = -1;
  let dataSize = 0;
  while (offset + 8 <= buf.length) {
    const id = buf.toString("ascii", offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    if (id === "data") {
      dataStart = offset + 8;
      dataSize = size;
      break;
    }
    offset += 8 + size + (size % 2);
  }
  if (dataStart < 0) {
    throw new Error(`no data chunk in ${wavPath}`);
  }
  const samples = new Float32Array(Math.floor(dataSize / 2));
  for (let i = 0; i < samples.length; i++) {
    samples[i] = buf.readInt16LE(dataStart + i * 2) / 32768;
  }
  return samples;
};

const analyze = (mp3Path) => {
  const sr = 44100;
  const samples = decodeToMono44k(mp3Path);
  const durationSec = samples.length / sr;
  if (samples.length < sr) {
    console.error(`ERROR: ${basename(mp3Path)} has no usable audio stream`);
    process.exit(1);
  }

  // Ambient beds without transients are valid music — degrade to bpm:null.
  let bpm = null;
  let beats = [];
  try {
    const mt = new MusicTempo(samples);
    bpm = Number(mt.tempo);
    beats = mt.beats; // seconds
  } catch {
    console.warn(
      `WARN: ${basename(mp3Path)}: no beat grid detected — set bpm manually in MANIFEST.md`,
    );
  }

  // RMS energy in 0.25s windows, normalized to the loudest window.
  const win = Math.floor(sr * 0.25);
  const rms = [];
  for (let s = 0; s + win <= samples.length; s += win) {
    let acc = 0;
    for (let i = s; i < s + win; i++) {
      acc += samples[i] * samples[i];
    }
    rms.push(Math.sqrt(acc / win));
  }
  const peakRms = Math.max(...rms, 1e-9);
  const energy = rms.map((v, i) => ({
    t: Number((i * 0.25).toFixed(2)),
    e: Number((v / peakRms).toFixed(3)),
  }));

  // Biggest 1s energy jumps = drop candidates.
  const jumps = [];
  for (let i = 4; i < energy.length; i++) {
    jumps.push({
      t: energy[i].t,
      jump: Number((energy[i].e - energy[i - 4].e).toFixed(3)),
    });
  }
  const drops = [...jumps]
    .sort((a, b) => b.jump - a.jump)
    .slice(0, 3)
    .sort((a, b) => a.t - b.t);

  const result = {
    file: basename(mp3Path),
    durationSec: Number(durationSec.toFixed(2)),
    bpm: bpm === null ? null : Number(bpm.toFixed(2)),
    bpmRounded: bpm === null ? null : Math.round(bpm),
    firstBeatSec: Number((beats[0] ?? 0).toFixed(3)),
    beatCount: beats.length,
    drops,
    energy,
  };
  const jsonPath = mp3Path.replace(/\.(mp3|wav|m4a)$/, ".analysis.json");
  writeFileSync(jsonPath, JSON.stringify(result, null, 2));
  return result;
};

for (const file of files) {
  const r = analyze(file);
  console.log(
    `${r.file}  ${r.durationSec}s  bpm=${r.bpm} (~${r.bpmRounded})  firstBeat=${r.firstBeatSec}s  drops=${r.drops
      .map((d) => `${d.t}s(+${d.jump})`)
      .join(" ")}`,
  );
}
console.log("\nAnalysis JSON written next to each file.");
