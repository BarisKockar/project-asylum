import {
  getProjectBlueprint,
  getSystemSnapshot
} from "@/lib/storage/repositories/system-repository";

export function getDashboardSnapshot() {
  const snapshot = getSystemSnapshot();
  const blueprint = getProjectBlueprint();

  return {
    snapshot,
    blueprint,
    metrics: {
      findingCount: snapshot.findings.length,
      playbookCount: snapshot.playbooks.length,
      activeStages: snapshot.workflow.filter(
        (stage) => stage.status === "active"
      ).length,
      localOnly: blueprint.runtimePolicy.localOnly
    }
  };
}
