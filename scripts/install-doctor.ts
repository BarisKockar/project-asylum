import fs from "node:fs";
import path from "node:path";

import { detectPlatformProfile } from "../src/lib/agent/platform-profile";
import { getPersistentExecutionStorePath } from "../src/lib/agent/persistent-store";

const platformProfile = detectPlatformProfile();
const executionStorePath = getPersistentExecutionStorePath();
const installStatePath = path.join(process.cwd(), "release", "install-state.json");

const checks = [
  {
    id: "execution-store-dir",
    ok: fs.existsSync(executionStorePath) || fs.existsSync(executionStorePath.replace(/agent-executions\.json$/, "")),
    note: "Execution store path veya data dizini erişilebilir olmalı."
  },
  {
    id: "recommended-log-source",
    ok: platformProfile.logSources.some(
      (source) => source.recommended && source.exists && source.readable !== false
    ),
    note: "En az bir önerilen log kaynağı mevcut ve okunabilir olmalı."
  },
  {
    id: "log-fallback-available",
    ok: platformProfile.logSources.some(
      (source) => source.sourceType === "command" && source.exists
    ),
    note: "Sabit dosya yolları zayıfsa komut tabanlı bir log fallback'i mevcut olmalı."
  },
  {
    id: "platform-detected",
    ok: platformProfile.osFamily !== "unknown",
    note: "Platform ailesi linux/macos/windows olarak tespit edilmiş olmalı."
  }
];

if (process.env.PROJECT_ASYLUM_SKIP_INSTALL_STATE_WRITE !== "1") {
  const previousState = fs.existsSync(installStatePath)
    ? JSON.parse(fs.readFileSync(installStatePath, "utf8"))
    : {};
  fs.writeFileSync(
    installStatePath,
    JSON.stringify(
      {
        ...previousState,
        doctorComplete: checks.every((check) => check.ok),
        updatedAt: new Date().toISOString()
      },
      null,
      2
    ),
    "utf8"
  );
}

console.log(
  JSON.stringify(
    {
      doctor: "project-asylum-install",
      installationMode: "observe-only",
      safeByDefault: true,
      remediationEnabled: false,
      platformProfile,
      guarantees: [
        "Doctor yalnızca kontrol ve raporlama yapar.",
        "Kurulum güvenlik açığı oluşturacak aktif değişiklik yapmaz.",
        "Sistem üzerinde otomatik aksiyon tetiklemez."
      ],
      checks
    },
    null,
    2
  )
);
