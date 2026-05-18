import type {
  ApprovalRecord,
  DryRunAction,
  DryRunActionClass,
  DryRunActionStatus,
  DryRunBlastRadius,
  DryRunReport,
  PromptAnalysis,
  PromptExecutionReport
} from "../../types/agent";
import { findLiveApprovalFor } from "./approval-engine";

type ExecutionRisk = PromptExecutionReport["risks"][number];
type ExecutionDecision = PromptExecutionReport["decision"];
type ExecutionObservation = PromptExecutionReport["observations"][number];
type TrustAssessment = NonNullable<PromptExecutionReport["trust"]>;
type IntegrityReport = NonNullable<PromptExecutionReport["integrity"]>;

type ActionTemplate = {
  class: DryRunActionClass;
  target: (input: ActionInput) => string;
  intent: (input: ActionInput) => string;
  reversible: boolean;
  blastRadius: DryRunBlastRadius;
  evidenceRequired: string[];
};

type ActionInput = {
  risk: ExecutionRisk;
  observations: ExecutionObservation[];
};

function getNetworkReviewPorts(
  observations: ExecutionObservation[]
): number[] {
  const network = observations.find(
    (observation) => observation.kind === "network-surface"
  );
  const metadata = network?.metadata ?? {};
  const value = metadata.reviewPorts;
  return Array.isArray(value)
    ? value.filter((entry): entry is number => typeof entry === "number")
    : [];
}

function describeReviewPorts(ports: number[]): string {
  if (ports.length === 0) {
    return "tanimli-degil";
  }

  return ports.slice(0, 5).join(", ");
}

// Risk family → candidate action templates. One risk can map to multiple
// candidates (e.g. admin-surface deserves both isolation and credential
// rotation). Phase 1 keeps each candidate single-target so dashboards can
// render them without joining.
const ACTION_TEMPLATES: Record<string, ActionTemplate[]> = {
  "risk-network-exposure": [
    {
      class: "network-isolation",
      target: ({ observations }) =>
        `tcp:${describeReviewPorts(getNetworkReviewPorts(observations))}`,
      intent: ({ observations }) => {
        const ports = getNetworkReviewPorts(observations);
        return ports.length > 0
          ? `Inceleme bekleyen TCP portlarini (${describeReviewPorts(ports)}) host firewall'inde dis erisime kapat.`
          : "Dinleyen servisleri gozden gecir; dis dunyaya acik kalmasi gerekmeyen portlari host firewall'inde kapat.";
      },
      reversible: true,
      blastRadius: "narrow",
      evidenceRequired: [
        "network-surface observation tekrar tetiklenmis olmali",
        "review-task tamamlanmis olmali",
        "etkilenecek servisin meshru kullanicisi yok onayı"
      ]
    }
  ],
  "risk-admin-surface": [
    {
      class: "network-isolation",
      target: ({ observations }) =>
        `admin-panel-tcp:${describeReviewPorts(getNetworkReviewPorts(observations))}`,
      intent:
        () =>
          "Admin panel portlarini sadece yonetim VLAN'i veya bastion ile erisilebilir hale getir.",
      reversible: true,
      blastRadius: "moderate",
      evidenceRequired: [
        "admin-panel hedefi gerçekten dışa açık mı doğrulamak için ek collector",
        "operator/owner onayi",
        "rollback komutu hazır olmali"
      ]
    },
    {
      class: "access-rotation",
      target: () => "admin-credentials",
      intent: () =>
        "Admin yuzeyine ait kimlik bilgilerini dondur; eski oturumlari sonlandir.",
      reversible: false,
      blastRadius: "moderate",
      evidenceRequired: [
        "kimlik bilgilerini dondururken aktif kullanicilar bilgilendirilmis olmali",
        "MFA aktif olmali",
        "rollback icin onceki kimlik kaydi yedeklenmiş olmali"
      ]
    }
  ],
  "risk-config-hardening": [
    {
      class: "config-hardening",
      target: ({ risk }) => risk.sourceKinds.includes("configuration")
        ? "process-env-and-startup-config"
        : "service-config",
      intent: () =>
        "NODE_ENV gibi production-disi flag'leri gozden gecir, hardened varsayilanlar uygula.",
      reversible: true,
      blastRadius: "narrow",
      evidenceRequired: [
        "konfig dosyasinin yedegi alinmis olmali",
        "uygulamanin restart toleransi onaylanmis olmali"
      ]
    }
  ],
  "risk-process-review": [
    {
      class: "service-restart",
      target: () => "suspect-process",
      intent: () =>
        "Inceleme gereken sürec(ler)i kontrollü bir sekilde durdur; gerekirse audit log ile dogrula.",
      reversible: true,
      blastRadius: "moderate",
      evidenceRequired: [
        "sürecin meshru bir servise ait olmadığı doğrulanmali",
        "süreç tekrar baslatildiginda sistemin dengeye dönecegi onayi"
      ]
    }
  ],
  "risk-log-anomaly": [
    {
      class: "logging-enable",
      target: () => "audit-log-detailed",
      intent: () =>
        "Anomali tespit edilen kaynakta detayli audit logging'i aktif et; süpheli desenleri yakalamak icin.",
      reversible: true,
      blastRadius: "narrow",
      evidenceRequired: [
        "log hedefinin disk kapasitesi yeterli",
        "log retention politikasi netlestirilmis olmali"
      ]
    }
  ],
  "risk-safe-first-gate": [
    {
      class: "no-op",
      target: () => "policy-gate",
      intent: () =>
        "safe-first politika kapisi aktif; bu execution sadece gözlem ile sınırlı kalmali.",
      reversible: true,
      blastRadius: "narrow",
      evidenceRequired: []
    }
  ]
};

