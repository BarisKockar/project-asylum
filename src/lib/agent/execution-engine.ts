import type {
  PromptAnalysis,
  PromptExecution,
  PromptExecutionReport
} from "../../types/agent";
import { getExecutionStore, persistExecutionStore } from "./execution-store";
import { buildCriticTrace, refineCriticTrace } from "./critic-engine";
import { collectExecutionObservations } from "./observation-engine";
import { deriveExecutionDecision } from "./decision-engine";
import { buildExecutionPlan } from "./planning-engine";
import {
  buildPolicyInsight,
  buildBlockerPolicyContext,
  buildPolicyRiskContext,
  getActiveBlockerPolicyProfile
} from "./policy-engine";
import { buildReasoningTrace } from "./reasoning-engine";
import { scoreExecutionRisks } from "./risk-engine";
import { runExecutionTasks } from "./task-runner";
import { buildTrustAssessment } from "./trust-engine";

function createExecution(analysis: PromptAnalysis): PromptExecution {
  const createdAt = new Date().toISOString();
  const policyProfile = getActiveBlockerPolicyProfile();

  return {
    id: `exec-${Date.now()}`,
    prompt: analysis.normalizedGoal,
    mode: analysis.suggestedMode,
    status:
      analysis.suggestedMode === "remediate"
        ? "awaiting-approval"
        : "completed",
    riskLevel: analysis.riskLevel,
    policyProfile,
    createdAt,
    summary:
      analysis.suggestedMode === "remediate"
        ? "Onarım isteği doğrulama ve politika kapısından geçirildi; güvenli aksiyon için onay bekleniyor."
        : "Yerel observation toplama ve reasoning hazırlığı tamamlandı; değerlendirilebilir risk yüzeyi çıkarıldı.",
    targets: analysis.detectedTargets.length
      ? analysis.detectedTargets
      : ["general-security-surface"]
  };
}

function findPreviousReportForPrompt(
  prompt: string
): PromptExecutionReport | null {
  const store = getExecutionStore();
  const previousExecution = store.executions.find(
    (execution) => execution.prompt === prompt
  );

  if (!previousExecution) {
    return null;
  }

  return store.reports[previousExecution.id] ?? null;
}

export function runPromptExecution(
  analysis: PromptAnalysis
): {
  execution: PromptExecution;
  report: PromptExecutionReport;
} {
  const execution = createExecution(analysis);
  const existingReport = findPreviousReportForPrompt(analysis.normalizedGoal);
  const observations = collectExecutionObservations(analysis);
  const risks = scoreExecutionRisks(analysis, observations);
  const policyRiskContext = buildPolicyRiskContext(risks);
  const reasoning = buildReasoningTrace(analysis, observations, risks);
  const policyContext = buildBlockerPolicyContext(
    observations,
    risks,
    existingReport?.taskRuns ?? []
  );
  const critic = refineCriticTrace(
    buildCriticTrace(analysis, risks, reasoning),
    observations,
    risks,
    existingReport?.taskRuns ?? []
  );
  const policyInsight = buildPolicyInsight(
    execution.policyProfile ?? "default",
    critic.policyMatches ?? [],
    policyRiskContext,
    policyContext
  );
  const plan = buildExecutionPlan(analysis, reasoning, critic);
  const taskRuns = runExecutionTasks(
    analysis,
    plan.steps,
    observations,
    reasoning,
    critic,
    existingReport?.taskRuns ?? []
  );
  const decision = deriveExecutionDecision(
    analysis,
    risks,
    critic,
    policyInsight
  );
  const historicalReports = existingReport ? [existingReport] : [];
  const trust = buildTrustAssessment({
    execution,
    reasoning,
    risks,
    decision,
    historicalReports
  });
  const summary =
    decision.blockers.length > 0
      ? `[${execution.policyProfile}] ${observations.length} observation, ${risks.length} risk, ${reasoning.hypotheses.length} hipotez ve ${plan.steps.length} plan adımı üretildi; aktif blocker'lar: ${decision.blockers.join(", ")}.`
      : `[${execution.policyProfile}] ${observations.length} observation, ${risks.length} risk, ${reasoning.hypotheses.length} hipotez ve ${plan.steps.length} plan adımı üretildi; execution sonraki reasoning adimina hazir.`;

  const report: PromptExecutionReport = {
    execution: {
      ...execution,
      status: decision.status,
      summary
    },
    policyProfile: execution.policyProfile,
    trust,
    policyInsight,
    observations,
    risks,
    reasoning,
    plan,
    taskRuns,
    critic,
    decision,
    generatedAt: execution.createdAt
  };

  const store = getExecutionStore();
  store.executions = [report.execution, ...store.executions].slice(0, 12);
  store.reports[report.execution.id] = report;
  persistExecutionStore();

  return {
    execution: report.execution,
    report
  };
}
