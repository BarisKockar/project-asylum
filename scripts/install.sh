#!/usr/bin/env bash
set -euo pipefail

if ! command -v node >/dev/null 2>&1; then
  echo "[Project Asylum] Node bulunamadi."
  echo "[Project Asylum] Customer mode kurulumu icin Node 20+ veya bundled runtime gereklidir."
  exit 2
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "[Project Asylum] npm bulunamadi."
  echo "[Project Asylum] Customer mode kurulumu icin npm hazir olmali."
  exit 2
fi

echo "[Project Asylum] Starting safe observe-only installation flow"
npm run install:preflight
npm install
npm run install:setup
npm run install:bootstrap
npm run install:doctor
npm run install:postcheck
echo "[Project Asylum] Installation bootstrap completed"
