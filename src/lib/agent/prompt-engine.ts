import type {
  PersistentTrustRecord,
  PromptAnalysis,
  PromptExecution,
  PromptExecutionReport
} from "../../types/agent";
import {
  filterExecutions,
  filterExecutionsByStatus,
  getExecutionStore,
  listTrustRecords
} from "./execution-store";
import { runPromptExecution } from "./execution-engine";

export function analyzePrompt(input: string): PromptAnalysis {
  const normalized = input.trim();
  const lower = normalized.toLowerCase();

  const wantsRepair =
    lower.includes("onar") ||
    lower.includes("fix") ||
    lower.includes("düzelt") ||
    lower.includes("kapat");
  const wantsExplanation =
    lower.includes("açıkla") ||
    lower.includes("neden") ||
    lower.includes("anlat") ||
    lower.includes("rapor");
  const wantsScan =
    lower.includes("tara") ||
    lower.includes("analiz") ||
    lower.includes("scan") ||
    lower.includes("incele") ||
    lower.includes("kontrol et");
  const wantsFast =
    lower.includes("hızlı") ||
    lower.includes("acil") ||
    lower.includes("hemen");
  const wantsSafe =
    lower.includes("güvenli") ||
    lower.includes("risk almadan") ||
    lower.includes("zarar verme");
  const wantsShort =
    lower.includes("kısa") || lower.includes("özet") || lower.includes("kısaca");
  const wantsDetailed =
    lower.includes("detay") ||
    lower.includes("ayrıntı") ||
    lower.includes("adım adım");

  const intent = wantsRepair
    ? "remediation-request"
    : wantsScan && wantsExplanation
      ? "analysis-and-explanation"
      : wantsScan
        ? "analysis-request"
        : "general-security-request";

  const detectedTargets = [
    lower.includes("port") || lower.includes("ağ") || lower.includes("network")
      ? "network-surface"
      : null,
    lower.includes("config") || lower.includes("ayar")
      ? "configuration"
      : null,
    lower.includes("process") || lower.includes("süreç")
      ? "process"
      : null,
    lower.includes("log") ? "telemetry" : null,
    lower.includes("admin") ? "admin-panel" : null,
    lower.includes("localhost") ? "localhost" : null
  ].filter(Boolean) as string[];

  const actions = [
    "Collector bağlamını güncelle",
    "İlgili sinyaller için observation üret",
    "Reasoning zincirini yeniden çalıştır",
    "Critic değerlendirmesini uygula",
    "Politika engeli varsa onay bekleyen aksiyonu işaretle"
  ];

  let suggestedMode = "investigate";
  let riskLevel = "medium";
  let urgency = wantsFast ? "high" : "normal";
  let responseStyle = wantsShort
    ? "concise"
    : wantsDetailed
      ? "detailed"
      : "balanced";
  let explanation =
    "İstek analiz edildi; sistem önce kanıt toplayıp sonra karar zincirini yeniden kurmalı.";
  let expectedOutput =
    "Hedeflenen yüzey için bulgular, karar izi ve risk özeti üretilmeli.";
  const constraints = [
    wantsSafe ? "safe-first" : null,
    wantsRepair ? "approval-gated-remediation" : null,
    lower.includes("rapor") ? "report-required" : null,
    lower.includes("neden") || lower.includes("açıkla")
      ? "explanation-required"
      : null
  ].filter(Boolean) as string[];

  if (wantsRepair) {
    suggestedMode = "remediate";
    riskLevel = "high";
    explanation =
      "İstek doğrudan onarım içeriyor. Sistem önce doğrulama yapmalı, sonra politika katmanına göre aksiyonu bekletmeli.";
    expectedOutput =
      "Önce doğrulama raporu, ardından güvenli onarım planı ve onay gereksinimi üretilmeli.";
  } else if (wantsScan) {
    suggestedMode = "discovery";
    riskLevel = "medium";
    explanation =
      "İstek keşif ve analiz odaklı. Collector ve reasoning katmanları yeniden tetiklenmeli.";
    expectedOutput =
      "Collector bulguları, tespit edilen riskler ve bunların neden önemli olduğuna dair açıklama üretilmeli.";
  }

  if (wantsFast && !wantsRepair) {
    explanation +=
      " Aciliyet vurgusu olduğu için önce hızlı görünür riskleri yüzeye çıkarırım.";
  }

  if (wantsSafe) {
    explanation +=
      " Güvenli çalışma vurgusu olduğu için doğrulanmamış değişiklikleri otomatik uygulamam.";
  }

  const targetPhrase = detectedTargets.length
    ? detectedTargets.join(", ")
    : "genel güvenlik yüzeyi";

  let assistantResponse = `İsteğini ${targetPhrase} odağında yorumladım. İlk olarak kanıt toplayıp sonra reasoning zincirini bu hedefe göre güncelleyeceğim.`;

  if (lower.includes("admin")) {
    assistantResponse =
      "Admin yüzeyini incelememi istiyorsun. Bu durumda özellikle dışa açık giriş noktalarını, kimlik doğrulama yüzeyini ve yanlış yapılandırılmış yönetim panellerini öncelikli hedef olarak ele alırım.";
  }

  if (lower.includes("port")) {
    assistantResponse +=
      " Açık portlardan söz ettiğin için ağ yüzeyini ayrıca önceliklendireceğim; hangi servislerin gereksiz şekilde görünür olduğunu ve bunların saldırı yüzeyini nasıl büyüttüğünü açıklayacağım.";
  }

  if (lower.includes("log")) {
    assistantResponse +=
      " Log isteği bulunduğu için sadece yüzey taraması değil, davranışsal izleri de değerlendirmem gerekir.";
  }

  if (wantsRepair) {
    assistantResponse +=
      " Ancak doğrudan onarım istediğin için doğrulama yapmadan değişiklik uygulamam; önce güvenli onarım planı ve gerekiyorsa insan onayı gereksinimini çıkarırım.";
  } else if (wantsExplanation) {
    assistantResponse +=
      " Sonuçları sana teknik ama anlaşılır dille neden-sonuç ilişkisiyle raporlarım.";
  }

  if (wantsFast) {
    assistantResponse +=
      " Öncelik olarak en hızlı doğrulanabilir riskleri öne çekeceğim.";
  }

  if (wantsSafe) {
    assistantResponse +=
      " Güvenli ilerleme istediğin için doğrulanmamış veya servis kesintisi yaratabilecek aksiyonları kilit altında tutarım.";
  }

  if (wantsShort) {
    assistantResponse +=
      " Çıktıyı mümkün olduğunca kısa ve karar odaklı tutarım.";
  } else if (wantsDetailed) {
    assistantResponse +=
      " Çıktıyı adım adım ve nedenleriyle birlikte detaylandırırım.";
  }

  const planSummary =
    suggestedMode === "remediate"
      ? "Doğrula -> risk etkisini ölç -> güvenli onarım planı üret -> onay gerekip gerekmediğini değerlendir."
      : wantsScan
        ? "Collector tetikle -> ilgili sinyalleri topla -> reasoning zincirini güncelle -> kritik riskleri sırala."
        : "İsteği hedeflere ayır -> kanıt topla -> açıklanabilir karar izi üret.";

  return {
    input: normalized,
    normalizedGoal: normalized || "Genel güvenlik analizi isteği",
    detectedTargets,
    suggestedMode,
    actions,
    riskLevel,
    explanation,
    intent,
    expectedOutput,
    assistantResponse,
    urgency,
    responseStyle,
    constraints,
    planSummary
  };
}

