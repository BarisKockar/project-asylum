import fs from "node:fs";
import path from "node:path";

import type {
  PolicyDecisionExplanation,
  PolicyDecisionDetail,
  PromptAnalysis,
  PromptExecution,
  PromptExecutionReport
} from "../../types/agent";
import {
  buildPolicyDecisionExplanation
} from "../../lib/agent/policy-engine";
import {
  analyzePrompt,
  executePrompt,
  getExecutionStatusSummary,
  getPromptExecutionReport,
  getTrustTrendSummary,
  listPromptExecutions
} from "../../lib/agent/prompt-engine";
import type { PlatformProfile } from "../../types/agent";

export type SystemSummary = {
  status: string;
  host: string;
  mode: string;
  policyProfile: string;
  policyPosture: string;
  policyExplanation: string;
  policyDecisionSummary: string;
  policyDecisionLines: string[];
  policyDecisionDetails: PolicyDecisionDetail[];
  primaryBlockerReason: PolicyDecisionDetail | null;
  confidenceScore: number;
  automationEligibility: string;
  coverage: string[];
  lastCollectorRun: string;
  executionTotals: {
    total: number;
    completed: number;
    needsTriage: number;
    awaitingApproval: number;
  };
  trustTrend: {
    totalRecords: number;
    topEnvironmentKey: string | null;
    weakestActionKey: string | null;
    topEnvironmentRatio: number;
    weakestActionRatio: number;
  };
  telemetry: {
    sampledLogSourceCount: number;
    securitySignalCount: number;
    topLogSourceLabel: string | null;
    preferredLogSourceLabel: string | null;
    fallbackLogSourceLabel: string | null;
  };
  exposure: {
    openPortCount: number;
    highlightedPorts: number[];
    bruteForceSignalCount: number;
    attentionCount: number;
    attackerIps: string[];
    portRecommendations: string[];
    topRecommendation: string | null;
  };
  installation: {
    ready: boolean;
    setupComplete: boolean;
    bootstrapComplete: boolean;
    doctorComplete: boolean;
    postcheckComplete: boolean;
    sourcePaths: Array<{
      label: string;
      path: string;
      status: "pending" | "detected";
    }>;
  };
};

export type CognitiveSummary = {
  critique: string;
  decision: string;
  outcome: string;
  blocker: string;
  policyProfile: string;
  policyPosture: string;
  policyExplanation: string;
  policyDecisionSummary: string;
  policyDecisionLines: string[];
  policyDecisionDetails: PolicyDecisionDetail[];
  primaryBlockerReason: PolicyDecisionDetail | null;
  confidenceScore: number;
  automationEligibility: string;
  approvalRequirementReason: string;
  confidence: number;
  signals: string[];
  reasoning: Array<{
    label: string;
    value: string;
    note: string;
  }>;
  trustTrend: {
    topActionKey: string | null;
    weakestEnvironmentKey: string | null;
    topActionRatio: number;
    weakestEnvironmentRatio: number;
    recentTrustSignals: string[];
  };
  telemetry: {
    sampledLogSourceCount: number;
    securitySignalCount: number;
    sampledLogSources: string[];
    securitySignals: string[];
    preferredLogSourceLabel: string | null;
    fallbackLogSourceLabel: string | null;
  };
  exposure: {
    openPorts: number[];
    highlightedPorts: number[];
    bruteForceSignals: string[];
    problemSignals: string[];
    attackerIps: string[];
    portRecommendations: string[];
    immediateActions: string[];
  };
};

export type { PromptAnalysis, PromptExecution, PromptExecutionReport };

const bootstrapProfilePath = path.join(
  process.cwd(),
  "release",
  "bootstrap-profile.json"
);
const installStatePath = path.join(
  process.cwd(),
  "release",
  "install-state.json"
);
const envPath = path.join(process.cwd(), ".env");
const installManifestPath = path.join(
  process.cwd(),
  "release",
  "install-manifest.json"
);

function extractAttackerIps(signals: string[]): string[] {
  const matches = signals.flatMap((signal) =>
    Array.from(signal.matchAll(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g)).map(
      (match) => match[0]
    )
  );

  return [...new Set(matches)];
}

function buildPortRecommendations(ports: number[]): string[] {
  return ports.map((port) => {
    if (port === 22) {
      return "Port 22 sadece gerekli yonetim IP'lerine acik olmali; gerekmiyorsa kapat veya allowlist uygula.";
    }

    if ([8080, 8443, 9000].includes(port)) {
      return `Port ${port} yonetim veya panel yuzeyi olabilir; public erisimi kaldirip reverse proxy veya VPN arkasina al.`;
    }

    if ([9200, 5601].includes(port)) {
      return `Port ${port} gozetim/veri paneli olabilir; dis dunyaya kapat ve sadece ic agdan erisime izin ver.`;
    }

    return `Port ${port} icin servisin gerekli olup olmadigini dogrula; gereksizse dinlemeyi kapat veya firewall ile sinirla.`;
  });
}

