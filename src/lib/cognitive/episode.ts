import { getCognitiveEpisode as getStoredCognitiveEpisode } from "@/lib/storage/repositories/cognitive-repository";
import { critiquePlan } from "@/lib/cognitive/critic";
import { getOrDeriveMemorySummary } from "@/lib/cognitive/memory";
import { listCritiques } from "@/lib/storage/repositories/critic-repository";
import { getRuntimePolicy } from "@/lib/storage/repositories/system-repository";

export function describeDecisionStatus(status?: string | null) {
  switch (status) {
    case "accepted":
      return "Uygulamaya hazir";
    case "awaiting-approval":
      return "Insan onayi bekliyor";
    case "deferred":
      return "Ek karar bekliyor";
    case "blocked":
      return "Bloklandi";
    case "proposed":
      return "Oneri hazir";
    default:
      return "Kayit yok";
  }
}

export function mapDecisionStatusTone(status?: string | null) {
  switch (status) {
    case "accepted":
      return "active";
    case "awaiting-approval":
      return "planned";
    case "blocked":
      return "blocked";
    case "deferred":
      return "planned";
    default:
      return "planned";
  }
}

export function getCognitiveEpisode(targetId = "asset-localhost-core") {
  return getStoredCognitiveEpisode(targetId);
}

export function getCognitiveTraceSummary() {
  const episode = getCognitiveEpisode();
  const latestPlan = episode.plans[episode.plans.length - 1] ?? null;
  const critique =
    listCritiques(episode.targetId).at(-1) ?? critiquePlan(latestPlan, getRuntimePolicy());
  const latestOutcome = episode.outcomes[episode.outcomes.length - 1] ?? null;
  const memorySummary = getOrDeriveMemorySummary(episode.targetId);

  return {
    targetId: episode.targetId,
    observationCount: episode.observations.length,
    beliefCount: episode.beliefs.length,
    hypothesisCount: episode.hypotheses.length,
    planCount: episode.plans.length,
    decisionCount: episode.decisions.length,
    latestPlan,
    latestDecision: episode.decisions[episode.decisions.length - 1] ?? null,
    latestOutcome,
    critique,
    memorySummary
  };
}
