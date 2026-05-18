import type {
  PersistentTrustRecord,
  PromptExecution,
  PromptExecutionReport
} from "../../types/agent";
import {
  loadPersistentExecutionStore,
  savePersistentExecutionStore
} from "./persistent-store";

type ExecutionStore = {
  executions: PromptExecution[];
  reports: Record<string, PromptExecutionReport>;
  trustRecords: Record<string, PersistentTrustRecord>;
};

declare global {
  var __projectAsylumExecutionStore__: ExecutionStore | undefined;
}

function createBootstrapStore(): ExecutionStore {
  const bootstrapExecution: PromptExecution = {
    id: "exec-bootstrap-001",
    prompt: "localhost üzerindeki admin yüzeyini analiz et ve riskleri açıkla",
    mode: "discovery",
    status: "needs-triage",
    riskLevel: "medium",
    policyProfile: "default",
    createdAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    summary:
      "Admin yüzeyi ve ağ sinyalleri önceliklendirildi; reasoning zinciri yenilenmeye hazır.",
    targets: ["admin-panel", "network-surface", "localhost"]
  };

  return {
    executions: [bootstrapExecution],
    reports: {
      [bootstrapExecution.id]: {
        execution: bootstrapExecution,
        policyProfile: "default",
        policyInsight: {
          profile: "default",
          posture: "balanced",
          explanation:
            "Varsayılan profil blocker'ları dengeli yorumlar; tekrar collector/reasoning kanıtı geldikçe karar zinciri yumuşatılır.",
          context: {
            collectorAttempts: 0,
            reasoningAttempts: 0,
            reviewPorts: [8080],
            riskySignals: [],
            hasCriticalRisk: false,
            hasHighProcessRisk: false
          },
          riskContext: {
            "network-exposure-review": {
              severity: "high",
              score: 0.82,
              riskIds: ["risk-admin-surface"]
            }
          },
          thresholds: {
            "network-exposure-review": {
              enabled: true,
              minCollectorAttempts: 1,
              minReasoningAttempts: 0,
              maxRiskySignals: null,
              requiresNoCriticalRisk: true,
              requiresNoReviewPorts: true,
              requiresNoHighProcessRisk: false
            }
          },
          evaluations: {
            "network-exposure-review": {
              matched: false,
              collectorAttemptsSatisfied: false,
              reasoningAttemptsSatisfied: true,
              riskySignalsSatisfied: true,
              criticalRiskSatisfied: true,
              reviewPortsSatisfied: false,
              highProcessRiskSatisfied: true
            }
          },
          matchedRules: [],
          pendingRules: ["network-exposure-review"]
        },
        observations: [
          {
            kind: "network-surface",
            detail:
              "Admin yüzeyi ile ilişkili ağ erişim noktaları öncelikli hedef olarak işaretlendi.",
            confidence: 0.74,
            metadata: {
              ports: [3000, 8080],
              reviewPorts: [8080]
            }
          },
          {
            kind: "identity",
            detail: "Kimlik doğrulama yüzeyi inceleme planına dahil edildi.",
            confidence: 0.68
          }
        ],
        risks: [
          {
            id: "risk-admin-surface",
            severity: "high",
            title: "Admin panel yüzeyi",
            rationale:
              "Bootstrap kaydı yönetim yüzeyini öncelikli risk olarak işaretliyor.",
            sourceKinds: ["network-surface", "identity"],
            score: 0.82,
            evidence: ["Admin panel hedefi bootstrap kaydinda var."]
          }
        ],
        reasoning: {
          belief: {
            summary:
              "Bootstrap kaydı admin yüzeyi ve kimlik sinyalini yeterli ilk inanç düzeyi olarak işaretliyor.",
            status: "tentative",
            confidence: 0.71,
            supportingKinds: ["network-surface", "identity"]
          },
          hypotheses: [
            {
              id: "hyp-bootstrap-admin-surface",
              title: "Admin panel yüzeyi",
              status: "candidate",
              confidence: 0.74,
              rationale:
                "Bootstrap senaryosu yönetim yüzeyini öncelikli inceleme alanı olarak tanımlıyor.",
              evidence: ["Admin panel hedefi bootstrap kaydinda var."]
            }
          ],
          priorityHypothesisId: "hyp-bootstrap-admin-surface",
          nextInference:
            "Bootstrap hipotezini gerçek collector sinyalleriyle zenginleştir."
        },
        plan: {
          objective: "Admin panel yüzeyi",
          steps: [
            {
              id: "step-bootstrap-collect",
              title: "Ek network kanıtı topla",
              status: "ready",
              rationale:
                "Bootstrap kaydını gerçek collector port ve identity sinyalleriyle doğrula.",
              taskType: "collector",
              commandHint: "port-scan-lite",
              outputs: ["open-ports", "service-surface", "bind-addresses"]
            },
            {
              id: "step-bootstrap-reason",
              title: "Reasoning zincirini yenile",
              status: "pending",
              rationale:
                "Yeni collector sinyali sonrası hipotez güvenini tekrar hesapla.",
              taskType: "reasoning",
              commandHint: "reasoning-refresh",
              outputs: ["belief-update", "hypothesis-order", "confidence-delta"]
            },
            {
              id: "step-bootstrap-policy",
              title: "Policy gate kontrolü",
              status: "blocked",
              rationale: "Network exposure review tamamlanmadan ilerleme sınırlı.",
              taskType: "critic",
              commandHint: "policy-gate-check",
              outputs: ["critic-verdict", "blocker-list", "approval-need"]
            }
          ],
          guarded: true
        },
        taskRuns: [
            {
              stepId: "step-bootstrap-collect",
              taskType: "collector",
              commandHint: "port-scan-lite",
              status: "completed",
              attempt: 1,
              summary:
                "Dinleyen servis ornekleri: ControlCe:746, steam_osx:818.",
              produced: ["open-ports", "service-surface", "bind-addresses"],
              executedAt: bootstrapExecution.createdAt
            },
            {
              stepId: "step-bootstrap-reason",
              taskType: "reasoning",
              commandHint: "reasoning-refresh",
              status: "completed",
              attempt: 1,
              summary: "Admin panel yüzeyi öncelikli hipotez olarak sıralandı.",
              produced: ["belief-update", "hypothesis-order", "confidence-delta"],
              executedAt: bootstrapExecution.createdAt
            },
            {
              stepId: "step-bootstrap-policy",
              taskType: "critic",
              commandHint: "policy-gate-check",
              status: "blocked",
              attempt: 1,
              summary:
                "revise verdict üretildi; aktif risk bayrakları: network-exposure-review.",
              produced: ["critic-verdict", "blocker-list", "approval-need"],
              executedAt: bootstrapExecution.createdAt
            }
        ],
        critic: {
          verdict: "revise",
          summary:
            "Bootstrap kaydı ilk triage için yeterli ama gerçek collector kanıtı olmadan tamam sayılmamalı.",
          riskFlags: ["network-exposure-review"],
          recommendedAction:
            "Bootstrap hipotezini gerçek network ve identity sinyalleriyle yeniden değerlendir."
        },
        decision: {
          status: "needs-triage",
          rationale:
            "İlk bootstrap görevi keşif odaklı olduğu için yürütme raporu üretildi ve sonraki reasoning turuna hazırlandı.",
          blockers: ["network-exposure-review"],
          primaryBlockerReason: {
            flag: "network-exposure-review",
            severity: "high",
            status: "pending",
            priority: 2,
            line: "network-exposure-review kuralı beklemede; inceleme bekleyen portlar var (8080)."
          },
          nextStep:
            "Collector ve reasoning zincirini aynı execution kimliği altında birleştir."
        },
        generatedAt: bootstrapExecution.createdAt
      }
    },
    trustRecords: {}
  };
}

