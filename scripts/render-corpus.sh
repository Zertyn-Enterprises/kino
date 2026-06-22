#!/usr/bin/env bash
# Thin wrapper around render-corpus.mjs.
# Build mode: renders <CompId> as a shared PNG corpus (idempotent), prints manifest path.
# List mode:  slices an existing manifest for gate consumption.
#
# Usage:
#   scripts/render-corpus.sh <CompId> [propsJson]
#   scripts/render-corpus.sh --list <manifestPath> [--step=N] [--window=S:E]
set -euo pipefail
cd "$(dirname "$0")/.."
exec node scripts/render-corpus.mjs "$@"
