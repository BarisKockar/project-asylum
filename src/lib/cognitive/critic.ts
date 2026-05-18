import { CognitiveCritique, CognitiveObservation, CognitivePlan } from "@/types/cognitive";
import { RuntimePolicy } from "@/types/security";

type CritiqueContext = {
  observations?: Pick<CognitiveObservation, "kind" | "confidence">[];
};

export function critiquePlan(
  plan: CognitivePlan | null,
  policy: RuntimePolicy,
  context: CritiqueContext = {}
): CognitiveCritique {
  const createdAt = new Date().toISOString();

  if (!plan) {
    return {
      targetId: "unknown",
      planId: null,
      verdict: "block",
      reasons: ["Degerlendirilecek plan bulunamadi."],
      riskFlags: ["missing-plan"],
      createdAt
    };
  }

  const reasons: string[] = [];
  const riskFlags: string[] = [];
  const observations = context.observations ?? [];
  const observationKinds = new Set(
    observations.map((observation) => observation.kind)
  );
  const hasRuntime = observationKinds.has("runtime");
  const hasProcess = observationKinds.has("process");
  const hasIdentity = observationKinds.has("identity");
  const hasNetwork = observationKinds.has("network");
  const highConfidenceSignals = observations.filter(
    (observation) => observation.confidence === "high"
  ).length;
  const strongLiveEvidence = hasRuntime && hasProcess && highConfidenceSignals > 0;
  const hasHighConfidenceNetwork = (context.observations ?? []).some(
    (observation) =>
      observation.kind === "network" && observation.confidence === "high"
  );

  if (plan.blastRadius === "broad") {
    reasons.push("Plan genis etki alani tasiyor.");
    riskFlags.push("broad-blast-radius");
  }

  if (plan.steps.some((step) => step.requiresApproval) && policy.approvalRequiredForHighRisk) {
    reasons.push("Plan yuksek riskli adimlar iceriyor ve insan onayi gerektiriyor.");
    riskFlags.push("approval-required");
  }

  if (plan.steps.some((step) => step.actionType === "limit-risk" && !step.rollbackHint)) {
    reasons.push("Riski sinirlayan adimda rollback ipucu eksik.");
    riskFlags.push("missing-rollback");
  }

  const suppressLowConfidence =
    strongLiveEvidence && plan.confidence >= 0.5;
  const softenNetworkSurface =
    strongLiveEvidence && plan.confidence >= 0.52 && !hasHighConfidenceNetwork;

  if (plan.confidence < 0.6 && !strongLiveEvidence) {
    reasons.push("Plan guveni dusuk, ek dogrulama gerekiyor.");
    riskFlags.push("low-confidence");
  } else if (plan.confidence < 0.6 && strongLiveEvidence && !suppressLowConfidence) {
    reasons.push("Plan guveni dusuk olsa da canli runtime/process kaniti bu riski kismen dengeliyor.");
    riskFlags.push("low-confidence-softened");
  } else if (plan.confidence < 0.6 && suppressLowConfidence) {
    reasons.push("Canli runtime/process kaniti ve toparlanan plan guveni, low-confidence baskisini baskiliyor.");
  }

  if (hasNetwork && !softenNetworkSurface) {
    reasons.push("Plan network yuzeyiyle ilgili sinyallerden besleniyor; etki alani yeniden gozden gecirilmeli.");
    riskFlags.push("network-surface");
  } else if (hasNetwork && softenNetworkSurface) {
    reasons.push("Network yuzeyi sinyali mevcut, ancak canli runtime/process kaniti bu riski kontrollu dogrulama seviyesine indiriyor.");
  }

  if (!hasProcess && !hasRuntime) {
    reasons.push("Runtime veya process kaniti zayif; uygulama oncesi canli dogrulama artirilmali.");
    riskFlags.push("thin-runtime-evidence");
  }

  if (hasIdentity && !hasNetwork) {
    reasons.push("Kimlik baglami var ancak network sinyali eksik; plan baglam agirlikli kaliyor.");
    riskFlags.push("context-heavy-evidence");
  }

  if (hasHighConfidenceNetwork) {
    reasons.push("Yuksek guvenli network sinyali kritik etki olasiligini artiriyor.");
    riskFlags.push("high-confidence-network");
  }

  if (strongLiveEvidence && !hasNetwork && !riskFlags.includes("missing-rollback")) {
    reasons.push("Guclu canli kanit, planin en azindan kontrollu dogrulama seviyesinde daha guvenilir oldugunu gosteriyor.");
  }

  const verdict =
    riskFlags.includes("broad-blast-radius") ? "block" :
    riskFlags.length === 1 && riskFlags.includes("approval-required") ? "approve" :
    riskFlags.length > 0 ? "revise" :
    "approve";

  if (verdict === "approve") {
    reasons.push("Plan mevcut politikalar altinda uygulanabilir gorunuyor.");
  }

  return {
    targetId: plan.targetId,
    planId: plan.id,
    verdict,
    reasons,
    riskFlags,
    createdAt
  };
}
