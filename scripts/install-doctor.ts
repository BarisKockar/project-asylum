import fs from "node:fs";

import { detectPlatformProfile } from "../src/lib/agent/platform-profile";
import { getPersistentExecutionStorePath } from "../src/lib/agent/persistent-store";

const platformProfile = detectPlatformProfile();
const executionStorePath = getPersistentExecutionStorePath();

const checks = [
  {
    id: "execution-store-dir",
    ok: fs.existsSync(executionStorePath) || fs.existsSync(executionStorePath.replace(/agent-executions\.json$/, "")),
    note: "Execution store path veya data dizini erişilebilir olmalı."
  },
  {
    id: "recommended-log-source",
    ok: platformProfile.logSources.some((source) => source.recommended && source.exists),
    note: "En az bir önerilen log kaynağı mevcut olmalı."
  },
  {
    id: "platform-detected",
    ok: platformProfile.osFamily !== "unknown",
    note: "Platform ailesi linux/macos/windows olarak tespit edilmiş olmalı."
  }
];

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
