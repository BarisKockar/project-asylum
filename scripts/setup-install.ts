import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dataDir = path.join(root, "data");
const envExamplePath = path.join(root, ".env.example");
const envPath = path.join(root, ".env");
const releaseDir = path.join(root, "release");
const manifestPath = path.join(releaseDir, "install-manifest.json");

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(releaseDir, { recursive: true });

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
