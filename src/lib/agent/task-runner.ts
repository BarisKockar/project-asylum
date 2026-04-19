import type { PromptExecutionReport } from "../../types/agent";
import {
  collectConfigObservation,
  collectNetworkObservation,
  collectRuntimeSnapshotObservation
} from "./observation-engine";
import { rerunReasoningTrace } from "./reasoning-engine";
import { rerunCriticTrace } from "./critic-engine";
import { scoreExecutionRisks } from "./risk-engine";
import { deriveExecutionDecision } from "./decision-engine";

type PlanStep = PromptExecutionReport["plan"]["steps"][number];
type TaskRun = PromptExecutionReport["taskRuns"][number];
type ExecutionObservation = PromptExecutionReport["observations"][number];
type ReasoningTrace = PromptExecutionReport["reasoning"];
type CriticTrace = PromptExecutionReport["critic"];
type PromptAnalysis = import("../../types/agent").PromptAnalysis;

function nextAttemptForStep(
  existingTaskRuns: TaskRun[],
  stepId: string
): number {
  const attempts = existingTaskRuns
    .filter((taskRun) => taskRun.stepId === stepId)
    .map((taskRun) => taskRun.attempt);

  return attempts.length > 0 ? Math.max(...attempts) + 1 : 1;
}

function executeCollectorTask(
  step: PlanStep,
  observations: ExecutionObservation[]
): {
  status: string;
  summary: string;
  produced: string[];
} {
  if (step.commandHint === "port-scan-lite") {
    const observation = collectNetworkObservation();
    return {
      status: "completed",
      summary: observation.detail,
      produced: step.outputs
    };
  }

  if (step.commandHint === "config-snapshot") {
    const observation = collectConfigObservation();
    return {
      status: "completed",
      summary: observation.detail,
      produced: step.outputs
    };
  }

  if (step.commandHint === "runtime-snapshot") {
    const observation = collectRuntimeSnapshotObservation();
    return {
      status: "completed",
      summary: observation.detail,
      produced: step.outputs
    };
  }

  return {
    status: "completed",
    summary: observations[0]?.detail ?? "Collector için özet observation bulunamadı.",
    produced: step.outputs
  };
}

function buildReasoningSummary(reasoning: ReasoningTrace): string {
  const priorityHypothesis = reasoning.hypotheses.find(
    (hypothesis) => hypothesis.id === reasoning.priorityHypothesisId
  );

  return priorityHypothesis
    ? `${priorityHypothesis.title} öncelikli hipotez olarak sıralandı.`
    : "Reasoning yenilendi ancak öncelikli hipotez seçilemedi.";
}

function buildCriticSummary(critic: CriticTrace): string {
  return `${critic.verdict} verdict üretildi; aktif risk bayrakları: ${
    critic.riskFlags.length > 0 ? critic.riskFlags.join(", ") : "yok"
  }.`;
}

export function runExecutionTasks(
  analysis: PromptAnalysis,
  steps: PlanStep[],
  observations: ExecutionObservation[],
  reasoning: ReasoningTrace,
  critic: CriticTrace,
  existingTaskRuns: TaskRun[] = []
): TaskRun[] {
  const executedAt = new Date().toISOString();

  return steps.map((step) => {
    const attempt = nextAttemptForStep(existingTaskRuns, step.id);

    if (step.taskType === "collector") {
      const collectorResult = executeCollectorTask(step, observations);
      return {
        stepId: step.id,
        taskType: step.taskType,
        commandHint: step.commandHint,
        status: collectorResult.status,
        attempt,
        summary: collectorResult.summary,
        produced: collectorResult.produced,
        executedAt
      };
    }

    if (step.taskType === "reasoning") {
      const rerunTrace = rerunReasoningTrace(
        analysis,
        observations,
        scoreExecutionRisks(analysis, observations)
      );
      return {
        stepId: step.id,
        taskType: step.taskType,
        commandHint: step.commandHint,
        status: "completed",
        attempt,
        summary: buildReasoningSummary(rerunTrace),
        produced: step.outputs,
        executedAt
      };
    }

    const rerunCritic = rerunCriticTrace(
      analysis,
      scoreExecutionRisks(analysis, observations),
      rerunReasoningTrace(analysis, observations, scoreExecutionRisks(analysis, observations))
    );
    const rerunDecision = deriveExecutionDecision(
      analysis,
      scoreExecutionRisks(analysis, observations),
      rerunCritic
    );

    return {
      stepId: step.id,
      taskType: step.taskType,
      commandHint: step.commandHint,
      status:
        rerunDecision.status === "needs-triage" || rerunDecision.blockers.length > 0
          ? "blocked"
          : "completed",
      attempt,
      summary: `${buildCriticSummary(rerunCritic)} Decision status: ${rerunDecision.status}.`,
      produced: step.outputs,
      executedAt
    };
  });
}
