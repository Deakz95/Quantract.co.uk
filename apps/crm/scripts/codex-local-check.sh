#!/usr/bin/env bash
set -euo pipefail

echo "==> typecheck"
npm run typecheck

echo "==> build"
npm run build

echo "==> playwright"
npm run test:pw

echo "✅ All checks passed"
