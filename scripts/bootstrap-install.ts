import fs from "node:fs";
import path from "node:path";

import { detectPlatformProfile } from "../src/lib/agent/platform-profile";
import { getPersistentExecutionStorePath } from "../src/lib/agent/persistent-store";

const root = process.cwd();
const dataDir = path.join(root, "data");
const releaseDir = path.join(root, "release");
const bootstrapProfilePath = path.join(releaseDir, "bootstrap-profile.json");
const installStatePath = path.join(releaseDir, "install-state.json");
const platformProfile = detectPlatformProfile();
const executionStorePath = getPersistentExecutionStorePath();

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(releaseDir, { recursive: true });
fs.writeFileSync(
  bootstrapProfilePath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      platformProfile
    },
    null,
    2
  ),
  "utf8"
);

if (process.env.PROJECT_ASYLUM_SKIP_INSTALL_STATE_WRITE !== "1") {
  const previousState = fs.existsSync(installStatePath)
    ? JSON.parse(fs.readFileSync(installStatePath, "utf8"))
    : {};
  fs.writeFileSync(
    installStatePath,
    JSON.stringify(
      {
        ...previousState,
        setupComplete: previousState.setupComplete ?? false,
        bootstrapComplete: true,
        updatedAt: new Date().toISOString()
      },
      null,
      2
    ),
    "utf8"
  );
}

const output = {
  installer: "project-asylum-bootstrap",
  installationMode: "observe-only",
  safeByDefault: true,
  remediationEnabled: false,
  root,
  dataDir,
  bootstrapProfilePath,
  executionStorePath,
  platformProfile,
  guarantees: [
    "Installer yalnızca observation ve platform/log keşfi yapar.",
    "Kurulum sırasında remediation veya sistem değişikliği uygulanmaz.",
    "Log kaynakları yol, okunabilirlik ve gerekirse komut tabanlı fallback ile tespit edilir."
  ],
  nextSteps: [
    "npm install",
    "npm test",
    "npm run dev"
  ]
};

console.log(JSON.stringify(output, null, 2));
