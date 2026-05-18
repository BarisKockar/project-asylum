import type { PromptAnalysis, PromptExecutionReport } from "../../types/agent";

type ReasoningTrace = PromptExecutionReport["reasoning"];
type CriticTrace = PromptExecutionReport["critic"];
type ExecutionRisk = PromptExecutionReport["risks"][number];
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

function stepForDeepValidation(
  critic: CriticTrace,
  risks: ExecutionRisk[]
): PlanStep {
  const reasons: string[] = [];

  if (critic.riskFlags.includes("evidence-coherence-review")) {
    reasons.push("kanit zincirinde tutarsizlik var");
  }

  if (
    critic.riskFlags.includes("critical-surface-review") ||
    risks.some((risk) => risk.severity === "critical")
  ) {
    reasons.push("kritik seviye risk yuzeyi tespit edildi");
  }

  if (reasons.length === 0) {
    reasons.push("kanit butunlugu icin ikincil dogrulama gerekiyor");
  }

  return {
    id: "step-deep-validation",
    title: "İkincil kanıt doğrulaması yap",
    status: "ready",
    rationale: `Policy gate öncesi ek inceleme: ${reasons.join(" ve ")}.`,
    taskType: "review",
    commandHint: "deep-validation",
    outputs: ["evidence-cross-check", "contradiction-resolution"]
  };
}

function stepForApprovalRequest(analysis: PromptAnalysis): PlanStep {
  return {
    id: "step-approval-request",
    title: "İnsan onayı bekle",
    status: "awaiting-approval",
    rationale:
      "Remediation modu otomatik aksiyon almadan once insan onayini zorunlu kilar.",
    taskType: "approval",
    commandHint: "human-approval-request",
    outputs: [
      "approval-decision",
      `approval-target:${analysis.detectedTargets[0] ?? "general-security-surface"}`
    ]
  };
}

export function buildExecutionTasks(
  analysis: PromptAnalysis,
  reasoning: ReasoningTrace,
  critic: CriticTrace,
  risks: ExecutionRisk[] = []
): PlanStep[] {
  const steps: PlanStep[] = [
    stepForEvidence(analysis, reasoning),
    stepForReasoningRefresh()
  ];

  // Deep validation lands between the reasoning refresh and the policy
  // gate so the gate sees the strongest possible evidence picture.
  const needsDeepValidation =
    critic.riskFlags.includes("evidence-coherence-review") ||
    critic.riskFlags.includes("critical-surface-review") ||
    risks.some((risk) => risk.severity === "critical");

  if (needsDeepValidation) {
    steps.push(stepForDeepValidation(critic, risks));
  }

  steps.push(stepForPolicyGate(critic));

  // Approval is mandatory for remediate mode — even if confidence is
  // high enough for low-risk-auto, remediation requires explicit human
  // sign-off. The step itself surfaces this requirement to operators.
  if (analysis.suggestedMode === "remediate") {
    steps.push(stepForApprovalRequest(analysis));
  }

  return steps;
}
