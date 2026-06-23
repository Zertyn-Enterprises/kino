#!/usr/bin/env bash
# Thin wrapper — delegates to dogfood.mjs.
# Usage: scripts/dogfood.sh --update | --check
set -euo pipefail
cd "$(dirname "$0")/.."
exec node scripts/dogfood.mjs "$@"
