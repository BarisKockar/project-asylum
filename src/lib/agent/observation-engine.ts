import os from "node:os";
import { execSync } from "node:child_process";

import type { PromptAnalysis, PromptExecutionReport } from "../../types/agent";

type ExecutionObservation = PromptExecutionReport["observations"][number];
type ListeningService = {
  process: string;
  pid: number | null;
  port: number | null;
  protocol: string;
};

const REVIEW_PROCESS_KEYWORDS = [
  "nc",
  "ncat",
  "netcat",
  "socat",
  "tcpdump",
  "wireshark",
  "mitmproxy",
  "frida"
];

function processBasename(processPath: string): string {
  const segments = processPath.split("/");
  return segments[segments.length - 1] ?? processPath;
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

export function collectProcessObservation(): ExecutionObservation {
  const processLines = safeCommand("ps -axo comm | sed -n '2,12p'")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const reviewProcesses = processLines.filter((line) =>
    REVIEW_PROCESS_KEYWORDS.includes(processBasename(line))
  );

  return {
    kind: "process-surface",
    detail: processLines.length
      ? `Ilk gorunen surecler: ${processLines.slice(0, 5).join(", ")}.`
      : "Surec listesi okunamadi veya sinirli ortam nedeniyle gorunur veri alinmadi.",
    confidence: processLines.length ? 0.78 : 0.46,
    metadata: {
      sampledProcesses: processLines.slice(0, 8),
      sampledCount: processLines.length,
      reviewProcesses
    }
  };
}

export function collectNetworkObservation(): ExecutionObservation {
  const listeningOutput = safeCommand(
    "lsof -nP -iTCP -sTCP:LISTEN | sed -n '2,8p'"
  );
  const listeningLines = listeningOutput
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const listeningServices = parseListeningServices(listeningOutput);
  const ports = listeningServices
    .map((service) => service.port)
    .filter((port): port is number => typeof port === "number");
  const reviewPorts = ports.filter((port) =>
    [22, 2375, 2376, 3306, 5432, 5601, 6379, 8000, 8080, 8443, 9000, 9200].includes(
      port
    )
  );

  return {
    kind: "network-surface",
    detail: listeningLines.length
      ? `Dinleyen servis ornekleri: ${listeningLines
          .map((line) => line.split(/\s+/).slice(0, 2).join(":"))
          .slice(0, 4)
          .join(", ")}.`
      : "Dinleyen port bilgisi okunamadi veya yetki kisiti nedeniyle sinirli kaldi.",
    confidence: listeningLines.length ? 0.81 : 0.43,
    metadata: {
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
