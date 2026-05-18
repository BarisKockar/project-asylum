import { projectBlueprint } from "@/data/blueprint";
import { cognitiveSeed } from "@/data/cognitive-seed";
import { systemSnapshot } from "@/data/mock-security";
import {
  seedAssets,
  seedAuditLogs,
  seedPolicies,
  seedScans
} from "@/data/operations";

export function getSeedBundle() {
  return {
    runtimePolicy: projectBlueprint.runtimePolicy,
    workflow: systemSnapshot.workflow,
    findings: systemSnapshot.findings,
    playbooks: systemSnapshot.playbooks,
    components: projectBlueprint.components,
    runs: projectBlueprint.currentRuns,
    assets: seedAssets,
    scans: seedScans,
    policies: seedPolicies,
    auditLogs: seedAuditLogs,
    cognitiveEpisode: cognitiveSeed
  };
}
