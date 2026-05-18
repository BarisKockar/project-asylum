import type { PromptAnalysis, PromptExecutionReport } from "../../types/agent";
import { buildExecutionTasks } from "./task-engine";

type ReasoningTrace = PromptExecutionReport["reasoning"];
type CriticTrace = PromptExecutionReport["critic"];
type ExecutionPlan = PromptExecutionReport["plan"];

export function buildExecutionPlan(
  analysis: PromptAnalysis,
  reasoning: ReasoningTrace,
  critic: CriticTrace
): ExecutionPlan {
  const guarded =
    analysis.constraints.includes("safe-first") || critic.riskFlags.length > 0;

  const priorityHypothesis =
    reasoning.hypotheses.find(
      (hypothesis) => hypothesis.id === reasoning.priorityHypothesisId
    ) ?? reasoning.hypotheses[0];

  const steps = buildExecutionTasks(analysis, reasoning, critic).map((step) =>
    step.id === "step-policy-gate" && guarded
      ? { ...step, status: "blocked" }
      : step
  );

  return {
    objective:
      priorityHypothesis?.title ?? `${analysis.normalizedGoal} için açıklanabilir plan üret`,
    steps,
    guarded
  };
}