export function getExecutionStore(): ExecutionStore {
  if (!globalThis.__projectAsylumExecutionStore__) {
    const persisted = loadPersistentExecutionStore();
    globalThis.__projectAsylumExecutionStore__ =
      persisted.executions.length > 0 ? persisted : createBootstrapStore();
  }

  return globalThis.__projectAsylumExecutionStore__;
}

export function persistExecutionStore(): void {
  const store = getExecutionStore();
  savePersistentExecutionStore({
    executions: store.executions,
    reports: store.reports,
    trustRecords: store.trustRecords
  });
}

export function resetExecutionStoreForTests(): void {
  globalThis.__projectAsylumExecutionStore__ = createBootstrapStore();
}

export function filterExecutionsByStatus(status?: string): PromptExecution[] {
  const executions = getExecutionStore().executions;

  if (!status || status === "all") {
    return executions;
  }

  return executions.filter((execution) => execution.status === status);
}

export function filterExecutionsByPolicyProfile(
  policyProfile?: string
): PromptExecution[] {
  const executions = getExecutionStore().executions;

  if (!policyProfile || policyProfile === "all") {
    return executions;
  }

  return executions.filter(
    (execution) => (execution.policyProfile ?? "default") === policyProfile
  );
}

export function filterExecutions(
  filters: {
    status?: string;
    policyProfile?: string;
  } = {}
): PromptExecution[] {
  return getExecutionStore().executions.filter((execution) => {
    const statusMatches =
      !filters.status ||
      filters.status === "all" ||
      execution.status === filters.status;
    const policyMatches =
      !filters.policyProfile ||
      filters.policyProfile === "all" ||
      (execution.policyProfile ?? "default") === filters.policyProfile;

    return statusMatches && policyMatches;
  });
}

export function listTrustRecords() {
  return Object.values(getExecutionStore().trustRecords).sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt)
  );
}