function buildImmediateActions(args: {
  attackerIps: string[];
  highlightedPorts: number[];
  blocker: string | null;
  bruteForceSignals: string[];
}): string[] {
  const actions: string[] = [];

  if (args.attackerIps.length > 0) {
    actions.push(
      `Supheli IP'ler (${args.attackerIps.join(", ")}) icin gecici firewall/WAF bloklama veya rate limit uygula.`
    );
  }

  if (args.highlightedPorts.length > 0) {
    actions.push(
      `Port ${args.highlightedPorts.join(", ")} uzerindeki servisleri gozden gecir; public erisimi kaldir veya allowlist uygula.`
    );
  }

  if (args.bruteForceSignals.length > 0) {
    actions.push(
      "Authentication loglarini yakindan izle; MFA, fail2ban benzeri koruma ve rate limiting degerlendir."
    );
  }

  if (args.blocker) {
    actions.push(
      `Policy tarafinda bekleyen ana konu: ${args.blocker}. Bu alan dogrulanmadan otomatik aksiyona gecme.`
    );
  }

  return actions;
}

function readBootstrappedPlatformProfile(): PlatformProfile | null {
  if (!fs.existsSync(bootstrapProfilePath)) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      fs.readFileSync(bootstrapProfilePath, "utf8")
    ) as { platformProfile?: PlatformProfile };

    return parsed.platformProfile ?? null;
  } catch {
    return null;
  }
}

function readInstallationState() {
  const persistedState = fs.existsSync(installStatePath)
    ? (JSON.parse(fs.readFileSync(installStatePath, "utf8")) as {
        setupComplete?: boolean;
        bootstrapComplete?: boolean;
        doctorComplete?: boolean;
        postcheckComplete?: boolean;
      })
    : null;
  const setupComplete =
    persistedState?.setupComplete === true &&
    fs.existsSync(envPath) &&
    fs.existsSync(installManifestPath);
  const platformProfile = readBootstrappedPlatformProfile();
  const bootstrapComplete =
    persistedState?.bootstrapComplete === true && platformProfile !== null;
  const doctorComplete = persistedState?.doctorComplete === true;
  const postcheckComplete = persistedState?.postcheckComplete === true;

  const sourcePaths =
    platformProfile?.logSources.map((source) => ({
      label: source.label,
      path: source.path,
      status: source.exists && source.readable !== false ? "detected" : "pending"
    })) ?? [
      {
        label: "Log kaynaklari",
        path: "Bootstrap sonrasi otomatik tespit edilecek",
        status: "pending" as const
      }
    ];

  return {
    ready: setupComplete && bootstrapComplete && doctorComplete && postcheckComplete,
    setupComplete,
    bootstrapComplete,
    doctorComplete,
    postcheckComplete,
    sourcePaths
  };
}

