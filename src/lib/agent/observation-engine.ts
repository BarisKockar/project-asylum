import os from "node:os";
import { execSync } from "node:child_process";

import type { PromptAnalysis, PromptExecutionReport } from "../../types/agent";
import { detectPlatformProfile } from "./platform-profile";
import { getActiveSecurityKnowledgeProfile } from "./security-knowledge";

type ExecutionObservation = PromptExecutionReport["observations"][number];
type ListeningService = {
  process: string;
  pid: number | null;
  port: number | null;
  protocol: string;
};

function processBasename(processPath: string): string {
  // Handles both POSIX and Windows path separators so reviewProcessKeyword
  // matching works regardless of the collector's source format.
  const segments = processPath.split(/[\\/]/);
  return segments[segments.length - 1] ?? processPath;
}

function getCurrentOsFamily(): "macos" | "linux" | "windows" | "unknown" {
  if (process.platform === "darwin") {
    return "macos";
  }

  if (process.platform === "linux") {
    return "linux";
  }

  if (process.platform === "win32") {
    return "windows";
  }

  return "unknown";
}

function escapePowerShellSingleQuoted(value: string): string {
  return value.replace(/'/g, "''");
}

function detectPrimarySurface(analysis: PromptAnalysis): string {
  if (analysis.detectedTargets.includes("admin-panel")) {
    return "admin-surface";
  }

  if (analysis.detectedTargets.includes("network-surface")) {
    return "network-surface";
  }

  if (analysis.detectedTargets.includes("configuration")) {
    return "configuration";
  }

  return "general-security-surface";
}

function safeCommand(command: string): string {
  try {
    return execSync(command, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return "";
  }
}

function readLogPreview(source: {
  path: string;
  sourceType?: string;
  command?: string;
}): string[] {
  try {
    if (source.sourceType === "command" && source.command) {
      const output = execSync(source.command, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"]
      });

      return output
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(-10);
    }

    const family = getCurrentOsFamily();

    if (source.sourceType === "directory") {
      if (family === "windows") {
        const escaped = escapePowerShellSingleQuoted(source.path);
        const psCommand = `Get-ChildItem -Path '${escaped}' -File -ErrorAction SilentlyContinue | Select-Object -First 3 -ExpandProperty FullName`;
        const output = execSync(
          `powershell -NoProfile -NonInteractive -Command "${psCommand.replace(/"/g, '\\"')}"`,
          { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
        );

        return output
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .slice(0, 5);
      }

      const output = execSync(`find "${source.path}" -type f | head -n 3`, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"]
      });

      return output
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 5);
    }

    if (family === "windows") {
      const escaped = escapePowerShellSingleQuoted(source.path);
      const psCommand = `Get-Content -Path '${escaped}' -Tail 5 -ErrorAction SilentlyContinue`;
      const output = execSync(
        `powershell -NoProfile -NonInteractive -Command "${psCommand.replace(/"/g, '\\"')}"`,
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
      );

      return output
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(-5);
    }

    const output = execSync(`tail -n 5 "${source.path}"`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });

    return output
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(-5);
  } catch {
    return [];
  }
}

function detectSecurityLogSignals(lines: string[]): string[] {
  const profile = getActiveSecurityKnowledgeProfile();
  const keywords = profile.logSecurityKeywords.map((keyword) =>
    keyword.toLowerCase()
  );

  return lines.filter((line) => {
    const normalized = line.toLowerCase();
    return keywords.some((keyword) => normalized.includes(keyword));
  });
}

function parseListeningServices(output: string): ListeningService[] {
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s+/);
      const name = parts[0] ?? "unknown";
      const pidValue = Number(parts[1]);
      const endpoint = parts.slice(8).join(" ");
      const portMatch = endpoint.match(/:(\d+)\s+\(LISTEN\)/);

      return {
        process: name,
        pid: Number.isFinite(pidValue) ? pidValue : null,
        port: portMatch ? Number(portMatch[1]) : null,
        protocol: endpoint.includes("TCP6") ? "tcp6" : "tcp"
      };
    });
}

