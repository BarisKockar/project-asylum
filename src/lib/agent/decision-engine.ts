import type { PromptAnalysis, PromptExecutionReport } from "../../types/agent";
import {
  buildPolicyDecisionExplanation,
  sortBlockerFlagsByPriority
} from "./policy-engine";

type ExecutionDecision = PromptExecutionReport["decision"];

export function deriveExecutionDecision(
  analysis: PromptAnalysis,
  risks: PromptExecutionReport["risks"],
  critic?: PromptExecutionReport["critic"],
  policyInsight?: PromptExecutionReport["policyInsight"]
): ExecutionDecision {
  const blockers: string[] = [];
  const criticalRiskCount = risks.filter((risk) => risk.severity === "critical").length;
  const highRiskCount = risks.filter((risk) => risk.severity === "high").length;
  let status = "completed";
  let rationale =
    "İstek analiz odaklı olduğu için yürütme zinciri observation ve reasoning aşamasına hazırlandı.";
  let nextStep =
    "Collector, reasoner ve critic adimlarini ayni execution kimligi altinda calistir.";

  if (analysis.constraints.includes("safe-first")) {
    blockers.push("safe-first-validation");
  }

  if (critic) {
    blockers.push(...critic.riskFlags);
  } else {
    if (risks.some((risk) => risk.id === "risk-network-exposure")) {
      blockers.push("network-exposure-review");
    }

    if (criticalRiskCount > 0) {
      blockers.push("critical-surface-review");
      rationale +=
        " Kritik seviyede en az bir yuzey tespit edildigi icin otomatik ilerleme sinirlandi.";
    } else if (highRiskCount > 1) {
      blockers.push("high-risk-triage");
    }
  }

  if (analysis.suggestedMode === "remediate") {
    status = "awaiting-approval";
    blockers.push("human-approval");
    rationale =
      "İstek onarım içerdiği için doğrulama ve politika kapısı devreye alındı.";
    nextStep =
      "Dogrulama kaniti topla, etkiyi olc ve insan onayi gerekip gerekmedigini netlestir.";
  } else if (analysis.suggestedMode === "discovery") {
    rationale =
      "İstek keşif modunda yorumlandı; observation toplama ve risk sıralama adımı aktif.";
    nextStep =
      "Observation kayitlarini reasoning zincirine aktar ve en kritik riski belirle.";
  }

  if (critic?.verdict === "approve") {
    rationale += " Critic teknik olarak ilerlemeyi uygun buldu.";
  } else if (critic?.verdict === "revise") {
    status = analysis.suggestedMode === "remediate" ? "awaiting-approval" : "needs-triage";
    rationale += " Critic ek doğrulama ve triage gerektirdiğini işaretledi.";
    nextStep = critic.recommendedAction;
  }

  if (policyInsight?.pendingRules?.length) {
    blockers.push(...policyInsight.pendingRules);

    if (analysis.suggestedMode !== "remediate") {
      status = "needs-triage";
      rationale += " Policy katmanı bazı blocker'ların hâlâ beklemede olduğunu gösterdi.";
    }
  }

  if (risks.some((risk) => risk.id === "risk-admin-surface")) {
    rationale +=
      " Admin panel yuzeyi tespit edildigi icin kimlik ve erisim kontrolu gozlemleri onceliklendirilmeli.";
  }

  return {
    status,
    rationale,
    blockers: sortBlockerFlagsByPriority([...new Set(blockers)], policyInsight),
    primaryBlockerReason:
      buildPolicyDecisionExplanation(policyInsight).primaryBlockerReason,
    nextStep
  };
}