function buildAction(
  template: ActionTemplate,
  input: ActionInput,
  index: number
): Omit<DryRunAction, "status" | "blockedReason"> {
  return {
    id: `dryrun-${input.risk.id}-${template.class}-${index}`,
    riskId: input.risk.id,
    class: template.class,
    target: template.target(input),
    intent: template.intent(input),
    reversible: template.reversible,
    blastRadius: template.blastRadius,
    evidenceRequired: template.evidenceRequired
  };
}

function deriveBlockedReason(
  context: {
    decision: ExecutionDecision;
    trust: TrustAssessment;
    integrity: IntegrityReport | undefined;
    analysis: PromptAnalysis;
  }
): string | null {
  if (context.trust.automationEligibility === "observe-only") {
    return "Trust modeli observe-only kararı verdi.";
  }

  const contradictionCount = context.integrity?.contradictionCount ?? 0;
  if (contradictionCount > 0) {
    return `Kanit zincirinde ${contradictionCount} tutarsizlik var; once contradiction kaynaklari giderilmeli.`;
  }

  if (context.integrity?.status === "thin") {
    return "Kanit butunlugu zayif; aksiyona uygun degil.";
  }

  if (context.decision.blockers.length > 0) {
    return `Aktif blocker'lar engeliyor: ${context.decision.blockers.join(", ")}.`;
  }

  return null;
}

function deriveStatusFromContext(
  blockedReason: string | null,
  context: {
    trust: TrustAssessment;
    analysis: PromptAnalysis;
  }
): DryRunActionStatus {
  if (blockedReason) {
    return "blocked";
  }

  if (context.trust.automationEligibility === "low-risk-auto") {
    return "auto-eligible";
  }

  return "awaiting-approval";
}