// Windows `netstat -ano` listing example (English locale):
//   Proto  Local Address          Foreign Address        State           PID
//   TCP    0.0.0.0:135            0.0.0.0:0              LISTENING       1234
// The parser tolerates IPv6 brackets and falls back to "unknown" for the
// process name because netstat does not surface it — operators can join
// against `tasklist /FI "PID eq 1234"` separately if they need names.
// Exported so unit tests can exercise the Windows path on a non-Windows host.
export function parseNetstatListening(output: string): ListeningService[] {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => /LISTENING/i.test(line) && /^(TCP|TCPv?6)/i.test(line))
    .map((line) => {
      const parts = line.split(/\s+/);
      const protoRaw = parts[0] ?? "tcp";
      const local = parts[1] ?? "";
      const pidValue = Number(parts[parts.length - 1]);

      const lastColon = local.lastIndexOf(":");
      const portStr = lastColon >= 0 ? local.slice(lastColon + 1) : "";
      const portNumber = Number(portStr);

      return {
        process: "unknown",
        pid: Number.isFinite(pidValue) ? pidValue : null,
        port: Number.isFinite(portNumber) ? portNumber : null,
        protocol: protoRaw.toLowerCase().includes("6") ? "tcp6" : "tcp"
      };
    });
}

function collectProcessLines(): string[] {
  const family = getCurrentOsFamily();

  if (family === "windows") {
    // PowerShell Get-Process surfaces process names without requiring admin
    // privileges. We limit to 12 to mirror the POSIX `sed -n '2,12p'` bound.
    const psCommand =
      "Get-Process | Select-Object -First 12 -ExpandProperty ProcessName";
    return safeCommand(
      `powershell -NoProfile -NonInteractive -Command "${psCommand}"`
    )
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  return safeCommand("ps -axo comm | sed -n '2,12p'")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function collectProcessObservation(): ExecutionObservation {
  const profile = getActiveSecurityKnowledgeProfile();
  const processLines = collectProcessLines();
  const reviewProcesses = processLines.filter((line) =>
    profile.reviewProcessKeywords.includes(processBasename(line))
  );

  return {
    kind: "process-surface",
    detail: processLines.length
      ? `Ilk gorunen surecler: ${processLines.slice(0, 5).join(", ")}.`
      : "Surec listesi okunamadi veya sinirli ortam nedeniyle gorunur veri alinmadi.",
    confidence: processLines.length ? 0.78 : 0.46,
    metadata: {
      osFamily: getCurrentOsFamily(),
      sampledProcesses: processLines.slice(0, 8),
      sampledCount: processLines.length,
      reviewProcesses
    }
  };
}

function collectListeningServicesByPlatform(): {
  raw: string;
  services: ListeningService[];
  lineSummaries: string[];
} {
  const family = getCurrentOsFamily();

  if (family === "windows") {
    const raw = safeCommand("netstat -ano");
    const services = parseNetstatListening(raw).slice(0, 8);
    const lineSummaries = services.map((service) =>
      `${service.protocol}:${service.port ?? "?"}`
    );
    return { raw, services, lineSummaries };
  }

  const raw = safeCommand("lsof -nP -iTCP -sTCP:LISTEN | sed -n '2,8p'");
  const services = parseListeningServices(raw);
  const lineSummaries = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/\s+/).slice(0, 2).join(":"));
  return { raw, services, lineSummaries };
}

export function collectNetworkObservation(): ExecutionObservation {
  const profile = getActiveSecurityKnowledgeProfile();
  const { services: listeningServices, lineSummaries } =
    collectListeningServicesByPlatform();
  const ports = listeningServices
    .map((service) => service.port)
    .filter((port): port is number => typeof port === "number");
  const reviewPorts = ports.filter((port) =>
    profile.reviewPorts.includes(port)
  );

  return {
    kind: "network-surface",
    detail: lineSummaries.length
      ? `Dinleyen servis ornekleri: ${lineSummaries.slice(0, 4).join(", ")}.`
      : "Dinleyen port bilgisi okunamadi veya yetki kisiti nedeniyle sinirli kaldi.",
    confidence: lineSummaries.length ? 0.81 : 0.43,
    metadata: {
      osFamily: getCurrentOsFamily(),
      listeningServices,
      ports,
      reviewPorts,
      sampledCount: listeningServices.length
    }
  };
}

export function collectConfigObservation(): ExecutionObservation {
  const shellValue = process.env.SHELL ?? "unknown-shell";
  const rawNodeEnv = process.env.NODE_ENV;
  const nodeEnvValue = rawNodeEnv ? String(rawNodeEnv) : "unset";
  const homeValue = process.env.HOME ?? "unknown-home";
  const riskySignals = [
    nodeEnvValue === "development" || nodeEnvValue === "unset"
      ? `NODE_ENV=${nodeEnvValue}`
      : null,
    shellValue.includes("zsh") || shellValue.includes("bash")
      ? `interactive-shell=${shellValue}`
      : null,
    homeValue.includes("/Users/") ? "user-home-scope" : null
  ].filter(Boolean);

  return {
    kind: "configuration",
    detail: `Yerel config sinyali: SHELL=${shellValue}, NODE_ENV=${nodeEnvValue}, HOME=${homeValue}.`,
    confidence: 0.72,
    metadata: {
      shell: shellValue,
      nodeEnv: nodeEnvValue,
      home: homeValue,
      riskySignals
    }
  };
}

