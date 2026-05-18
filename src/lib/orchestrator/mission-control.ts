import { Finding, PipelineRun, SecurityWorkflowStage } from "@/types/security";
import {
  getProjectBlueprint,
  getSystemSnapshot,
  insertRun
} from "@/lib/storage/repositories/system-repository";

function pickPriorityFinding(findings: Finding[]) {
  return [...findings].sort((left, right) => {
    const score = { critical: 4, high: 3, medium: 2, low: 1 };
    return score[right.severity] - score[left.severity];
  })[0];
}

function nextStage(stages: SecurityWorkflowStage[]) {
  return stages.find((stage) => stage.status === "planned")?.name ?? "Reporting";
}

export function getMissionControlState() {
  const snapshot = getSystemSnapshot();
  const blueprint = getProjectBlueprint();
  const priorityFinding = pickPriorityFinding(snapshot.findings);
  const activeRun = blueprint.currentRuns[0];

  return {
    activeRun,
    priorityFinding,
    nextStage: nextStage(snapshot.workflow),
    policy: blueprint.runtimePolicy
  };
}

export function queueLocalRun(target: string): PipelineRun {
  const run = {
    id: `run-${target.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-001`,
    target,
    status: "queued",
    currentStage: "discovery",
    startedAt: new Date().toISOString(),
    summary:
      "Yerel orkestrasyon kuyruğuna alindi. Gercek worker entegrasyonu sonraki adimda baglanacak."
  };

  return insertRun(run);
}
