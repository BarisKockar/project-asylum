import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const envPath = path.join(root, ".env");
const releaseManifestPath = path.join(root, "release", "install-manifest.json");
const installStatePath = path.join(root, "release", "install-state.json");
const checks = [
  {
    id: "env-present",
    ok: fs.existsSync(envPath),
    note: ".env dosyası hazır olmalı."
  },
  {
    id: "release-manifest-present",
    ok: fs.existsSync(releaseManifestPath),
    note: "Kurulum manifest dosyası üretilmiş olmalı."
  },
  {
    id: "observe-only-default",
    ok:
      fs.existsSync(envPath) &&
      fs.readFileSync(envPath, "utf8").includes(
        "PROJECT_ASYLUM_INSTALLATION_MODE=observe-only"
      ),
    note: "Kurulum varsayılanı observe-only olmalı."
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
        postcheckComplete: checks.every((check) => check.ok),
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
      postcheck: "project-asylum-install",
      installMode: "observe-only",
      safeByDefault: true,
      remediationEnabled: false,
      checks
    },
    null,
    2
  )
);
