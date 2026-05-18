import fs from "node:fs";
import path from "node:path";

const customerModeRoot =
  "/Users/bariskockar/Desktop/Project-Asylum-Customer-Mode-Kit/release/customer-mode";
const targetRoot =
  process.env.PROJECT_ASYLUM_WINDOWS_PILOT_TARGET ||
  "/Users/bariskockar/Desktop/Project-Asylum-Windows-Pilot";
const targetBundleRoot = path.join(targetRoot, "release", "customer-mode");

const includeEntries = [
  "Project Asylum Installer x64.exe",
  "Project Asylum Installer.exe",
  "README.md",
  "app",
  "config",
  "release",
  "runtime/windows",
  "scripts"
];

function ensureDir(target: string): void {
  fs.mkdirSync(target, { recursive: true });
}

function removeIfExists(target: string): void {
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
  }
}

function copyEntry(relativePath: string): void {
  const source = path.join(customerModeRoot, relativePath);
  const target = path.join(targetBundleRoot, relativePath);

  if (!fs.existsSync(source)) {
    throw new Error(`Eksik kaynak: ${source}`);
  }

  ensureDir(path.dirname(target));
  fs.cpSync(source, target, {
    recursive: true,
    force: true,
    filter: (currentSource) => {
      const normalized = currentSource.replace(`${customerModeRoot}/`, "");

      if (normalized.includes("/.DS_Store")) {
        return false;
      }

      if (
        normalized === "app/.env" ||
        normalized === "app/CODEX_HANDOFF.md" ||
        normalized === "app/AGENTS.md" ||
        normalized === "app/AI_TRAINING_STRATEGY.md" ||
        normalized === "app/COGNITIVE_ARCHITECTURE.md" ||
        normalized === "app/INSTALLATION.md" ||
        normalized === "app/LICENSE_REVIEW.md" ||
        normalized === "app/PROJECT_BLUEPRINT.md" ||
        normalized === "app/THIRD_PARTY_POLICY.md" ||
        normalized === "app/TRUST_AND_AUTONOMY_MODEL.md" ||
        normalized === "app/TUBITAK_1812_BIGG_BASVURU_TASLAGI.md" ||
        normalized === "app/README.md"
      ) {
        return false;
      }

      if (normalized.startsWith("app/tests")) {
        return false;
      }

      if (normalized.startsWith("app/.next/cache")) {
        return false;
      }

      if (
        normalized.startsWith("app/node_modules/@next/swc-darwin-") ||
        normalized.startsWith("app/node_modules/@next/swc-linux-")
      ) {
        return false;
      }

      if (
        normalized.startsWith("app/node_modules/electron") ||
        normalized.startsWith("app/node_modules/electron-builder")
      ) {
        return false;
      }

      if (
        normalized.startsWith("runtime/windows/") &&
        normalized.endsWith(".zip")
      ) {
        return false;
      }

      return true;
    }
  });
}

function writeQuickstart(): void {
  const quickstart = `# Project Asylum Windows Pilot

Bu paket Windows saha testi icin hazirlanmis hafif customer-mode bundle'idir.

## Baslangic

1. \`release/customer-mode/Project Asylum Installer x64.exe\` dosyasini yonetici olarak ac.
2. \`Preflight\` calistir.
3. \`Install Baslat\` ile kurulum zincirini tamamla.
4. Kurulum bittikten sonra \`Paneli Ac\` ile popup dashboard'u ac.

## Paket Icerigi

- x64 Windows installer
- arm64 Windows installer
- \`app/\` icinde bundle uygulamasi
- \`runtime/windows/\` icinde bundled Node runtime
- \`scripts/\` icinde install ve self-check akislari
- \`release/\` icinde self-check ve diagnostics artifaktlari

## Beklenen Sonuc

- observe-only kurulum
- remediation kapali
- preflight ve self-check gecisleri
- diagnostics export alinabilir
`;

  fs.writeFileSync(path.join(targetRoot, "WINDOWS_PILOT_QUICKSTART.md"), quickstart, "utf8");
}

function directorySize(target: string): number {
  const stat = fs.statSync(target);
  if (!stat.isDirectory()) {
    return stat.size;
  }

  return fs.readdirSync(target).reduce((sum, entry) => {
    return sum + directorySize(path.join(target, entry));
  }, 0);
}

function formatGb(bytes: number): string {
  return `${(bytes / (1024 ** 3)).toFixed(2)} GB`;
}

removeIfExists(targetRoot);
ensureDir(targetBundleRoot);

for (const entry of includeEntries) {
  copyEntry(entry);
}

writeQuickstart();

const manifest = {
  generatedAt: new Date().toISOString(),
  source: customerModeRoot,
  target: targetRoot,
  includedEntries: includeEntries,
  bundleSizeBytes: directorySize(targetRoot),
  bundleSizeHuman: formatGb(directorySize(targetRoot))
};

fs.writeFileSync(
  path.join(targetRoot, "windows-pilot-manifest.json"),
  JSON.stringify(manifest, null, 2),
  "utf8"
);

console.log(JSON.stringify(manifest, null, 2));
