#!/usr/bin/env bash
# Generates the test media used by the SmokeTest composition.
# The video clip is rendered with Remotion itself: the bundled ffmpeg has no
# lavfi video sources, and a system ffmpeg must not be a requirement.
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p public/smoke
npx remotion ffmpeg -y -f lavfi -i "sine=frequency=440:duration=10" -ar 44100 public/smoke/tone.wav
npx remotion render SmokeClip public/smoke/clip.mp4
echo "Smoke media written to public/smoke/"