export function getSystemSummary(): SystemSummary {
  const executionSummary = getExecutionStatusSummary();
  const policyInsight = latestPolicyInsight();
  const policyDecision = latestPolicyDecision();
  const trustTrend = getTrustTrendSummary();
  const telemetry = latestTelemetryObservation();
  const platformProfile = readBootstrappedPlatformProfile();
  const preferredLogSource =
    platformProfile?.logSources.find((source) => source.preferred) ?? null;
  const fallbackLogSource =
    platformProfile?.logSources.find(
      (source) => !source.preferred && source.exists && source.readable !== false
    ) ?? null;
  const report = latestExecutionReport();
  const networkObservation = latestNetworkObservation();
  const sampledLogSources = Array.isArray(telemetry?.metadata?.sampledLogSources)
    ? telemetry.metadata.sampledLogSources
    : [];
  const securitySignals = Array.isArray(telemetry?.metadata?.securitySignals)
    ? telemetry.metadata.securitySignals.filter(
        (value): value is string => typeof value === "string"
      )
    : [];
  const ports = Array.isArray(networkObservation?.metadata?.ports)
    ? networkObservation.metadata.ports.filter(
        (value): value is number => typeof value === "number"
      )
    : [];
  const reviewPorts = Array.isArray(networkObservation?.metadata?.reviewPorts)
    ? networkObservation.metadata.reviewPorts.filter(
        (value): value is number => typeof value === "number"
      )
    : [];
  const bruteForceSignals = securitySignals.filter((signal) =>
    /failed password|authentication failure|invalid user/i.test(signal)
  );
  const attackerIps = extractAttackerIps(bruteForceSignals);
  const portRecommendations = buildPortRecommendations(reviewPorts);
  const attentionCount =
    reviewPorts.length +
    bruteForceSignals.length +
    (report?.decision.blockers.length ?? 0) +
    (report?.risks.filter((risk) => ["critical", "high"].includes(risk.severity))
      .length ?? 0);
  const installation = readInstallationState();

  return {
    status: executionSummary.needsTriage > 0 ? "attention-needed" : "healthy",
    host: "localhost",
    mode: "local-first / API'siz",
    policyProfile: executionsPolicyProfile(),
    policyPosture: latestPolicyInsight()?.posture ?? "balanced",
    policyExplanation:
      policyInsight?.explanation ??
      "Aktif policy profili karar zincirini dengeli yorumluyor.",
    policyDecisionSummary: policyDecision.summary,
    policyDecisionLines: policyDecision.details,
    policyDecisionDetails: policyDecision.structuredDetails,
    primaryBlockerReason: policyDecision.primaryBlockerReason,
    confidenceScore: latestExecutionReport()?.trust?.confidenceScore ?? 0,
    automationEligibility:
      latestExecutionReport()?.trust?.automationEligibility ?? "observe-only",
    coverage: ["configuration", "process", "identity", "network", "runtime"],
    lastCollectorRun:
      executionSummary.lastExecutionAt ?? new Date().toISOString(),
    executionTotals: {
      total: executionSummary.total,
      completed: executionSummary.completed,
      needsTriage: executionSummary.needsTriage,
      awaitingApproval: executionSummary.awaitingApproval
    },
    trustTrend: {
      totalRecords: trustTrend.totalRecords,
      topEnvironmentKey: trustTrend.topEnvironment?.key ?? null,
      weakestActionKey: trustTrend.weakestAction?.key ?? null,
      topEnvironmentRatio: trustTrend.topEnvironment?.trustRatio ?? 0,
      weakestActionRatio: trustTrend.weakestAction?.trustRatio ?? 0
    },
    telemetry: {
      sampledLogSourceCount: sampledLogSources.length,
      securitySignalCount: securitySignals.length,
      topLogSourceLabel:
        typeof sampledLogSources[0]?.label === "string"
          ? sampledLogSources[0].label
          : null,
      preferredLogSourceLabel: preferredLogSource?.label ?? null,
      fallbackLogSourceLabel: fallbackLogSource?.label ?? null
    },
    exposure: {
      openPortCount: ports.length,
      highlightedPorts: reviewPorts,
      bruteForceSignalCount: bruteForceSignals.length,
      attentionCount,
      attackerIps,
      portRecommendations,
      topRecommendation: portRecommendations[0] ?? null
    },
    installation
  };
}

function executionsPolicyProfile(): string {
  const latestExecution = listPromptExecutions()[0];
  return latestExecution?.policyProfile ?? "default";
}

function latestPolicyInsight() {
  const latestExecution = listPromptExecutions()[0];
  const latestReport = latestExecution
    ? getPromptExecutionReport(latestExecution.id)
    : null;

  return latestReport?.policyInsight ?? null;
}

function latestExecutionReport() {
  const latestExecution = listPromptExecutions()[0];
  return latestExecution
    ? getPromptExecutionReport(latestExecution.id)
    : null;
}

function latestTelemetryObservation() {
  const report = latestExecutionReport();
  return report?.observations.find((observation) => observation.kind === "telemetry") ?? null;
}

function latestNetworkObservation() {
  const report = latestExecutionReport();
  return report?.observations.find(
    (observation) => observation.kind === "network-surface"
  ) ?? null;
}

function latestPolicyDecision(): PolicyDecisionExplanation {
  return buildPolicyDecisionExplanation(latestPolicyInsight());
}

