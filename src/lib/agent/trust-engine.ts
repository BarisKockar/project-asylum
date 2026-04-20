import type { PersistentTrustRecord, PromptExecutionReport } from "../../types/agent";

type ExecutionAnalysis = PromptExecutionReport["execution"];
type ExecutionDecision = PromptExecutionReport["decision"];
type ExecutionObservations = PromptExecutionReport["observations"];
type ExecutionReasoning = PromptExecutionReport["reasoning"];
type ExecutionRisks = PromptExecutionReport["risks"];
type TrustAssessment = NonNullable<PromptExecutionReport["trust"]>;
const ENVIRONMENT_TARGETS = new Set(["localhost", "host-runtime"]);

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function averageRiskScore(risks: ExecutionRisks): number {
  if (risks.length === 0) {
    return 0;
  }

  const total = risks.reduce((sum, risk) => sum + (risk.score ?? 0.4), 0);
  return total / risks.length;
}

function normalizeTargetKey(targets: string[]): string[] {
  return [...new Set(targets.map((target) => target.trim()).filter(Boolean))].sort();
}

export function deriveEnvironmentFingerprint(
  execution: ExecutionAnalysis,
  observations: ExecutionObservations
): string {
  const runtimeObservation = observations.find(
    (observation) => observation.kind === "host-runtime"
  );
  const metadata = runtimeObservation?.metadata ?? {};
  const hostname =
    typeof metadata.hostname === "string" && metadata.hostname.length > 0
      ? metadata.hostname
      : "unknown-host";
  const cpuCount =
    typeof metadata.cpuCount === "number" && Number.isFinite(metadata.cpuCount)
      ? metadata.cpuCount
      : "na";
  const interfaces = Array.isArray(metadata.interfaces)
    ? metadata.interfaces
        .filter((value): value is string => typeof value === "string")
        .sort()
    : [];

  if (hostname !== "unknown-host" || interfaces.length > 0) {
    return `env:${hostname}|cpu:${cpuCount}|if:${interfaces.join(",") || "none"}`;
  }

  const firstTarget = normalizeTargetKey(execution.targets)[0] ?? "global";
  return `env:${firstTarget}`;
}

export function deriveActionKey(
  execution: ExecutionAnalysis,
  risks: ExecutionRisks
): string {
  const surfaceTargets = normalizeTargetKey(execution.targets).filter(
    (target) => !ENVIRONMENT_TARGETS.has(target)
  );
  const riskFamilies = [...new Set(risks.map((risk) => risk.id))].sort();

  return [
    `mode:${execution.mode}`,
    `targets:${surfaceTargets.join("+") || "general"}`,
    `risks:${riskFamilies.join("+") || "none"}`
  ].join("|");
}

export function updateTrustTrendRecords(input: {
  execution: ExecutionAnalysis;
  observations: ExecutionObservations;
  risks: ExecutionRisks;
  decision: ExecutionDecision;
  confidenceScore: number;
  existingRecords?: Record<string, PersistentTrustRecord>;
}): Record<string, PersistentTrustRecord> {
  const environmentKey = deriveEnvironmentFingerprint(
    input.execution,
    input.observations
  );
  const actionKey = deriveActionKey(input.execution, input.risks);
  const updatedAt = new Date().toISOString();
  const existing = input.existingRecords ?? {};

  function applyRecord(
    key: string,
    scope: PersistentTrustRecord["scope"]
  ): PersistentTrustRecord {
    const current = existing[key];
    const successIncrement = input.decision.status === "completed" ? 1 : 0;
    const triageIncrement = input.decision.status === "needs-triage" ? 1 : 0;

    return {
      key,
      scope,
      successCount: (current?.successCount ?? 0) + successIncrement,
      triageCount: (current?.triageCount ?? 0) + triageIncrement,
      lastStatus: input.decision.status,
      lastConfidenceScore: input.confidenceScore,
      updatedAt
    };
  }

  return {
    ...existing,
    [environmentKey]: applyRecord(environmentKey, "environment"),
    [actionKey]: applyRecord(actionKey, "action")
  };
}

