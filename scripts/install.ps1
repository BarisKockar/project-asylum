$ErrorActionPreference = "Stop"

Write-Host "[Project Asylum] Starting safe observe-only installation flow"
npm install
npm run install:setup
npm run install:bootstrap
npm run install:doctor
npm run install:postcheck
Write-Host "[Project Asylum] Installation bootstrap completed"
