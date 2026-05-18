import type { PromptAnalysis, PromptExecutionReport } from "../../types/agent";
import { deriveExecutionContradictions } from "./integrity-engine";

type ExecutionObservation = PromptExecutionReport["observations"][number];
type ExecutionRisk = PromptExecutionReport["risks"][number];
type ReasoningTrace = PromptExecutionReport["reasoning"];

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function evidenceFromRisk(risk: ExecutionRisk): string[] {
  return risk.evidence?.length ? risk.evidence : [risk.rationale];
}

export function buildReasoningTrace(
  analysis: PromptAnalysis,
  observations: ExecutionObservation[],
  risks: ExecutionRisk[]
): ReasoningTrace {
  const contradictions = deriveExecutionContradictions({
    observations,
    risks
  });
  const supportKinds = unique([
    ...observations
      .filter((observation) => observation.confidence >= 0.7)
      .map((observation) => observation.kind),
    ...risks.flatMap((risk) => risk.sourceKinds)
  ]);

  const averageRiskScore =
    risks.length > 0
      ? risks.reduce((total, risk) => total + (risk.score ?? 0.45), 0) / risks.length
      : 0.38;
  const beliefStatus =
    averageRiskScore >= 0.78
      ? "supported"
      : averageRiskScore >= 0.56
        ? "tentative"
        : "weak";

  const hypotheses = risks.map((risk, index) => ({
    id: `hyp-${index + 1}-${risk.id}`,
    title: risk.title,
    status:
      risk.severity === "critical"
        ? "priority"
        : risk.severity === "high"
          ? "candidate"
          : "monitor",
    confidence: Math.min(
      0.97,
      Math.max(0.34, (risk.score ?? 0.45) * 0.82 + averageRiskScore * 0.18)
    ),
    rationale: `${risk.rationale} Bu hipotez ${risk.sourceKinds.join(", ")} sinyallerine dayanıyor.`,
    evidence: evidenceFromRisk(risk)
  }));

  const priorityHypothesis =
    hypotheses.find((hypothesis) => hypothesis.status === "priority") ??
    hypotheses.find((hypothesis) => hypothesis.status === "candidate") ??
    hypotheses[0];

  const primaryTarget =
    analysis.detectedTargets.length > 0
      ? analysis.detectedTargets.join(", ")
      : "genel güvenlik yüzeyi";
  const contradictionNote =
    contradictions.length > 0
      ? ` Ancak kanıt zincirinde şu tutarsızlıklar görüldü: ${contradictions.join(", ")}.`
      : "";

  return {
    belief: {
      summary: `${primaryTarget} için toplanan sinyaller risk tabanlı bir inanç durumuna dönüştürüldü.${contradictionNote}`,
      status: beliefStatus,
      confidence: Math.min(
        0.96,
        Math.max(
          0.32,
          observations.reduce((total, observation) => total + observation.confidence, 0) /
            Math.max(observations.length, 1) *
            0.5 +
            averageRiskScore * 0.5
        )
      ),
      supportingKinds: supportKinds
    },
    hypotheses,
    priorityHypothesisId: priorityHypothesis?.id ?? null,
    nextInference:
      contradictions.length > 0
        ? priorityHypothesis
          ? `${priorityHypothesis.title} hipotezini doğrulamadan önce contradiction kaynaklarını çöz ve critic zincirini yeniden çalıştır.`
          : `Kanıt zincirinde tutarsizlik tespit edildi (${contradictions.join(", ")}); önce observation/risk türetimini yenile.`
        : priorityHypothesis
          ? `${priorityHypothesis.title} hipotezini collector ve critic zincirinde önce doğrula.`
          : "Ek observation topla ve yeni hipotez üret."
  };
}

export function rerunReasoningTrace(
  analysis: PromptAnalysis,
  observations: ExecutionObservation[],
  risks: ExecutionRisk[]
): ReasoningTrace {
  return buildReasoningTrace(analysis, observations, risks);
}
