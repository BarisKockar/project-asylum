import {
  CognitiveBelief,
  CognitiveDecision,
  CognitiveGoal,
  CognitiveHypothesis,
  CognitiveObservation,
  CognitivePlan
} from "@/types/cognitive";
import { Finding } from "@/types/security";
import { critiquePlan } from "@/lib/cognitive/critic";
import {
  deriveBeliefStatusFromSignals,
  deriveHypothesisStatusFromSignals,
  deriveHypothesisUncertaintyFromSignals,
  deriveHypothesisStatusFromMemory,
  getOrDeriveMemorySummary,
  refreshMemorySummary
} from "@/lib/cognitive/memory";
import { reflectOnDecision } from "@/lib/cognitive/reflector";
import { insertCritique } from "@/lib/storage/repositories/critic-repository";
import {
  insertBelief,
  insertDecision,
  insertGoal,
  insertHypothesis,
  insertObservation,
  insertPlan,
  listDecisions
} from "@/lib/storage/repositories/cognitive-repository";
import {
  insertAuditLog,
  isOperationalScan,
  listFindings,
  listPolicies,
  getRuntimePolicy
} from "@/lib/storage/repositories/system-repository";
import {
  AssetRecord,
  CollectorSummary,
  CollectorTelemetry,
  ScanRecord
} from "@/types/security";

const severityScore = {
  critical: 0.92,
  high: 0.8,
  medium: 0.62,
  low: 0.35
};

function slug(value: string) {
  return value.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
}

function pickPriorityFinding(targetId: string) {
  const findings = listFindings().filter((finding) => {
    if (targetId === "asset-localhost-core") {
      return true;
    }

    return finding.asset === targetId || finding.asset === "localhost";
  });

  return findings.sort((left, right) => {
    return severityScore[right.severity] - severityScore[left.severity];
  })[0] ?? null;
}

function buildObservation(targetId: string, finding: Finding, stamp: string): CognitiveObservation {
  return {
    id: `obs-${slug(finding.id)}-${slug(stamp)}`,
    targetId,
    kind: "configuration",
    source: "deterministic-reasoner",
    summary: `${finding.title} bulgusu deterministic reasoner tarafindan inceleme adimina alindi.`,
    evidence: finding.evidence,
    confidence: finding.severity === "critical" ? "high" : "medium",
    observedAt: stamp
  };
}

function buildCollectorObservations(params: {
  targetId: string;
  stamp: string;
  latestScan?: ScanRecord | null;
  assetContext?: AssetRecord | null;
  telemetry?: CollectorTelemetry | null;
}) {
  const { targetId, stamp, latestScan, assetContext, telemetry } = params;
  const observations: CognitiveObservation[] = [];

  if (latestScan) {
    observations.push({
      id: `obs-scan-${slug(latestScan.id)}-${slug(stamp)}`,
      targetId,
      kind: "process",
      source: "local-collector",
      summary: `Collector son scan kaydini aktardi: ${latestScan.summary}`,
      evidence: [
        `Scan status: ${latestScan.status}`,
        `Scan kind: ${latestScan.kind}`,
        `Scan started at: ${latestScan.startedAt}`
      ],
      confidence: "medium",
      observedAt: stamp
    });
  }

  if (assetContext) {
    observations.push({
      id: `obs-asset-${slug(assetContext.id)}-${slug(stamp)}`,
      targetId,
      kind: "identity",
      source: "local-collector",
      summary: `Collector asset baglami kaydetti: ${assetContext.name}`,
      evidence: [
        `Asset environment: ${assetContext.environment}`,
        `Asset criticality: ${assetContext.criticality}`,
        `Asset owner: ${assetContext.owner}`
      ],
      confidence: "medium",
      observedAt: stamp
    });
  }

  if (telemetry) {
    observations.push(
      {
        id: `obs-identity-${slug(telemetry.hostname)}-${slug(stamp)}`,
        targetId,
        kind: "identity",
        source: "local-collector",
        summary: `Collector host kimligini kaydetti: ${telemetry.hostname}`,
        evidence: [
          `Platform: ${telemetry.platform}`,
          `Release: ${telemetry.release}`,
          `Architecture: ${telemetry.arch}`,
          `Primary user: ${telemetry.primaryUser}`
        ],
        confidence: "high",
        observedAt: stamp
      },
      {
        id: `obs-network-${slug(telemetry.hostname)}-${slug(stamp)}`,
        targetId,
        kind: "network",
        source: "local-collector",
        summary: "Collector network yuzey ozetini kaydetti.",
        evidence: [
          `Interfaces: ${telemetry.networkInterfaceNames.join(", ") || "none-detected"}`,
          `Load average: ${telemetry.loadAverage.join(", ")}`,
          `CPU count: ${telemetry.cpuCount}`
        ],
        confidence: "medium",
        observedAt: stamp
      },
      {
        id: `obs-runtime-${slug(telemetry.hostname)}-${slug(stamp)}`,
        targetId,
        kind: "runtime",
        source: "local-collector",
        summary: "Collector runtime saglik sinyalini kaydetti.",
        evidence: [
          `Uptime seconds: ${telemetry.uptimeSeconds}`,
          `CPU count: ${telemetry.cpuCount}`,
          `Load average: ${telemetry.loadAverage.join(", ")}`
        ],
        confidence: "medium",
        observedAt: stamp
      }
    );
  }

  return observations;
}

