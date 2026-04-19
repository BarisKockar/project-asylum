import type { PromptAnalysis, PromptExecutionReport } from "../../types/agent";
import {
  buildBlockerPolicyContext,
  evaluateBlockerPolicies
} from "./policy-engine";

type ExecutionRisk = PromptExecutionReport["risks"][number];
type ReasoningTrace = PromptExecutionReport["reasoning"];
type CriticTrace = PromptExecutionReport["critic"];

export function buildCriticTrace(
  analysis: PromptAnalysis,
  risks: ExecutionRisk[],
  reasoning: ReasoningTrace
): CriticTrace {
  const riskFlags: string[] = [];
  const highOrCritical = risks.filter(
    (risk) => risk.severity === "high" || risk.severity === "critical"
  );

  if (analysis.constraints.includes("safe-first")) {
    riskFlags.push("safe-first-validation");
  }

  if (risks.some((risk) => risk.id === "risk-network-exposure")) {
    riskFlags.push("network-exposure-review");
  }

  if (risks.some((risk) => risk.severity === "critical")) {
    riskFlags.push("critical-surface-review");
  } else if (highOrCritical.length >= 2) {
    riskFlags.push("high-risk-triage");
  }

  const verdict =
    riskFlags.length === 0 || (riskFlags.length === 1 && riskFlags[0] === "safe-first-validation")
      ? "approve"
      : "revise";

  const focusHypothesis = reasoning.hypotheses.find(
    (hypothesis) => hypothesis.id === reasoning.priorityHypothesisId
  );

  return {
    verdict,
    summary:
      verdict === "approve"
        ? "Toplanan kanıtlar teknik olarak yeterli görünüyor; yürütme bir sonraki aşamaya geçebilir."
        : `Critic ek doğrulama istiyor. Öncelikli odak: ${focusHypothesis?.title ?? "en kritik hipotez"}.`,
    riskFlags,
    policyMatches: [],
    recommendedAction:
      verdict === "approve"
        ? reasoning.nextInference
        : `${focusHypothesis?.title ?? "Öncelikli hipotez"} için daha güçlü kanıt topla ve policy gate'i yeniden değerlendir.`
    };
}

export function rerunCriticTrace(
  analysis: PromptAnalysis,
  risks: ExecutionRisk[],
  reasoning: ReasoningTrace
): CriticTrace {
  return buildCriticTrace(analysis, risks, reasoning);
}

export function refineCriticTrace(
  critic: CriticTrace,
  observations: PromptExecutionReport["observations"],
  risks: ExecutionRisk[],
  previousTaskRuns: PromptExecutionReport["taskRuns"]
): CriticTrace {
  const policyContext = buildBlockerPolicyContext(
    observations,
    risks,
    previousTaskRuns
  );

  if (
    policyContext.collectorAttempts < 1 ||
    policyContext.hasCriticalRisk ||
    policyContext.reviewPorts.length > 0
  ) {
    return {
      ...critic,
      policyMatches: evaluateBlockerPolicies({
        ...policyContext,
        collectorAttempts: 0
      }).map((policy) => ({ ...policy, matched: false }))
    };
  }

  const policyMatches = evaluateBlockerPolicies(policyContext);

  let softenedFlags = [...critic.riskFlags];
  for (const match of policyMatches) {
    if (match.matched && match.action === "remove") {
      softenedFlags = softenedFlags.filter((flag) => flag !== match.flag);
    }
  }

  if (softenedFlags.length === critic.riskFlags.length) {
    return {
      ...critic,
      policyMatches
    };
  }

  return {
    ...critic,
    verdict: softenedFlags.length === 0 ? "approve" : critic.verdict,
    riskFlags: softenedFlags,
    policyMatches,
    summary:
      softenedFlags.length === 0
        ? "Policy tablosu uygulandı; blocker'lar temizlendi ve teknik ilerleme uygun görünüyor."
        : "Policy tablosu uygulandı; bazı blocker'lar yumuşatıldı.",
    recommendedAction:
      softenedFlags.length === 0
        ? "Reasoning zincirini tamamla ve bir sonraki güvenli adıma geç."
        : critic.recommendedAction
  };
}
