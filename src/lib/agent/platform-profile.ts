import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";

import type { PlatformLogSource, PlatformProfile } from "../../types/agent";

function detectOsFamily(platform: NodeJS.Platform): PlatformProfile["osFamily"] {
  if (platform === "darwin") {
    return "macos";
  }

  if (platform === "linux") {
    return "linux";
  }

  if (platform === "win32") {
    return "windows";
  }

  return "unknown";
}

type CandidateSource = Omit<PlatformLogSource, "exists">;

function commandAvailable(command: string): boolean {
  try {
    execSync(command, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });
    return true;
  } catch {
    return false;
  }
}

function isReadable(logPath: string): boolean {
  try {
    fs.accessSync(logPath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function uniqueById(sources: CandidateSource[]): CandidateSource[] {
  const seen = new Set<string>();
  return sources.filter((source) => {
    if (seen.has(source.id)) {
      return false;
    }

    seen.add(source.id);
    return true;
  });
}

function basePriority(source: CandidateSource): number {
  let score = 0;

  if (source.recommended) {
    score += 50;
  }

  if (source.category === "security") {
    score += 25;
  } else if (source.category === "system") {
    score += 18;
  } else if (source.category === "application") {
    score += 10;
  }

  if (source.sourceType === "file") {
    score += 20;
  } else if (source.sourceType === "command") {
    score += 16;
  } else if (source.sourceType === "directory") {
    score += 8;
  }

  if (source.detectionMethod === "command-fallback") {
    score -= 4;
  }

  return score;
}

function candidateLogSources(
  osFamily: PlatformProfile["osFamily"],
  homeDir: string
): CandidateSource[] {
  switch (osFamily) {
    case "macos":
      return uniqueById([
        {
          id: "macos-system-log",
          category: "system",
          label: "macOS System Log",
          path: "/var/log/system.log",
          sourceType: "file",
          detectionMethod: "known-path",
          recommended: true
        },
        {
          id: "macos-install-log",
          category: "installer",
          label: "macOS Install Log",
          path: "/var/log/install.log",
          sourceType: "file",
          detectionMethod: "known-path",
          recommended: false
        },
        {
          id: "macos-app-logs",
          category: "application",
          label: "macOS User Logs",
          path: path.join(homeDir, "Library", "Logs"),
          sourceType: "directory",
          detectionMethod: "user-home",
          recommended: true
        },
        {
          id: "macos-unified-log",
          category: "system",
          label: "macOS Unified Log Command",
          path: "log show",
          sourceType: "command",
          command: "log show --style compact --last 5m | tail -n 20",
          detectionMethod: "command-fallback",
          recommended: true
        }
      ]);
    case "linux":
      return uniqueById([
        {
          id: "linux-auth-log",
          category: "security",
          label: "Linux Auth Log",
          path: "/var/log/auth.log",
          sourceType: "file",
          detectionMethod: "known-path",
          recommended: true
        },
        {
          id: "linux-secure-log",
          category: "security",
          label: "Linux Secure Log",
          path: "/var/log/secure",
          sourceType: "file",
          detectionMethod: "known-path",
          recommended: true
        },
        {
          id: "linux-syslog",
          category: "system",
          label: "Linux Syslog",
          path: "/var/log/syslog",
          sourceType: "file",
          detectionMethod: "known-path",
          recommended: true
        },
        {
          id: "linux-messages",
          category: "system",
          label: "Linux Messages Log",
          path: "/var/log/messages",
          sourceType: "file",
          detectionMethod: "known-path",
          recommended: false
        },
        {
          id: "linux-journal-dir",
          category: "system",
          label: "systemd Journal Directory",
          path: "/var/log/journal",
          sourceType: "directory",
          detectionMethod: "known-path",
          recommended: false
        },
        {
          id: "linux-journalctl",
          category: "system",
          label: "journalctl Command",
          path: "journalctl",
          sourceType: "command",
          command: "journalctl -n 20 --no-pager",
          detectionMethod: "command-fallback",
          recommended: true
        }
      ]);
    case "windows":
      return uniqueById([
        {
          id: "windows-event-logs",
          category: "system",
          label: "Windows Event Logs",
          path: "C:\\Windows\\System32\\winevt\\Logs",
          sourceType: "directory",
          detectionMethod: "known-path",
          recommended: true
        },
        {
          id: "windows-powershell-logs",
          category: "application",
          label: "Windows PowerShell Logs",
          path: "C:\\Windows\\System32\\Winevt\\Logs\\Windows PowerShell.evtx",
          sourceType: "file",
          detectionMethod: "known-path",
          recommended: false
        },
        {
          id: "windows-defender-logs",
          category: "security",
          label: "Windows Defender Logs",
          path: "C:\\ProgramData\\Microsoft\\Windows Defender\\Support",
          sourceType: "directory",
          detectionMethod: "known-path",
          recommended: true
        },
        {
          id: "windows-wevtutil",
          category: "system",
          label: "Windows Event Query Command",
          path: "wevtutil",
          sourceType: "command",
          command: "wevtutil qe Security /c:10 /rd:true /f:text",
          detectionMethod: "command-fallback",
          recommended: true
        }
      ]);
    default:
      return [
        {
          id: "generic-home-logs",
          category: "application",
          label: "User Home Logs",
          path: path.join(homeDir, "logs"),
          sourceType: "directory",
          detectionMethod: "user-home",
          recommended: false
        }
      ];
  }
}

function hydrateLogSource(source: CandidateSource): PlatformLogSource {
  if (source.sourceType === "command") {
    const command =
      source.path === "log show"
        ? "command -v log"
        : source.path === "journalctl"
          ? "command -v journalctl"
          : source.path === "wevtutil"
            ? "where wevtutil"
            : `command -v "${source.path}"`;

    const available = commandAvailable(command);

    return {
      ...source,
      exists: available,
      readable: available,
      priorityScore: available ? basePriority(source) : 0
    };
  }

  const exists = fs.existsSync(source.path);
  const readable = exists ? isReadable(source.path) : false;
  const score = exists
    ? basePriority(source) + (readable ? 12 : -12)
    : 0;

  return {
    ...source,
    exists,
    readable,
    priorityScore: score
  };
}

function markPreferred(sources: PlatformLogSource[]): PlatformLogSource[] {
  const sorted = [...sources].sort((left, right) => {
    const scoreDelta = (right.priorityScore ?? 0) - (left.priorityScore ?? 0);
    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    return left.label.localeCompare(right.label);
  });

  const preferredId =
    sorted.find((source) => source.exists && source.readable !== false)?.id ?? null;

  return sources.map((source) => ({
    ...source,
    preferred: preferredId !== null && source.id === preferredId
  }));
}

export function detectPlatformProfile(): PlatformProfile {
  const platform = os.platform();
  const osFamily = detectOsFamily(platform);
  const homeDir = os.homedir();

  const logSources = markPreferred(
    candidateLogSources(osFamily, homeDir).map(hydrateLogSource)
  );

  return {
    osFamily,
    platform,
    architecture: os.arch(),
    hostname: os.hostname(),
    homeDir,
    logSources
  };
}