type ReasoningContext = {
  collectorSummary?: CollectorSummary;
  asset?: AssetRecord | null;
  latestScan?: ScanRecord | null;
};

function pickLatestScan(
  collectorSummary?: CollectorSummary,
  targetId?: string
) {
  const scans = collectorSummary?.scans ?? [];
  const operationalScans = scans.filter((scan) => isOperationalScan(scan));
  if (operationalScans.length === 0) {
    return null;
  }

  if (!targetId || targetId === "asset-localhost-core") {
    return operationalScans[0] ?? null;
  }

  return operationalScans.find((scan) => scan.assetId === targetId) ?? operationalScans[0] ?? null;
}

function pickPreviousScan(
  collectorSummary?: CollectorSummary,
  latestScan?: ScanRecord | null,
  targetId?: string
) {
  if (!collectorSummary || !latestScan) {
    return null;
  }

  const scans = collectorSummary.scans.filter((scan) => {
    if (!isOperationalScan(scan)) {
      return false;
    }

    return !targetId || targetId === "asset-localhost-core" ? true : scan.assetId === targetId;
  });

  const latestIndex = scans.findIndex((scan) => scan.id === latestScan.id);
  if (latestIndex < 0) {
    return null;
  }

  return scans[latestIndex + 1] ?? null;
}

function summarizeObservationProfile(observations: CognitiveObservation[]) {
  const kinds = Array.from(new Set(observations.map((observation) => observation.kind)));

  return {
    kinds,
    hasNetwork: kinds.includes("network"),
    hasRuntime: kinds.includes("runtime"),
    hasIdentity: kinds.includes("identity"),
    hasProcess: kinds.includes("process")
  };
}

function derivePlanConfidenceFromSignals(params: {
  baseConfidence: number;
  profile: ReturnType<typeof summarizeObservationProfile>;
  observations: Pick<CognitiveObservation, "confidence">[];
}) {
  const highConfidenceSignals = params.observations.filter(
    (observation) => observation.confidence === "high"
  ).length;
  let confidence = params.baseConfidence;

  if (params.profile.hasRuntime && params.profile.hasProcess) {
    confidence += 0.04;
  }

  if (params.profile.hasIdentity) {
    confidence += 0.02;
  }

  if (params.profile.hasNetwork && !params.profile.hasRuntime && !params.profile.hasProcess) {
    confidence -= 0.08;
  }

  if (highConfidenceSignals > 0) {
    confidence += 0.02;
  }

  return Math.max(0.35, Math.min(0.82, Number(confidence.toFixed(2))));
}

function deriveBlastRadiusFromSignals(params: {
  defaultBlastRadius: CognitivePlan["blastRadius"];
  profile: ReturnType<typeof summarizeObservationProfile>;
}) {
  if (params.defaultBlastRadius === "broad") {
    return "broad" as const;
  }

  if (params.profile.hasNetwork && params.profile.hasIdentity) {
    return "moderate" as const;
  }

  if (params.profile.hasRuntime && params.profile.hasProcess && !params.profile.hasNetwork) {
    return "restricted" as const;
  }

  return params.defaultBlastRadius;
}

export function runDeterministicReasoning(targetId = "asset-localhost-core") {
  return runDeterministicReasoningWithContext(targetId);
}

