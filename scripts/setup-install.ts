import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dataDir = path.join(root, "data");
const envExamplePath = path.join(root, ".env.example");
const envPath = path.join(root, ".env");
const releaseDir = path.join(root, "release");
const manifestPath = path.join(releaseDir, "install-manifest.json");
const bootstrapProfilePath = path.join(releaseDir, "bootstrap-profile.json");
const installStatePath = path.join(releaseDir, "install-state.json");

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(releaseDir, { recursive: true });
if (fs.existsSync(bootstrapProfilePath)) {
  fs.rmSync(bootstrapProfilePath);
}

if (process.env.PROJECT_ASYLUM_SKIP_INSTALL_STATE_WRITE !== "1") {
  fs.writeFileSync(
    installStatePath,
    JSON.stringify(
      {
        setupComplete: true,
        bootstrapComplete: false,
        doctorComplete: false,
        postcheckComplete: false,
        updatedAt: new Date().toISOString()
      },
      null,
      2
    ),
    "utf8"
  );
}

let envCreated = false;
if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  fs.copyFileSync(envExamplePath, envPath);
  envCreated = true;
}

const manifest = {
  package: "project-asylum",
  installMode: "observe-only",
  safeByDefault: true,
  remediationEnabled: false,
  createdAt: new Date().toISOString(),
  root,
  dataDir,
  envExamplePath,
  envPath,
  envCreated,
  nextCommands: [
    "npm install",
    "npm run install:bootstrap",
    "npm run install:doctor",
    "npm run install:postcheck",
    "npm test",
    "npm run dev"
  ]
};

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

console.log(JSON.stringify(manifest, null, 2));
