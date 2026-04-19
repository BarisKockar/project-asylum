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
};

export type { PromptAnalysis, PromptExecution, PromptExecutionReport };

export function getSystemSummary(): SystemSummary {
  const executionSummary = getExecutionStatusSummary();
  const policyInsight = latestPolicyInsight();
  const policyDecision = latestPolicyDecision();

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
    ]
  };
}

export {
  analyzePrompt,
  executePrompt,
  getPromptExecutionReport,
  listPromptExecutions
};
