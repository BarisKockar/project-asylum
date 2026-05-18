$ErrorActionPreference = "Stop"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "[Project Asylum] Node bulunamadi."
  Write-Host "[Project Asylum] Customer mode kurulumu icin Node 20+ veya bundled runtime gereklidir."
  exit 2
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Host "[Project Asylum] npm bulunamadi."
  Write-Host "[Project Asylum] Customer mode kurulumu icin npm hazir olmali."
  exit 2
}

Write-Host "[Project Asylum] Starting safe observe-only installation flow"
npm run install:preflight
npm install
npm run install:setup
npm run install:bootstrap
npm run install:doctor
npm run install:postcheck
Write-Host "[Project Asylum] Installation bootstrap completed"
