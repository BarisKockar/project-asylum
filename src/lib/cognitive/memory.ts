import {
  CognitiveBelief,
  CognitiveHypothesis,
  CognitiveObservation,
  CognitiveMemorySummary
} from "@/types/cognitive";
import { listOutcomes } from "@/lib/storage/repositories/cognitive-repository";
import {
  getMemorySummary,
  upsertMemorySummary
} from "@/lib/storage/repositories/memory-repository";

export function deriveMemorySummary(targetId: string): CognitiveMemorySummary {
  const outcomes = listOutcomes(targetId);
  const latestOutcome = outcomes[outcomes.length - 1] ?? null;
  const partialOutcomes = outcomes.filter(
    (outcome) => outcome.status === "partial"
  ).length;
  const failedOutcomes = outcomes.filter(
    (outcome) => outcome.status === "failed"
  ).length;

  return {
    targetId,
    totalOutcomes: outcomes.length,
    partialOutcomes,
    failedOutcomes,
    lastOutcomeStatus: latestOutcome?.status ?? null,
    effect:
      outcomes.length === 0
        ? "Henüz hafiza etkisi yok."
        : failedOutcomes > 0
          ? "Gecmis basarisizliklar yeni inanci daha temkinli hale getiriyor."
          : partialOutcomes > 0
            ? "Gecmis partial sonuclar yeni plani daha dikkatli kuruyor."
            : "Gecmis sonuclar yeni reasoning'i destekliyor.",
    updatedAt: new Date().toISOString()
  };
}

export function getOrDeriveMemorySummary(targetId: string) {
  return getMemorySummary(targetId) ?? deriveMemorySummary(targetId);
}

export function refreshMemorySummary(targetId: string) {
  return upsertMemorySummary(deriveMemorySummary(targetId));
}

export function deriveBeliefStatusFromMemory(
  summary: CognitiveMemorySummary
): CognitiveBelief["status"] {
  if (summary.failedOutcomes > 0) {
    return "tentative";
  }

  if (summary.partialOutcomes >= 5) {
    return "stale";
  }

  return "supported";
}

export function deriveBeliefStatusFromSignals(params: {
  summary: CognitiveMemorySummary;
  observations: Pick<CognitiveObservation, "kind" | "confidence">[];
}): CognitiveBelief["status"] {
  const memoryStatus = deriveBeliefStatusFromMemory(params.summary);
  const kinds = new Set(params.observations.map((observation) => observation.kind));
  const hasNetwork = kinds.has("network");
  const hasRuntime = kinds.has("runtime");
  const hasProcess = kinds.has("process");
  const hasIdentity = kinds.has("identity");
  const highConfidenceSignals = params.observations.filter(
    (observation) => observation.confidence === "high"
  ).length;

  if (memoryStatus === "stale") {
    return "stale";
  }

  if (hasNetwork && !hasRuntime && !hasProcess) {
    return "tentative";
  }

  if (memoryStatus === "tentative" && hasRuntime && hasProcess && highConfidenceSignals > 0) {
    return "supported";
  }

  if (hasIdentity && !hasRuntime && !hasProcess) {
    return "tentative";
  }

  return memoryStatus;
}

export function deriveHypothesisStatusFromMemory(
  summary: CognitiveMemorySummary
): CognitiveHypothesis["status"] {
  if (summary.failedOutcomes >= 2) {
    return "discarded";
  }

  if (summary.partialOutcomes >= 4) {
    return "candidate";
  }

  return "prioritized";
}

export function deriveHypothesisStatusFromSignals(params: {
  summary: CognitiveMemorySummary;
  observations: Pick<CognitiveObservation, "kind" | "confidence">[];
}): CognitiveHypothesis["status"] {
  const memoryStatus = deriveHypothesisStatusFromMemory(params.summary);
  const kinds = new Set(params.observations.map((observation) => observation.kind));
  const hasNetwork = kinds.has("network");
  const hasRuntime = kinds.has("runtime");
  const hasProcess = kinds.has("process");
  const highConfidenceSignals = params.observations.filter(
    (observation) => observation.confidence === "high"
  ).length;

  if (memoryStatus === "discarded") {
    return "discarded";
  }

  if (hasNetwork && !hasRuntime && !hasProcess) {
    return "candidate";
  }

  if (memoryStatus === "candidate" && hasRuntime && hasProcess && highConfidenceSignals > 0) {
    return "prioritized";
  }

  return memoryStatus;
}

export function deriveHypothesisUncertaintyFromSignals(params: {
  baseUncertainty: number;
  observations: Pick<CognitiveObservation, "kind" | "confidence">[];
}) {
  const kinds = new Set(params.observations.map((observation) => observation.kind));
  const hasNetwork = kinds.has("network");
  const hasRuntime = kinds.has("runtime");
  const hasProcess = kinds.has("process");
  const highConfidenceSignals = params.observations.filter(
    (observation) => observation.confidence === "high"
  ).length;

  let uncertainty = params.baseUncertainty;

  if (hasNetwork && !hasRuntime && !hasProcess) {
    uncertainty += 0.08;
  }

  if (hasRuntime && hasProcess) {
    uncertainty -= 0.04;
  }

  if (highConfidenceSignals > 0) {
    uncertainty -= 0.03;
  }

  return Math.max(0.12, Math.min(0.9, Number(uncertainty.toFixed(2))));
}