export function buildTrustAssessment(input: {
  execution: ExecutionAnalysis;
  observations: ExecutionObservations;
  reasoning: ExecutionReasoning;
  risks: ExecutionRisks;
  decision: ExecutionDecision;
  historicalReports?: PromptExecutionReport[];
}): TrustAssessment {
  const avgRisk = averageRiskScore(input.risks);
  const beliefConfidence = input.reasoning.belief.confidence ?? 0;
  const blockerPenalty = input.decision.blockers.length > 0 ? 0.22 : 0;
  const remediationPenalty = input.execution.mode === "remediate" ? 0.1 : 0;
  const history = input.historicalReports ?? [];
  const environmentKey = deriveEnvironmentFingerprint(
    input.execution,
    input.observations
  );
  const actionKey = deriveActionKey(input.execution, input.risks);

  const sameEnvironmentHistory = history.filter(
    (report) =>
      deriveEnvironmentFingerprint(report.execution, report.observations) ===
      environmentKey
  );
  const sameActionHistory = sameEnvironmentHistory.filter(
    (report) => deriveActionKey(report.execution, report.risks) === actionKey
  );

  const successfulEnvironmentHistoryCount = sameEnvironmentHistory.filter(
    (report) => report.decision.status === "completed"
  ).length;
  const triageEnvironmentHistoryCount = sameEnvironmentHistory.filter(
    (report) => report.decision.status === "needs-triage"
  ).length;
  const successfulActionHistoryCount = sameActionHistory.filter(
    (report) => report.decision.status === "completed"
  ).length;
  const triageActionHistoryCount = sameActionHistory.filter(
    (report) => report.decision.status === "needs-triage"
  ).length;

  const historyConfidenceBoost = clamp(
    successfulEnvironmentHistoryCount * 0.02 +
      successfulActionHistoryCount * 0.04,
    0,
    0.2
  );
  const historyPenalty = clamp(
    triageEnvironmentHistoryCount * 0.015 +
      triageActionHistoryCount * 0.03,
    0,
    0.14
  );
  const policyPenalty =
    input.decision.primaryBlockerReason?.severity === "critical"
      ? 0.25
      : input.decision.primaryBlockerReason?.severity === "high"
        ? 0.15
        : input.decision.primaryBlockerReason?.severity === "medium"
          ? 0.08
          : 0;

  const confidenceScore = clamp(
    beliefConfidence * 0.6 +
      (1 - avgRisk) * 0.4 +
      historyConfidenceBoost -
      historyPenalty -
      blockerPenalty -
      remediationPenalty -
      policyPenalty
  );

  let automationEligibility: TrustAssessment["automationEligibility"] =
    "observe-only";
  let approvalRequirementReason = "Confidence henüz otomatik aksiyon için yeterli değil.";

  if (input.execution.mode === "remediate") {
    automationEligibility = "approval-required";
    approvalRequirementReason =
      "Onarım modu policy gereği insan onayı olmadan otomatik uygulanamaz.";
  } else if (confidenceScore >= 0.85 && input.decision.blockers.length === 0) {
    automationEligibility = "low-risk-auto";
    approvalRequirementReason =
      "Confidence yüksek ve aktif blocker görünmüyor; yalnızca düşük riskli aksiyonlar için aday.";
  } else if (confidenceScore >= 0.6) {
    automationEligibility = "approval-required";
    approvalRequirementReason =
      "Confidence orta seviyede; öneri üretilebilir ama otomatik uygulama için insan onayı gerekli.";
  }

  return {
    confidenceScore,
    confidenceFactors: [
      `belief-confidence=${beliefConfidence.toFixed(2)}`,
      `avg-risk-score=${avgRisk.toFixed(2)}`,
      `blockers=${input.decision.blockers.length}`,
      `mode=${input.execution.mode}`,
      `environment-key=${environmentKey}`,
      `action-key=${actionKey}`,
      `environment-history-success=${successfulEnvironmentHistoryCount}`,
      `environment-history-triage=${triageEnvironmentHistoryCount}`,
      `action-history-success=${successfulActionHistoryCount}`,
      `action-history-triage=${triageActionHistoryCount}`
    ],
    environmentTrustScore: clamp(
      (1 - avgRisk) * 0.55 +
        beliefConfidence * 0.35 +
        successfulEnvironmentHistoryCount * 0.03 +
        successfulActionHistoryCount * 0.02 -
        historyPenalty * 0.5
    ),
    actionTrustScore: clamp(confidenceScore - remediationPenalty),
    automationEligibility,
    approvalRequirementReason
  };
}
