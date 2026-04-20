import type { PromptAnalysis, PromptExecutionReport } from "../../types/agent";

type ExecutionObservation = PromptExecutionReport["observations"][number];
type ExecutionRisk = PromptExecutionReport["risks"][number];
type ObservationMetadata = Record<string, unknown>;

function getMetadata(observation?: ExecutionObservation): ObservationMetadata {
  return observation?.metadata ?? {};
}

function getStringArray(
  metadata: ObservationMetadata,
  key: string
): string[] {
  const value = metadata[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function getNumberArray(
  metadata: ObservationMetadata,
  key: string
): number[] {
  const value = metadata[key];
  return Array.isArray(value)
    ? value.filter((item): item is number => typeof item === "number")
    : [];
}

function severityWeight(severity: string): number {
  switch (severity) {
    case "critical":
      return 0.95;
    case "high":
      return 0.82;
    case "medium":
      return 0.61;
    default:
      return 0.38;
  }
}

export function scoreExecutionRisks(
  analysis: PromptAnalysis,
  observations: ExecutionObservation[]
): ExecutionRisk[] {
  const risks: ExecutionRisk[] = [];

  const networkObservation = observations.find(
    (observation) => observation.kind === "network-surface"
  );
  const networkMetadata = getMetadata(networkObservation);
  const reviewPorts = getNumberArray(networkMetadata, "reviewPorts");
  const ports = getNumberArray(networkMetadata, "ports");
  if (networkObservation && analysis.detectedTargets.includes("network-surface")) {
    const severity =
      reviewPorts.length > 0 || analysis.urgency === "high" ? "high" : "medium";
    risks.push({
      id: "risk-network-exposure",
      severity,
      title: "Ağ yüzeyi görünürlüğü",
      rationale: reviewPorts.length
        ? `Dinleyen portlar arasinda inceleme gerektiren servisler var: ${reviewPorts.join(", ")}.`
        : "Açık port veya erişilebilir servis sinyali bulunduğu için dışa açık saldırı yüzeyi büyüyor.",
      sourceKinds: ["network-surface", "plan"]
      ,
      score: severityWeight(severity),
      evidence: ports.length
        ? [`Dinleyen portlar: ${ports.join(", ")}`]
        : [networkObservation.detail]
    });
  }

  const processObservation = observations.find(
    (observation) => observation.kind === "process-surface"
  );
  const processMetadata = getMetadata(processObservation);
  const reviewProcesses = getStringArray(processMetadata, "reviewProcesses");
  if (processObservation) {
    const severity = reviewProcesses.length > 0 ? "high" : "medium";
    risks.push({
      id: "risk-process-review",
      severity,
      title: "Yerel süreç inceleme gereksinimi",
      rationale: reviewProcesses.length
        ? `Daha yakindan incelenmesi gereken surecler tespit edildi: ${reviewProcesses.join(", ")}.`
        : "Süreç yüzeyi toplandı; servislerin beklenen mi yoksa gereksiz mi olduğunu ayırmak için inceleme gerekiyor.",
      sourceKinds: ["process-surface", "host-runtime"]
      ,
      score: severityWeight(severity),
      evidence: reviewProcesses.length
        ? [`Inceleme gerektiren surecler: ${reviewProcesses.join(", ")}`]
        : [processObservation.detail]
    });
  }

  const configObservation = observations.find(
    (observation) => observation.kind === "configuration"
  );
  const configMetadata = getMetadata(configObservation);
  const riskySignals = getStringArray(configMetadata, "riskySignals");
  if (configObservation && analysis.detectedTargets.includes("configuration")) {
    const severity =
      riskySignals.length > 1 || analysis.suggestedMode === "remediate"
        ? "high"
        : "medium";
    risks.push({
      id: "risk-config-hardening",
      severity,
      title: "Config hardening ihtiyacı",
      rationale: riskySignals.length
        ? `Konfigürasyonda sertlestirme gerektirebilecek sinyaller var: ${riskySignals.join(", ")}.`
        : "Konfigürasyon odaklı istek algılandı; güvenli varsayılanların doğrulanması gerekiyor.",
      sourceKinds: ["configuration", "policy"]
      ,
      score: severityWeight(severity),
      evidence: riskySignals.length ? riskySignals : [configObservation.detail]
    });
  }

  const telemetryObservation = observations.find(
    (observation) => observation.kind === "telemetry"
  );
  const telemetryMetadata = getMetadata(telemetryObservation);
  const securitySignals = getStringArray(telemetryMetadata, "securitySignals");
  if (telemetryObservation && securitySignals.length > 0) {
    const severity = securitySignals.length > 2 ? "high" : "medium";
    risks.push({
      id: "risk-log-anomaly",
      severity,
      title: "Log tabanlı güvenlik sinyali",
      rationale: `Log örneklerinde dikkat gerektiren sinyaller bulundu: ${securitySignals.slice(0, 3).join(" | ")}.`,
      sourceKinds: ["telemetry", "policy"],
      score: severityWeight(severity),
      evidence: securitySignals.slice(0, 5)
    });
  }

  if (analysis.detectedTargets.includes("admin-panel")) {
    const severity = reviewPorts.some((port) => [8000, 8080, 8443, 9000].includes(port))
      ? "critical"
      : "high";
    risks.push({
      id: "risk-admin-surface",
      severity,
      title: "Admin panel yüzeyi",
      rationale:
        "Yönetim yüzeyi talebi tespit edildiği için kimlik doğrulama ve erişim kontrolü riski öncelikli ele alınmalı.",
      sourceKinds: ["admin-surface", "policy"]
      ,
      score: severityWeight(severity),
      evidence:
        reviewPorts.length > 0
          ? [`Admin yuzeyiyle iliskili portlar: ${reviewPorts.join(", ")}`]
          : ["Admin panel hedefi dogrudan istendi."]
    });
  }

  if (analysis.constraints.includes("safe-first")) {
    risks.push({
      id: "risk-safe-first-gate",
      severity: "medium",
      title: "Güvenli çalışma kapısı",
      rationale:
        "Kullanıcı güvenli çalışma istediği için doğrulanmamış aksiyonlar doğrudan uygulanmamalı.",
      sourceKinds: ["policy", "plan"]
      ,
      score: severityWeight("medium"),
      evidence: ["safe-first politikasi aktif"]
    });
  }

  return risks;
}
