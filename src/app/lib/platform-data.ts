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
  };
  exposure: {
    openPortCount: number;
    highlightedPorts: number[];
    bruteForceSignalCount: number;
    attentionCount: number;
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
  };
  exposure: {
    openPorts: number[];
    highlightedPorts: number[];
    bruteForceSignals: string[];
    problemSignals: string[];
  };
};

export type { PromptAnalysis, PromptExecution, PromptExecutionReport };

export function getSystemSummary(): SystemSummary {
  const executionSummary = getExecutionStatusSummary();
  const policyInsight = latestPolicyInsight();
  const policyDecision = latestPolicyDecision();
  const trustTrend = getTrustTrendSummary();
  const telemetry = latestTelemetryObservation();
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
  const attentionCount =
    reviewPorts.length +
    bruteForceSignals.length +
    (report?.decision.blockers.length ?? 0) +
    (report?.risks.filter((risk) => ["critical", "high"].includes(risk.severity))
      .length ?? 0);

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
          : null
    },
    exposure: {
      openPortCount: ports.length,
      highlightedPorts: reviewPorts,
      bruteForceSignalCount: bruteForceSignals.length,
      attentionCount
    }
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
  const problemSignals = [
    ...new Set([
      ...(latestReport?.decision.blockers ?? []),
      ...highlightedPorts.map((port) => `review-port:${port}`),
      ...securitySignals.slice(0, 3)
    ])
  ];

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
      securitySignals
    },
    exposure: {
      openPorts,
      highlightedPorts,
      bruteForceSignals,
      problemSignals
    }
  };
}

export {
  analyzePrompt,
  executePrompt,
  getPromptExecutionReport,
  listPromptExecutions
};