export function listPromptExecutions(): PromptExecution[] {
  return [...getExecutionStore().executions].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt)
  );
}

export function listPromptExecutionsByStatus(status?: string): PromptExecution[] {
  return [...filterExecutionsByStatus(status)].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt)
  );
}

export function listPromptExecutionsByPolicyProfile(
  policyProfile?: string
): PromptExecution[] {
  return [...filterExecutions({ policyProfile })].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt)
  );
}

export function listPromptExecutionsByFilters(filters: {
  status?: string;
  policyProfile?: string;
}): PromptExecution[] {
  return [...filterExecutions(filters)].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt)
  );
}

export function getExecutionStatusSummary(): {
  total: number;
  completed: number;
  needsTriage: number;
  awaitingApproval: number;
  lastExecutionAt: string | null;
} {
  const executions = listPromptExecutions();

  return {
    total: executions.length,
    completed: executions.filter((execution) => execution.status === "completed")
      .length,
    needsTriage: executions.filter(
      (execution) => execution.status === "needs-triage"
    ).length,
    awaitingApproval: executions.filter(
      (execution) => execution.status === "awaiting-approval"
    ).length,
    lastExecutionAt: executions[0]?.createdAt ?? null
  };
}

export function getPromptExecutionReport(
  executionId: string
): PromptExecutionReport | null {
  return getExecutionStore().reports[executionId] ?? null;
}

export function getTrustTrendSummary(): {
  totalRecords: number;
  topEnvironment:
    | (PersistentTrustRecord & {
        trustRatio: number;
      })
    | null;
  topAction:
    | (PersistentTrustRecord & {
        trustRatio: number;
      })
    | null;
  weakestEnvironment:
    | (PersistentTrustRecord & {
        trustRatio: number;
      })
    | null;
  weakestAction:
    | (PersistentTrustRecord & {
        trustRatio: number;
      })
    | null;
  recentRecords: PersistentTrustRecord[];
} {
  const records = listTrustRecords();
  const environments = records.filter((record) => record.scope === "environment");
  const actions = records.filter((record) => record.scope === "action");

  function trustRatio(record: PersistentTrustRecord): number {
    const total = record.successCount + record.triageCount;
    if (total === 0) {
      return 0;
    }

    return record.successCount / total;
  }

  function withRatio(record: PersistentTrustRecord | null) {
    if (!record) {
      return null;
    }

    return {
      ...record,
      trustRatio: trustRatio(record)
    };
  }

  function sortStrongest(left: PersistentTrustRecord, right: PersistentTrustRecord) {
    const ratioDelta = trustRatio(right) - trustRatio(left);
    if (ratioDelta !== 0) {
      return ratioDelta;
    }

    return (right.lastConfidenceScore ?? 0) - (left.lastConfidenceScore ?? 0);
  }

  function sortWeakest(left: PersistentTrustRecord, right: PersistentTrustRecord) {
    const ratioDelta = trustRatio(left) - trustRatio(right);
    if (ratioDelta !== 0) {
      return ratioDelta;
    }

    return (left.lastConfidenceScore ?? 0) - (right.lastConfidenceScore ?? 0);
  }

  return {
    totalRecords: records.length,
    topEnvironment: withRatio([...environments].sort(sortStrongest)[0] ?? null),
    topAction: withRatio([...actions].sort(sortStrongest)[0] ?? null),
    weakestEnvironment: withRatio(
      [...environments].sort(sortWeakest)[0] ?? null
    ),
    weakestAction: withRatio([...actions].sort(sortWeakest)[0] ?? null),
    recentRecords: records.slice(0, 6)
  };
}

export function executePrompt(input: string): {
  analysis: PromptAnalysis;
  execution: PromptExecution;
  report: PromptExecutionReport;
} {
  const analysis = analyzePrompt(input);
  const { execution, report } = runPromptExecution(analysis);

  return {
    analysis,
    execution,
    report
  };
}
