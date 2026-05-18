import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { appendInstallSessionLog } from "./install-session";

type PlatformFamily = "linux" | "macos" | "windows" | "unknown";

function getPlatformFamily(): PlatformFamily {
  switch (process.platform) {
    case "darwin":
      return "macos";
    case "win32":
      return "windows";
    case "linux":
      return "linux";
    default:
      return "unknown";
  }
}

function resolveBundledNode(): string | null {
  const explicitNode = process.env.PROJECT_ASYLUM_BUNDLED_NODE;
  if (explicitNode && fs.existsSync(explicitNode)) {
    return explicitNode;
  }

  return process.execPath && fs.existsSync(process.execPath) ? process.execPath : null;
}

function resolveBundledNpm(nodeBinary: string | null): string | null {
  if (!nodeBinary) {
    return null;
  }

  const candidateNames = process.platform === "win32" ? ["npm.cmd", "npm"] : ["npm"];
  const nodeDir = path.dirname(nodeBinary);

  for (const candidateName of candidateNames) {
    const candidatePath = path.join(nodeDir, candidateName);
    if (fs.existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  return null;
}

function safeNpmVersion(bundledNpm: string | null, bundledNode: string | null): string | null {
  const nodeDir = bundledNode ? path.dirname(bundledNode) : null;
  const env = nodeDir
    ? { ...process.env, PATH: `${nodeDir}${path.delimiter}${process.env.PATH ?? ""}` }
    : process.env;

  if (bundledNpm) {
    try {
      return execFileSync(bundledNpm, ["-v"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        env
      }).trim();
    } catch {
      // Fall back to system npm lookup below.
    }
  }

  try {
    return execFileSync(process.platform === "win32" ? "npm.cmd" : "npm", ["-v"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      env
    }).trim();
  } catch {
    return null;
  }
}

function buildInstallGuidance(platformFamily: PlatformFamily): string[] {
  if (platformFamily === "windows") {
    return [
      "Windows customer mode icin bundled runtime veya Node 20+ gereklidir.",
      "Node eksikse resmi Windows installer ile Node 20+ kur veya gelecekteki bundled Project Asylum paketiyle devam et."
    ];
  }

  if (platformFamily === "macos") {
    return [
      "macOS customer mode icin bundled runtime veya Node 20+ gereklidir.",
      "Node eksikse Homebrew, resmi pkg ya da ilerideki bundled Project Asylum paketi kullanilabilir."
    ];
  }

  if (platformFamily === "linux") {
    return [
      "Linux customer mode icin bundled runtime veya Node 20+ gereklidir.",
      "Node eksikse dagitim paket yoneticisi ya da bundled Project Asylum paketi kullanilabilir."
    ];
  }

  return [
    "Desteklenmeyen platform. Customer mode su an linux, macos ve windows icin hedefleniyor."
  ];
}

const nodeVersion = process.version;
const bundledNode = resolveBundledNode();
const bundledNpm = resolveBundledNpm(bundledNode);
const npmVersion = safeNpmVersion(bundledNpm, bundledNode);
const platformFamily = getPlatformFamily();
const majorNodeVersion = Number.parseInt(nodeVersion.replace(/^v/, "").split(".")[0] ?? "0", 10);
const nodeVersionSupported = Number.isFinite(majorNodeVersion) && majorNodeVersion >= 20;

const blockingIssues: string[] = [];
if (!nodeVersionSupported) {
  blockingIssues.push("Node 20+ gerekli.");
}

if (!npmVersion) {
  blockingIssues.push("npm bulunamadi.");
}

const readyForCustomerInstall = blockingIssues.length === 0;
const output = {
  installer: "project-asylum-preflight",
  installationProfile: "customer-mode",
  safeByDefault: true,
  remediationEnabled: false,
  platformFamily,
  platform: process.platform,
  architecture: process.arch,
  hostname: os.hostname(),
  runtime: {
    nodeVersion,
    npmVersion,
    bundledNpm,
    nodeVersionSupported
  },
  readyForCustomerInstall,
  blockingIssues,
  guidance: buildInstallGuidance(platformFamily),
  nextStep: readyForCustomerInstall
    ? "Customer mode kurulumu icin setup adimina gecilebilir."
    : "Node/npm ortami hazirlanmadan customer mode kurulumu baslatilmamali."
};

appendInstallSessionLog({
  step: "preflight",
  event: readyForCustomerInstall ? "completed" : "blocked",
  level: readyForCustomerInstall ? "info" : "error",
  payload: {
    platformFamily,
    architecture: process.arch,
    readyForCustomerInstall,
    blockingIssues
  }
});

console.log(JSON.stringify(output, null, 2));
