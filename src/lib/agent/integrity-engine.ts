import type { PromptAnalysis, PromptExecutionReport } from "../../types/agent";
import { getActiveAgentThresholdProfile } from "./threshold-config";

type ExecutionObservation = PromptExecutionReport["observations"][number];
type ExecutionTaskRun = PromptExecutionReport["taskRuns"][number];
type ExecutionRisk = PromptExecutionReport["risks"][number];
type ExecutionDecision = PromptExecutionReport["decision"];
type ExecutionIntegrity = NonNullable<PromptExecutionReport["integrity"]>;
type ContradictionCategory = NonNullable<
  PromptExecutionReport["integrity"]
>["contradictionGroups"][number]["category"];

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function deriveRequiredKinds(analysis: PromptAnalysis): string[] {
  const required = new Set<string>(["host-runtime", "policy", "plan"]);

  if (
    analysis.detectedTargets.includes("admin-panel") ||
    analysis.detectedTargets.includes("network-surface") ||
    analysis.detectedTargets.includes("localhost")
  ) {
    required.add("network-surface");
    required.add("telemetry");
  }

  if (
    analysis.detectedTargets.includes("configuration") ||
    analysis.detectedTargets.includes("admin-panel")
  ) {
    required.add("configuration");
  }

  if (analysis.detectedTargets.includes("process")) {
    required.add("process-surface");
  }

  return [...required];
}

function averageObservationConfidence(observations: ExecutionObservation[]): number {
  if (observations.length === 0) {
    return 0;
  }

  const total = observations.reduce(
    (sum, observation) => sum + (observation.confidence ?? 0),
    0
  );
  return total / observations.length;
}

function deriveRiskEvidenceCoverage(
  risks: ExecutionRisk[],
  observedKinds: string[]
): number {
  if (risks.length === 0) {
    return 1;
  }

  const covered = risks.filter((risk) =>
    risk.sourceKinds.some((kind) => observedKinds.includes(kind))
  ).length;

  return covered / risks.length;
}

function collectSignalCount(observations: ExecutionObservation[]): number {
  return observations.reduce((count, observation) => {
    const metadata = observation.metadata ?? {};
    const riskySignals = Array.isArray(metadata.riskySignals)
      ? metadata.riskySignals.length
      : 0;
    const securitySignals = Array.isArray(metadata.securitySignals)
      ? metadata.securitySignals.length
      : 0;

    return count + riskySignals + securitySignals;
  }, 0);
}

export function deriveExecutionContradictions(input: {
  observations: ExecutionObservation[];
  risks: ExecutionRisk[];
  taskRuns?: ExecutionTaskRun[];
  decision?: ExecutionDecision;
}): string[] {
  const contradictions: string[] = [];
  const signalCount = collectSignalCount(input.observations);
  const hasHighSeverityRisk = input.risks.some((risk) =>
    ["high", "critical"].includes(risk.severity)
  );

  if (signalCount > 0 && input.risks.length === 0) {
    contradictions.push("signals-without-derived-risk");
  }

  if (input.decision) {
    if (hasHighSeverityRisk && input.decision.status === "completed") {
      contradictions.push("high-risk-marked-completed");
    }

    if (
      input.decision.blockers.length > 0 &&
      input.decision.status === "completed"
    ) {
      contradictions.push("blockers-with-completed-status");
    }
  }

  if (input.taskRuns !== undefined) {
    const hasReviewTask = input.taskRuns.some((taskRun) =>
      ["analysis", "review"].includes(taskRun.taskType)
    );

    if (input.risks.length > 0 && !hasReviewTask) {
      contradictions.push("risk-without-review-task");
    }
  }

  return contradictions;
}