export function runDeterministicReasoningWithContext(
  targetId = "asset-localhost-core",
  context: ReasoningContext = {}
) {
  const finding = pickPriorityFinding(targetId);
  if (!finding) {
    throw new Error(`No finding available for target ${targetId}`);
  }

  const stamp = new Date().toISOString();
  const suffix = slug(stamp);
  const approvalPolicy = listPolicies().find((policy) => policy.id === "policy-high-risk-approval");
  const memorySummary = getOrDeriveMemorySummary(targetId);
  const latestScan = context.latestScan ?? pickLatestScan(context.collectorSummary, targetId);
  const previousScan = pickPreviousScan(
    context.collectorSummary,
    latestScan,
    targetId
  );
  const assetContext =
    context.asset ??
    context.collectorSummary?.assets.find((asset) => asset.id === targetId) ??
    context.collectorSummary?.assets.at(-1) ??
    null;
  const collectorObservations = buildCollectorObservations({
    targetId,
    stamp,
    latestScan,
    assetContext,
    telemetry: context.collectorSummary?.telemetry ?? null
  }).map((observation) => insertObservation(observation));

  const observation = insertObservation({
    ...buildObservation(targetId, finding, stamp),
    summary:
      memorySummary.totalOutcomes > 0
        ? `${finding.title} bulgusu deterministic reasoner tarafindan inceleme adimina alindi. Gecmis outcome kayitlari: ${memorySummary.totalOutcomes}, partial: ${memorySummary.partialOutcomes}, failed: ${memorySummary.failedOutcomes}.`
        : `${finding.title} bulgusu deterministic reasoner tarafindan inceleme adimina alindi.`,
    evidence: [
      ...finding.evidence,
      ...(latestScan ? [`Collector latest scan: ${latestScan.summary}`] : []),
      ...(assetContext
        ? [`Collector asset context: ${assetContext.name} (${assetContext.environment})`]
        : [])
    ]
  });
  const observationProfile = summarizeObservationProfile([
    observation,
    ...collectorObservations
  ]);
  const derivedBeliefStatus = deriveBeliefStatusFromSignals({
    summary: memorySummary,
    observations: [observation, ...collectorObservations].map((item) => ({
      kind: item.kind,
      confidence: item.confidence
    }))
  });
  const observationSignals = [observation, ...collectorObservations].map((item) => ({
    kind: item.kind,
    confidence: item.confidence
  }));
  const derivedHypothesisStatus = deriveHypothesisStatusFromSignals({
    summary: memorySummary,
    observations: observationSignals
  });

  const memoryPenalty =
    memorySummary.partialOutcomes * 0.04 + memorySummary.failedOutcomes * 0.1;
  const adjustedConfidence = Math.max(
    0.4,
    severityScore[finding.severity] - memoryPenalty
  );
  const adjustedUncertainty = Math.min(
    0.75,
    (finding.requiresApproval ? 0.28 : 0.18) +
      memorySummary.partialOutcomes * 0.05 +
      memorySummary.failedOutcomes * 0.12
  );
  const signalAdjustedUncertainty = deriveHypothesisUncertaintyFromSignals({
    baseUncertainty: adjustedUncertainty,
    observations: observationSignals
  });
  const basePlanConfidence = Math.max(0.45, adjustedConfidence - 0.08);
  const signalAdjustedPlanConfidence = derivePlanConfidenceFromSignals({
    baseConfidence: basePlanConfidence,
    profile: observationProfile,
    observations: observationSignals
  });
  const signalAdjustedBlastRadius = deriveBlastRadiusFromSignals({
    defaultBlastRadius: finding.requiresApproval ? "moderate" : "restricted",
    profile: observationProfile
  });

  const belief: CognitiveBelief = insertBelief({
    id: `belief-${slug(finding.id)}-${suffix}`,
    targetId,
    statement: `${finding.asset} varliginda ${finding.title.toLowerCase()} kaynagina dayanan risk durumu mevcut.`,
    basisObservationIds: [observation.id, ...collectorObservations.map((item) => item.id)],
    confidence: adjustedConfidence,
    status: derivedBeliefStatus,
    updatedAt: stamp
  });

  const hypothesis: CognitiveHypothesis = insertHypothesis({
    id: `hyp-${slug(finding.id)}-${suffix}`,
    targetId,
    title: `${finding.title} risk hipotezi`,
    explanation: finding.summary,
    supportingBeliefIds: [belief.id],
    riskScore: adjustedConfidence,
    uncertaintyScore: signalAdjustedUncertainty,
    status: derivedHypothesisStatus,
    updatedAt: stamp
  });

  const goal: CognitiveGoal = insertGoal({
    id: `goal-${slug(finding.id)}-${suffix}`,
    targetId,
    kind: finding.requiresApproval ? "verify" : "remediate",
    intent: finding.requiresApproval
      ? "Yuksek riskli bulguyu oncesinde dogrula, sonra kontrollu sinirla."
      : "Dogrulanabilir dusuk etki alani olan bulguyu hizli ve geri alinabilir sekilde kapat.",
    priority: Math.round(adjustedConfidence * 100),
    createdAt: stamp
  });

  const plan: CognitivePlan = insertPlan({
    id: `plan-${slug(finding.id)}-${suffix}`,
    targetId,
    goalId: goal.id,
    hypothesisIds: [hypothesis.id],
    rationale:
      memorySummary.totalOutcomes > 0
        ? `En oncelikli bulgu ${finding.id} icin once kanit gucunu koruyan, sonra etkiyi azaltan adim secildi. Gecmis outcome hafizasi yeni plani daha temkinli hale getirdi.${observationProfile.hasNetwork ? " Network sinyali etki alani degerlendirmesini sertlestirdi." : ""}${observationProfile.hasIdentity ? " Identity baglami varlik kritikligini belirginlestirdi." : ""}${observationProfile.hasRuntime || observationProfile.hasProcess ? " Runtime/process sinyalleri canli dogrulama adimini destekledi ve plan guvenini ayarladi." : ""}`
        : `En oncelikli bulgu ${finding.id} icin once kanit gucunu koruyan, sonra etkiyi azaltan adim secildi.${observationProfile.hasNetwork ? " Network sinyali etki alani degerlendirmesini sertlestirdi." : ""}${observationProfile.hasIdentity ? " Identity baglami varlik kritikligini belirginlestirdi." : ""}${observationProfile.hasRuntime || observationProfile.hasProcess ? " Runtime/process sinyalleri canli dogrulama adimini destekledi ve plan guvenini ayarladi." : ""}`,
    blastRadius: signalAdjustedBlastRadius,
    confidence: signalAdjustedPlanConfidence,
    status: finding.requiresApproval ? "critic-review" : "approved",
    steps: [
      {
        id: `step-verify-${suffix}`,
        title: "Kaniti ve etki alanini yeniden dogrula",
        actionType: "verify-evidence",
        requiresApproval: false,
        rollbackHint: null
      },
      {
        id: `step-limit-${suffix}`,
        title: "Erisim yuzeyini veya zafiyet kosulunu sinirla",
        actionType: "limit-risk",
        requiresApproval: finding.requiresApproval,
        rollbackHint: "restore previous service policy"
      },
      {
        id: `step-report-${suffix}`,
        title: "Karari ve beklenen etkiyi audit kaydina isle",
        actionType: "record-decision",
        requiresApproval: false,
        rollbackHint: null
      }
    ],
    createdAt: stamp
  });

  const critique = insertCritique({
    id: `critique-${slug(finding.id)}-${suffix}`,
    ...critiquePlan(plan, getRuntimePolicy(), {
      observations: [observation, ...collectorObservations].map((item) => ({
        kind: item.kind,
        confidence: item.confidence
      }))
    })
  });
  const decision: CognitiveDecision = insertDecision({
    id: `decision-${slug(finding.id)}-${suffix}`,
    targetId,
    selectedPlanId: plan.id,
    status:
      finding.requiresApproval && critique.verdict === "approve"
        ? "awaiting-approval"
        : critique.verdict !== "approve"
          ? "deferred"
        : "accepted",
    justification:
      finding.requiresApproval && critique.verdict === "approve"
        ? `Plan critic tarafindan uygun bulundu ancak ${approvalPolicy?.name ?? "approval policy"} nedeniyle insan onayi bekleniyor.`
        : finding.requiresApproval
          ? `Plan hazirlandi ancak ${approvalPolicy?.name ?? "approval policy"} nedeniyle insan onayi bekleniyor.`
          : critique.verdict === "approve"
            ? "Risk sinirli ve critic onayi alindigi icin deterministic plan uygulamaya uygun olarak isaretlendi."
            : "Plan ek critic incelemesi tamamlanmadan uygulamaya acilmadi.",
    blockedBy:
      critique.verdict === "approve"
        ? finding.requiresApproval
          ? ["human-approval"]
          : []
        : finding.requiresApproval
          ? ["human-approval", "critic-review"]
          : ["critic-review"],
    createdAt: stamp
  });
  insertAuditLog({
    id: `audit-critic-${slug(finding.id)}-${suffix}`,
    actor: "critic-engine",
    action: "critique_plan",
    targetType: "cognitive_plan",
    targetId: plan.id,
    level: critique.verdict === "block" ? "error" : critique.verdict === "revise" ? "warning" : "info",
    details: `Critic verdict=${critique.verdict}; reasons=${critique.reasons.join(" | ")}`,
    createdAt: stamp
  });

  const outcome = reflectOnDecision({
    targetId,
    decision,
    plan,
    critique,
    latestScan,
    previousScan,
    telemetry: context.collectorSummary?.telemetry ?? null,
    observationKinds: [
      observation.kind,
      ...collectorObservations.map((item) => item.kind)
    ]
  });
  const updatedMemorySummary = refreshMemorySummary(targetId);

  return {
    targetId,
    sourceFinding: finding,
    observation,
    belief,
    hypothesis,
    goal,
    plan,
    decision,
    critique,
    outcome,
    memorySummary: updatedMemorySummary,
    latestScan,
    decisionCount: listDecisions(targetId).length
  };
}