export function collectLogObservation(): ExecutionObservation {
  const profile = detectPlatformProfile();
  const existingSources = profile.logSources
    .filter((source) => source.exists && source.readable !== false)
    .sort((left, right) => {
      if (left.preferred && !right.preferred) {
        return -1;
      }

      if (!left.preferred && right.preferred) {
        return 1;
      }

      return (right.priorityScore ?? 0) - (left.priorityScore ?? 0);
    });
  const sampledSources = existingSources.slice(0, 2);
  const previews = sampledSources.map((source) => ({
    id: source.id,
    path: source.path,
    lines: readLogPreview(source)
  }));
  const previewLines = previews.flatMap((preview) => preview.lines);
  const securitySignals = detectSecurityLogSignals(previewLines);

  return {
    kind: "telemetry",
    detail: sampledSources.length
      ? `Log kaynaklari tarandi: ${sampledSources.map((source) => source.label).join(", ")}.`
      : "Uygun log kaynağı bulunamadı veya erişim sağlanamadı.",
    confidence: sampledSources.length ? 0.69 : 0.34,
    metadata: {
      osFamily: profile.osFamily,
      sampledLogSources: sampledSources.map((source) => ({
        id: source.id,
        label: source.label,
        path: source.path,
        category: source.category,
        sourceType: source.sourceType,
        detectionMethod: source.detectionMethod,
        priorityScore: source.priorityScore,
        preferred: source.preferred
      })),
      previewLines: previewLines.slice(0, 10),
      securitySignals
    }
  };
}

export function collectExecutionObservations(
  analysis: PromptAnalysis
): ExecutionObservation[] {
  const uptimeSeconds = Math.max(0, Math.round(os.uptime()));
  const hostname = os.hostname();
  const interfaces = Object.keys(os.networkInterfaces()).filter(Boolean);
  const cpuCount = os.cpus().length;
  const primarySurface = detectPrimarySurface(analysis);

  return [
    {
      kind: primarySurface,
      detail: `${analysis.normalizedGoal} istegi ${primarySurface} odaginda sinyal toplamayi gerektiriyor.`,
      confidence: analysis.urgency === "high" ? 0.8 : 0.67
    },
    collectProcessObservation(),
    collectNetworkObservation(),
    collectConfigObservation(),
    collectLogObservation(),
    {
      kind: "host-runtime",
      detail: `Host ${hostname} uzerinde ${cpuCount} CPU cekirdegi ve ${interfaces.length} gorunen arayuz tespit edildi. Uptime ${uptimeSeconds} saniye.`,
      confidence: 0.88,
      metadata: {
        hostname,
        cpuCount,
        interfaces,
        uptimeSeconds
      }
    },
    {
      kind: "policy",
      detail:
        analysis.constraints.length > 0
          ? `Aktif kisitlar: ${analysis.constraints.join(", ")}.`
          : "Bu istek icin belirgin bir politika kisiti cikmadi.",
      confidence: 0.84,
      metadata: {
        constraints: analysis.constraints
      }
    },
    {
      kind: "plan",
      detail: analysis.planSummary,
      confidence: 0.74,
      metadata: {
        mode: analysis.suggestedMode,
        urgency: analysis.urgency,
        targets: analysis.detectedTargets
      }
    }
  ];
}

export function collectRuntimeSnapshotObservation(): ExecutionObservation {
  const uptimeSeconds = Math.max(0, Math.round(os.uptime()));
  const hostname = os.hostname();
  const interfaces = Object.keys(os.networkInterfaces()).filter(Boolean);
  const cpuCount = os.cpus().length;

  return {
    kind: "host-runtime",
    detail: `Runtime snapshot: host ${hostname}, CPU ${cpuCount}, arayuz ${interfaces.length}, uptime ${uptimeSeconds} saniye.`,
    confidence: 0.88,
    metadata: {
      hostname,
      cpuCount,
      interfaces,
      uptimeSeconds
    }
  };
}
