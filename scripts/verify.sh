#!/usr/bin/env bash
# verify.sh — the single gate before every commit (referenced in AGENTS.md).
# Must exit 0 for a commit to proceed. Cheap checks first so failures surface fast.

set -euo pipefail

echo "▶ prettier format check..."
pnpm format:check

echo "▶ eslint..."
pnpm lint

echo "▶ astro check (type-check)..."
pnpm check

echo "▶ unit tests..."
pnpm test

echo "▶ build..."
pnpm build

echo ""
echo "✓ All checks passed."
