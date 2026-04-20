import fs from "node:fs";
import path from "node:path";

import { detectPlatformProfile } from "../src/lib/agent/platform-profile";
import { getPersistentExecutionStorePath } from "../src/lib/agent/persistent-store";

const root = process.cwd();
const dataDir = path.join(root, "data");
const platformProfile = detectPlatformProfile();
const executionStorePath = getPersistentExecutionStorePath();

fs.mkdirSync(dataDir, { recursive: true });

const output = {
  installer: "project-asylum-bootstrap",
  installationMode: "observe-only",
  safeByDefault: true,
  remediationEnabled: false,
  root,
  dataDir,
  executionStorePath,
  platformProfile,
  guarantees: [
    "Installer yalnızca observation ve platform/log keşfi yapar.",
    "Kurulum sırasında remediation veya sistem değişikliği uygulanmaz.",
    "Log kaynakları sadece yol ve varlık düzeyinde tespit edilir."
  ],
  nextSteps: [
    "npm install",
    "npm test",
    "npm run dev"
  ]
};

console.log(JSON.stringify(output, null, 2));
