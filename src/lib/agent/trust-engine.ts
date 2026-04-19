import type { PromptExecutionReport } from "../../types/agent";

type ExecutionAnalysis = PromptExecutionReport["execution"];
type ExecutionDecision = PromptExecutionReport["decision"];
type ExecutionReasoning = PromptExecutionReport["reasoning"];
type ExecutionRisks = PromptExecutionReport["risks"];
type TrustAssessment = NonNullable<PromptExecutionReport["trust"]>;

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

export function buildTrustAssessment(input: {
  execution: ExecutionAnalysis;
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
  const successfulHistoryCount = history.filter(
    (report) => report.decision.status === "completed"
  ).length;
  const triageHistoryCount = history.filter(
    (report) => report.decision.status === "needs-triage"
  ).length;
  const historyConfidenceBoost = clamp(successfulHistoryCount * 0.04, 0, 0.16);
  const historyPenalty = clamp(triageHistoryCount * 0.03, 0, 0.12);
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
      `history-success=${successfulHistoryCount}`,
      `history-triage=${triageHistoryCount}`
    ],
    environmentTrustScore: clamp(
      (1 - avgRisk) * 0.55 +
        beliefConfidence * 0.35 +
        historyConfidenceBoost -
        historyPenalty * 0.5
    ),
    actionTrustScore: clamp(confidenceScore - remediationPenalty),
    automationEligibility,
    approvalRequirementReason
  };
}
