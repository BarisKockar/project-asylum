import fs from "node:fs";
import os from "node:os";
import path from "node:path";

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

function candidateLogSources(
  osFamily: PlatformProfile["osFamily"],
  homeDir: string
): Array<Omit<PlatformLogSource, "exists">> {
  switch (osFamily) {
    case "macos":
      return [
        {
          id: "macos-system-log",
          category: "system",
          label: "macOS System Log",
          path: "/var/log/system.log",
          recommended: true
        },
        {
          id: "macos-install-log",
          category: "installer",
          label: "macOS Install Log",
          path: "/var/log/install.log",
          recommended: false
        },
        {
          id: "macos-app-logs",
          category: "application",
          label: "macOS User Logs",
          path: path.join(homeDir, "Library", "Logs"),
          recommended: true
        }
      ];
    case "linux":
      return [
        {
          id: "linux-syslog",
          category: "system",
          label: "Linux Syslog",
          path: "/var/log/syslog",
          recommended: true
        },
        {
          id: "linux-auth-log",
          category: "security",
          label: "Linux Auth Log",
          path: "/var/log/auth.log",
          recommended: true
        },
        {
          id: "linux-journal",
          category: "system",
          label: "systemd Journal",
          path: "/var/log/journal",
          recommended: false
        }
      ];
    case "windows":
      return [
        {
          id: "windows-event-logs",
          category: "system",
          label: "Windows Event Logs",
          path: "C:\\Windows\\System32\\winevt\\Logs",
          recommended: true
        },
        {
          id: "windows-powershell-logs",
          category: "application",
          label: "Windows PowerShell Logs",
          path: "C:\\Windows\\System32\\Winevt\\Logs\\Windows PowerShell.evtx",
          recommended: false
        },
        {
          id: "windows-defender-logs",
          category: "security",
          label: "Windows Defender Logs",
          path: "C:\\ProgramData\\Microsoft\\Windows Defender\\Support",
          recommended: true
        }
      ];
    default:
      return [
        {
          id: "generic-home-logs",
          category: "application",
          label: "User Home Logs",
          path: path.join(homeDir, "logs"),
          recommended: false
        }
      ];
  }
}

function hydrateLogSource(
  source: Omit<PlatformLogSource, "exists">
): PlatformLogSource {
  return {
    ...source,
    exists: fs.existsSync(source.path)
  };
}

export function detectPlatformProfile(): PlatformProfile {
  const platform = os.platform();
  const osFamily = detectOsFamily(platform);
  const homeDir = os.homedir();

  return {
    osFamily,
    platform,
    architecture: os.arch(),
    hostname: os.hostname(),
    homeDir,
    logSources: candidateLogSources(osFamily, homeDir).map(hydrateLogSource)
  };
}