export function getCognitiveSummary(): CognitiveSummary {
  const executions = listPromptExecutions();
  const latestExecution = executions[0];
  const latestReport = latestExecution
    ? getPromptExecutionReport(latestExecution.id)
    : null;
  const policyDecision = buildPolicyDecisionExplanation(
    latestReport?.policyInsight
  );
  const trustTrend = getTrustTrendSummary();
  const telemetry = latestTelemetryObservation();
  const platformProfile = readBootstrappedPlatformProfile();
  const preferredLogSource =
    platformProfile?.logSources.find((source) => source.preferred) ?? null;
  const fallbackLogSource =
    platformProfile?.logSources.find(
      (source) => !source.preferred && source.exists && source.readable !== false
    ) ?? null;
  const networkObservation = latestNetworkObservation();
  const sampledLogSources = Array.isArray(telemetry?.metadata?.sampledLogSources)
    ? telemetry.metadata.sampledLogSources
        .map((value) =>
          typeof value?.label === "string" ? value.label : null
        )
        .filter((value): value is string => typeof value === "string")
    : [];
  const securitySignals = Array.isArray(telemetry?.metadata?.securitySignals)
    ? telemetry.metadata.securitySignals.filter(
        (value): value is string => typeof value === "string"
      )
    : [];
  const openPorts = Array.isArray(networkObservation?.metadata?.ports)
    ? networkObservation.metadata.ports.filter(
        (value): value is number => typeof value === "number"
      )
    : [];
  const highlightedPorts = Array.isArray(networkObservation?.metadata?.reviewPorts)
    ? networkObservation.metadata.reviewPorts.filter(
        (value): value is number => typeof value === "number"
      )
    : [];
  const bruteForceSignals = securitySignals.filter((signal) =>
    /failed password|authentication failure|invalid user/i.test(signal)
  );
  const attackerIps = extractAttackerIps(bruteForceSignals);
  const portRecommendations = buildPortRecommendations(highlightedPorts);
  const problemSignals = [
    ...new Set([
      ...(latestReport?.decision.blockers ?? []),
      ...highlightedPorts.map((port) => `review-port:${port}`),
      ...securitySignals.slice(0, 3)
    ])
  ];
  const immediateActions = buildImmediateActions({
    attackerIps,
    highlightedPorts,
    blocker: latestReport?.decision.blockers[0] ?? null,
    bruteForceSignals
  });

  return {
    critique: latestReport?.critic.verdict ?? "unknown",
    decision: latestReport?.decision.status ?? "idle",
    outcome:
      latestReport?.decision.status === "completed"
        ? "progressing"
        : latestReport?.decision.status === "needs-triage"
          ? "triage-required"
          : latestReport?.decision.status === "awaiting-approval"
            ? "approval-required"
            : "idle",
    blocker: latestReport?.decision.blockers[0] ?? "none",
    policyProfile:
      latestReport?.policyProfile ??
      latestExecution?.policyProfile ??
      "default",
    policyPosture: latestReport?.policyInsight?.posture ?? "balanced",
    policyExplanation:
      latestReport?.policyInsight?.explanation ??
      "Aktif policy profili karar zincirini dengeli yorumluyor.",
    policyDecisionSummary: policyDecision.summary,
    policyDecisionLines: policyDecision.details,
    policyDecisionDetails: policyDecision.structuredDetails,
    primaryBlockerReason: policyDecision.primaryBlockerReason,
    confidenceScore: latestReport?.trust?.confidenceScore ?? 0,
    automationEligibility:
      latestReport?.trust?.automationEligibility ?? "observe-only",
    approvalRequirementReason:
      latestReport?.trust?.approvalRequirementReason ??
      "Approval gerekçesi henüz hesaplanmadı.",
    confidence: latestReport?.reasoning.belief.confidence ?? 0,
    signals: latestReport?.reasoning.belief.supportingKinds ?? [],
    reasoning: [
      {
        label: "Critique",
        value: latestReport?.critic.verdict ?? "unknown",
        note:
          latestReport?.critic.summary ?? "Henüz çalışan bir critic özeti yok."
      },
      {
        label: "Decision",
        value: latestReport?.decision.status ?? "idle",
        note:
          latestReport?.decision.rationale ??
          "Henüz üretilmiş bir karar izi bulunmuyor."
      },
      {
        label: "Outcome",
        value:
          latestReport?.plan.objective ??
          latestExecution?.prompt ??
          "Henüz hedef planı yok",
        note:
          latestReport?.decision.nextStep ?? "Sonraki adım henüz hesaplanmadı."
      }
    ],
    trustTrend: {
      topActionKey: trustTrend.topAction?.key ?? null,
      weakestEnvironmentKey: trustTrend.weakestEnvironment?.key ?? null,
      topActionRatio: trustTrend.topAction?.trustRatio ?? 0,
      weakestEnvironmentRatio: trustTrend.weakestEnvironment?.trustRatio ?? 0,
      recentTrustSignals:
        trustTrend.recentRecords.map(
          (record) =>
            `${record.scope}:${record.key} success=${record.successCount} triage=${record.triageCount}`
        ) ?? []
    },
    telemetry: {
      sampledLogSourceCount: sampledLogSources.length,
      securitySignalCount: securitySignals.length,
      sampledLogSources,
      securitySignals,
      preferredLogSourceLabel: preferredLogSource?.label ?? null,
      fallbackLogSourceLabel: fallbackLogSource?.label ?? null
    },
    exposure: {
      openPorts,
      highlightedPorts,
      bruteForceSignals,
      problemSignals,
      attackerIps,
      portRecommendations,
      immediateActions
    }
  };
}

export {
  analyzePrompt,
  executePrompt,
  getPromptExecutionReport,
  listPromptExecutions
};
