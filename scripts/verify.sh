#!/usr/bin/env bash
# verify.sh — the single gate before every commit (referenced in AGENTS.md)
# Must exit 0 for a commit to proceed.

set -e

echo "▶ pnpm build..."
pnpm build

echo "▶ astro check (type-check)..."
pnpm astro check

echo "▶ eslint..."
pnpm lint

echo "▶ prettier format check..."
pnpm format:check

echo ""
echo "✓ All checks passed."