function buildSummary(actions: DryRunAction[]): string {
  if (actions.length === 0) {
    return "Su an icin onerilen aksiyon yok.";
  }

  const auto = actions.filter((action) => action.status === "auto-eligible").length;
  const approved = actions.filter((action) => action.status === "approved").length;
  const approval = actions.filter(
    (action) => action.status === "awaiting-approval"
  ).length;
  const blocked = actions.filter((action) => action.status === "blocked").length;
  const rejected = actions.filter((action) => action.status === "rejected").length;

  const parts: string[] = [];

  if (auto > 0) {
    parts.push(`${auto} aksiyon auto-eligible (Phase 2 executor'a hazir)`);
  }

  if (approved > 0) {
    parts.push(`${approved} aksiyon operator onayli (executor bekliyor)`);
  }

  if (approval > 0) {
    parts.push(`${approval} aksiyon insan onayi bekliyor`);
  }

  if (rejected > 0) {
    parts.push(`${rejected} aksiyon operator tarafindan reddedildi`);
  }

  if (blocked > 0) {
    parts.push(`${blocked} aksiyon su an bloke`);
  }

  return parts.join("; ") + ".";
}

export function deriveDryRunReport(input: {
  analysis: PromptAnalysis;
  observations: ExecutionObservation[];
  risks: ExecutionRisk[];
  decision: ExecutionDecision;
  trust: TrustAssessment;
  integrity?: IntegrityReport;
  approvalLookup?: (
    actionClass: string,
    target: string
  ) => ApprovalRecord | null;
}): DryRunReport {
  const blockedReason = deriveBlockedReason({
    decision: input.decision,
    trust: input.trust,
    integrity: input.integrity,
    analysis: input.analysis
  });

  const baseStatus = deriveStatusFromContext(blockedReason, {
    trust: input.trust,
    analysis: input.analysis
  });

  const lookupApproval =
    input.approvalLookup ??
    ((actionClass: string, target: string) =>
      findLiveApprovalFor(actionClass, target));

  const actions: DryRunAction[] = [];

  let templateIndex = 0;
  for (const risk of input.risks) {
    const templates = ACTION_TEMPLATES[risk.id] ?? [];
    for (const template of templates) {
      const action = buildAction(template, { risk, observations: input.observations }, templateIndex);
      templateIndex += 1;

      const existingApproval = lookupApproval(action.class, action.target);

      // Approval override: if the operator has an unexpired decision for
      // this (actionClass, target), surface that decision instead of the
      // base trust-derived status. A rejection wins even when trust is
      // high; an approval still respects hard blockers.
      let status: DryRunActionStatus = baseStatus;
      let resolvedBlockedReason = blockedReason;
      let approvalId: string | undefined;
      let approvalStatus = existingApproval?.status;

      if (existingApproval) {
        approvalId = existingApproval.id;

        if (existingApproval.status === "rejected") {
          status = "rejected";
          resolvedBlockedReason =
            existingApproval.decisionRationale ??
            "Operator daha once bu aksiyonu reddetti.";
        } else if (existingApproval.status === "approved") {
          // An approval cannot override a hard block (e.g. observe-only
          // trust or active contradiction). It only upgrades the status
          // when the gates are otherwise clear.
          status = blockedReason ? "blocked" : "approved";
        } else if (existingApproval.status === "awaiting-approval") {
          // Re-use the existing record; surface awaiting-approval so the
          // operator isn't asked to approve the same thing twice.
          status = blockedReason ? "blocked" : "awaiting-approval";
        }
      }

      actions.push({
        ...action,
        status,
        blockedReason: status === "blocked" ? resolvedBlockedReason : null,
        approvalId,
        approvalStatus
      });
    }
  }

  const executableCount = actions.filter(
    (action) =>
      action.status === "auto-eligible" || action.status === "approved"
  ).length;
  const awaitingApprovalCount = actions.filter(
    (action) => action.status === "awaiting-approval"
  ).length;
  const blockedCount = actions.filter(
    (action) =>
      action.status === "blocked" || action.status === "rejected"
  ).length;

  return {
    actions,
    summary: buildSummary(actions),
    attemptedAt: new Date().toISOString(),
    executableCount,
    awaitingApprovalCount,
    blockedCount,
    blockedByPolicy: input.decision.blockers.length > 0,
    blockedByIntegrity:
      (input.integrity?.contradictionCount ?? 0) > 0 ||
      input.integrity?.status === "thin",
    blockedByTrust: input.trust.automationEligibility === "observe-only"
  };
}
