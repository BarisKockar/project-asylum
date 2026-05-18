import { collectLocalSystemSnapshot } from "@/lib/collectors/local-system-collector";
import { runDeterministicReasoningWithContext } from "@/lib/cognitive/deterministic-reasoner";
import {
  getCollectorSummary,
  listAssets,
  listOperationalScans
} from "@/lib/storage/repositories/system-repository";

function resolveReasoningTarget(target: string) {
  if (target === "localhost") {
    return "asset-localhost-core";
  }

  return (
    listAssets().find((asset) => asset.target === target)?.id ??
    "asset-localhost-core"
  );
}

export function runLocalCycle(target = "localhost") {
  const collectorSummary = collectLocalSystemSnapshot(target);
  const reasoningTarget = resolveReasoningTarget(target);
  const operationalScans = listOperationalScans(reasoningTarget);
  const reasoningResult = runDeterministicReasoningWithContext(reasoningTarget, {
    collectorSummary,
    asset:
      collectorSummary.assets.find((asset) => asset.id === reasoningTarget) ??
      collectorSummary.assets.find((asset) => asset.target === target) ??
      null,
    latestScan: operationalScans[0] ?? null
  });

  return {
    target,
    reasoningTarget,
    collectorSummary,
    reasoningResult,
    updatedCollectorSummary: getCollectorSummary()
  };
}
