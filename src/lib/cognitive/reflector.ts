import { CognitiveCritique, CognitiveDecision, CognitiveOutcome, CognitivePlan } from "@/types/cognitive";
import { CollectorTelemetry, ScanRecord } from "@/types/security";
import { insertOutcome } from "@/lib/storage/repositories/cognitive-repository";

function slug(value: string) {
  return value.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
}

export function reflectOnDecision(params: {
  targetId: string;
  decision: CognitiveDecision;
  plan: CognitivePlan;
  critique: CognitiveCritique;
  latestScan?: ScanRecord | null;
  previousScan?: ScanRecord | null;
  telemetry?: CollectorTelemetry | null;
  observationKinds?: string[];
}) {
  const {
    targetId,
    decision,
    plan,
    critique,
    latestScan,
    previousScan,
    telemetry,
    observationKinds = []
  } = params;
  const stamp = new Date().toISOString();

  const outcomeStatus: CognitiveOutcome["status"] =
    decision.status === "accepted" && critique.verdict === "approve"
      ? "success"
      : decision.status === "deferred" ||
          decision.status === "awaiting-approval" ||
          critique.verdict === "revise"
        ? "partial"
        : "failed";

  const lessons = [
    critique.verdict === "revise"
      ? "Critic planin uygulanmadan once revize edilmesini istedi."
      : "Critic plani mevcut haliyle kabul etti.",
    decision.status === "deferred" || decision.status === "awaiting-approval"
      ? "Karar insan onayi veya ek kanit bekledigi icin tam sonuclanmis sayilmadi."
      : "Karar uygulamaya uygun olarak isaretlendi."
  ];

  if (latestScan) {
    lessons.push(`Son collector scan ozeti kaydedildi: ${latestScan.summary}`);
  }

  if (latestScan && previousScan) {
    lessons.push(
      `Scan delta izlendi: onceki scan=${previousScan.id}, yeni scan=${latestScan.id}, durum=${previousScan.status}->${latestScan.status}.`
    );
  }

  if (telemetry) {
    lessons.push(
      `Host telemetrisi izlendi: ${telemetry.hostname} / ${telemetry.platform} / interfaces=${telemetry.networkInterfaceNames.length}.`
    );
  }

  if (observationKinds.length > 0) {
    lessons.push(
      `Karar ${observationKinds.join(", ")} gozlem turlerinden beslenen kanit zinciri uzerinden verildi.`
    );
  }

  return insertOutcome({
    id: `outcome-${slug(plan.id)}-${slug(stamp)}`,
    targetId,
    planId: plan.id,
    status: outcomeStatus,
    expectedResult:
      "Riskin kontrollu sekilde azaltilmasi ve remediation oncesi kanit zincirinin korunmasi.",
    actualResult:
      outcomeStatus === "success"
        ? `Plan ve critic uyumlu bulundu; uygulama yoluna hazir.${latestScan ? ` Son scan: ${latestScan.summary}` : ""}${latestScan && previousScan ? ` Delta: ${previousScan.id} -> ${latestScan.id}` : ""}`
        : outcomeStatus === "partial"
          ? `Karar ve critic sonucu kaydedildi, ancak insan onayi ya da revizyon gereksinimi suruyor.${latestScan ? ` Collector kaniti: ${latestScan.summary}` : ""}${latestScan && previousScan ? ` Scan delta: ${previousScan.id} -> ${latestScan.id}` : ""}${telemetry ? ` Host=${telemetry.hostname}, interfaces=${telemetry.networkInterfaceNames.join(", ") || "none"}` : ""}`
          : `Plan mevcut haliyle ilerleme icin uygun bulunmadi.${telemetry ? ` Runtime sinyali ${telemetry.hostname} uzerinden kaydedildi.` : ""}`,
    lessons,
    recordedAt: stamp
  });
}