function classifyContradictions(contradictions: string[]): Array<{
  category: ContradictionCategory;
  items: string[];
}> {
  const grouped = new Map<ContradictionCategory, string[]>();

  for (const contradiction of contradictions) {
    let category: ContradictionCategory;

    if (contradiction === "signals-without-derived-risk") {
      category = "evidence-gap";
    } else if (
      contradiction === "high-risk-marked-completed" ||
      contradiction === "blockers-with-completed-status"
    ) {
      category = "risk-decision-mismatch";
    } else {
      category = "task-flow-mismatch";
    }

    grouped.set(category, [...(grouped.get(category) ?? []), contradiction]);
  }

  return [...grouped.entries()].map(([category, items]) => ({
    category,
    items
  }));
}

export function buildExecutionIntegrity(input: {
  analysis: PromptAnalysis;
  observations: ExecutionObservation[];
  risks: ExecutionRisk[];
  taskRuns: ExecutionTaskRun[];
  decision: ExecutionDecision;
}): ExecutionIntegrity {
  const observedKinds = [...new Set(input.observations.map((observation) => observation.kind))];
  const requiredKinds = deriveRequiredKinds(input.analysis);
  const missingKinds = requiredKinds.filter((kind) => !observedKinds.includes(kind));
  const coverageScore =
    requiredKinds.length > 0
      ? (requiredKinds.length - missingKinds.length) / requiredKinds.length
      : 1;
  const completedTasks = input.taskRuns.filter(
    (taskRun) => taskRun.status === "completed"
  ).length;
  const totalTasks = input.taskRuns.length;
  const taskCompletionScore =
    totalTasks > 0 ? completedTasks / totalTasks : 1;
  const observationConfidence = averageObservationConfidence(input.observations);
  const riskEvidenceCoverage = deriveRiskEvidenceCoverage(input.risks, observedKinds);
  const contradictions = deriveExecutionContradictions(input);
  const contradictionGroups = classifyContradictions(contradictions);
  const contradictionCount = contradictions.length;
  const coherenceScore = clamp(1 - contradictionCount * 0.18);
  const blockerPenalty = input.decision.blockers.length > 0 ? 0.08 : 0;
  const evidenceScore = clamp(
    coverageScore * 0.35 +
      taskCompletionScore * 0.18 +
      observationConfidence * 0.17 +
      riskEvidenceCoverage * 0.15 +
      coherenceScore * 0.15 -
      blockerPenalty
  );

  const thresholds = getActiveAgentThresholdProfile().integrity;
  const status =
    evidenceScore >= thresholds.strongEvidenceScore &&
    missingKinds.length === 0 &&
    contradictionCount === 0
      ? "strong"
      : evidenceScore >= thresholds.partialEvidenceScore &&
          contradictionCount < thresholds.partialMaxContradictions
        ? "partial"
        : "thin";
  const pilotReady =
    evidenceScore >= thresholds.pilotReadyEvidenceScore &&
    coverageScore >= thresholds.pilotReadyCoverageScore &&
    taskCompletionScore >= thresholds.pilotReadyTaskCompletion &&
    contradictionCount === 0 &&
    coherenceScore >= thresholds.pilotReadyCoherenceScore;
  const contradictionSummary =
    contradictionCount > 0
      ? ` Tutarsizliklar: ${contradictions.join(", ")}.`
      : "";
  const summary =
    status === "strong"
      ? `Kanıt bütünlüğü güçlü; ${requiredKinds.length}/${requiredKinds.length} beklenen observation kind'i görüldü ve ${completedTasks}/${totalTasks} görev tamamlandı.${contradictionSummary}`
      : status === "partial"
        ? `Kanıt bütünlüğü kısmi; eksik alanlar: ${
            missingKinds.length > 0 ? missingKinds.join(", ") : "yok"
          }. ${completedTasks}/${totalTasks} görev tamamlandı.${contradictionSummary}`
        : `Kanıt bütünlüğü zayıf; eksik observation alanları, tamamlanmamış görevler veya çelişkili sinyaller karar güvenini düşürüyor.${contradictionSummary}`;

  return {
    coverageScore,
    taskCompletionScore,
    evidenceScore,
    coherenceScore,
    status,
    pilotReady,
    summary,
    observedKinds,
    requiredKinds,
    missingKinds,
    contradictionGroups,
    contradictions,
    contradictionCount,
    completedTasks,
    totalTasks
  };
}
