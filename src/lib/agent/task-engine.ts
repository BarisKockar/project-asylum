import type { PromptAnalysis, PromptExecutionReport } from "../../types/agent";

type ReasoningTrace = PromptExecutionReport["reasoning"];
type CriticTrace = PromptExecutionReport["critic"];
type PlanStep = PromptExecutionReport["plan"]["steps"][number];

function stepForEvidence(
  analysis: PromptAnalysis,
  reasoning: ReasoningTrace
): PlanStep {
  const priorityHypothesis =
    reasoning.hypotheses.find(
      (hypothesis) => hypothesis.id === reasoning.priorityHypothesisId
    ) ?? reasoning.hypotheses[0];

  const targetHint = analysis.detectedTargets.includes("network-surface")
    ? "port-scan-lite"
    : analysis.detectedTargets.includes("configuration")
      ? "config-snapshot"
      : "runtime-snapshot";

  return {
    id: "step-collect-evidence",
    title: "Ek collector kaniti topla",
    status: "ready",
    rationale:
      priorityHypothesis?.title
        ? `${priorityHypothesis.title} için daha güçlü kanıt gerekiyor.`
        : "Hipotezleri doğrulamak için ek kanıt gerekiyor.",
    taskType: "collector",
    commandHint: targetHint,
    outputs:
      targetHint === "port-scan-lite"
        ? ["open-ports", "service-surface", "bind-addresses"]
        : targetHint === "config-snapshot"
          ? ["env-flags", "runtime-config", "policy-drift"]
          : ["runtime-state", "host-signals"]
  };
}

function stepForReasoningRefresh(): PlanStep {
  return {
    id: "step-reasoning-refresh",
    title: "Reasoning zincirini yenile",
    status: "pending",
    rationale:
      "Yeni observation geldikten sonra belief, hypothesis ve priority sıralamasını tekrar hesapla.",
    taskType: "reasoning",
    commandHint: "reasoning-refresh",
    outputs: ["belief-update", "hypothesis-order", "confidence-delta"]
  };
}

function stepForPolicyGate(critic: CriticTrace): PlanStep {
  return {
    id: "step-policy-gate",
    title: "Critic ve policy gate değerlendir",
    status: critic.riskFlags.length > 0 ? "blocked" : "ready",
    rationale:
      critic.riskFlags.length > 0
        ? `Aktif risk bayrakları: ${critic.riskFlags.join(", ")}.`
        : "Ek politika engeli görünmüyor.",
    taskType: "critic",
    commandHint: "policy-gate-check",
    outputs: ["critic-verdict", "blocker-list", "approval-need"]
  };
}

export function buildExecutionTasks(
  analysis: PromptAnalysis,
  reasoning: ReasoningTrace,
  critic: CriticTrace
): PlanStep[] {
  return [
    stepForEvidence(analysis, reasoning),
    stepForReasoningRefresh(),
    stepForPolicyGate(critic)
  ];
}
