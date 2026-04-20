#!/usr/bin/env bash
set -euo pipefail

echo "[Project Asylum] Starting safe observe-only installation flow"
npm install
npm run install:setup
npm run install:bootstrap
npm run install:doctor
npm run install:postcheck
echo "[Project Asylum] Installation bootstrap completed"
