#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK_DIR="$(cd "$ROOT_DIR/.." && pwd)"
OUT_DIR="$(cd "$ROOT_DIR/.." && pwd)/test-results/performance"
OUT_FILE_REL="../test-results/performance/k6-summary.json"

mkdir -p "$OUT_DIR"
cd "$ROOT_DIR"

if command -v k6 >/dev/null 2>&1; then
  TARGET_BASE_URL="${TARGET_BASE_URL:-http://127.0.0.1:8080}" \
    k6 run tests/performance/k6.local.js --summary-export "$OUT_FILE_REL"
  exit 0
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "k6 CLI is not installed and docker is not available for fallback." >&2
  exit 1
fi

FALLBACK_URL="${TARGET_BASE_URL:-http://host.docker.internal:8080}"
echo "k6 CLI not found. Using Docker fallback with TARGET_BASE_URL=$FALLBACK_URL"

docker run --rm \
  -v "$WORK_DIR:/work" \
  -w /work/frontend \
  -e TARGET_BASE_URL="$FALLBACK_URL" \
  grafana/k6 run tests/performance/k6.local.js --summary-export "$OUT_FILE_REL"
