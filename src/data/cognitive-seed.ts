import { CognitiveEpisode } from "@/types/cognitive";

const now = "2026-04-17T05:20:00+03:00";

export const cognitiveSeed: CognitiveEpisode = {
  targetId: "asset-localhost-core",
  observations: [
    {
      id: "obs-local-admin-surface",
      targetId: "asset-localhost-core",
      kind: "configuration",
      source: "local-collector",
      summary: "Yonetim yuzeyi kisitli erisim politikasi olmadan gorunur durumda olabilir.",
      evidence: ["admin route exposed in config review", "no allow-list marker found"],
      confidence: "medium",
      observedAt: now
    }
  ],
  beliefs: [
    {
      id: "belief-admin-surface-exposed",
      targetId: "asset-localhost-core",
      statement: "Yonetim yuzeyi gerektiginden fazla erisim alanina sahip olabilir.",
      basisObservationIds: ["obs-local-admin-surface"],
      confidence: 0.74,
      status: "supported",
      updatedAt: now
    }
  ],
  hypotheses: [
    {
      id: "hyp-excessive-admin-exposure",
      targetId: "asset-localhost-core",
      title: "Excessive administrative exposure",
      explanation: "Yonetim paneli gerekli sinirlamalar olmadan acik olabilir.",
      supportingBeliefIds: ["belief-admin-surface-exposed"],
      riskScore: 0.83,
      uncertaintyScore: 0.34,
      status: "prioritized",
      updatedAt: now
    }
  ],
  goals: [
    {
      id: "goal-verify-admin-surface",
      targetId: "asset-localhost-core",
      kind: "verify",
      intent: "Yonetim yuzeyinin gercek erisim kosullarini dogrula.",
      priority: 90,
      createdAt: now
    }
  ],
  plans: [
    {
      id: "plan-verify-then-restrict",
      targetId: "asset-localhost-core",
      goalId: "goal-verify-admin-surface",
      hypothesisIds: ["hyp-excessive-admin-exposure"],
      rationale: "Dogrulama olmadan dogrudan kapatma yerine once erisim gercegini netlestir.",
      blastRadius: "restricted",
      confidence: 0.78,
      status: "critic-review",
      steps: [
        {
          id: "step-check-binding",
          title: "Binding ve ingress kurallarini denetle",
          actionType: "inspect-config",
          requiresApproval: false,
          rollbackHint: null
        },
        {
          id: "step-confirm-access",
          title: "Kisitli dogrulama ile erisim yuzeyini test et",
          actionType: "safe-verify",
          requiresApproval: false,
          rollbackHint: null
        },
        {
          id: "step-restrict-access",
          title: "Gerekirse allow-list veya VPN zorunlulugu uygula",
          actionType: "restrict-surface",
          requiresApproval: true,
          rollbackHint: "restore previous ingress policy"
        }
      ],
      createdAt: now
    }
  ],
  decisions: [
    {
      id: "decision-await-critic",
      targetId: "asset-localhost-core",
      selectedPlanId: "plan-verify-then-restrict",
      status: "deferred",
      justification: "Plan mevcut, ancak critic degerlendirmesi ve daha guclu kanit gerekiyor.",
      blockedBy: ["critic-review", "additional-verification-evidence"],
      createdAt: now
    }
  ],
  outcomes: []
};
