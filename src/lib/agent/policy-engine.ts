import fs from "node:fs";
import path from "node:path";

import type {
  PolicyDecisionExplanation,
  PolicyDecisionDetail,
  PromptExecutionReport
} from "../../types/agent";

type ExecutionObservation = PromptExecutionReport["observations"][number];
type ExecutionRisk = PromptExecutionReport["risks"][number];
type CriticTrace = PromptExecutionReport["critic"];
type TaskRun = PromptExecutionReport["taskRuns"][number];
type PolicyMatch = NonNullable<CriticTrace["policyMatches"]>[number];
type PolicyInsight = NonNullable<PromptExecutionReport["policyInsight"]>;
type PolicyEvaluations = PolicyInsight["evaluations"];
type PolicyRiskContext = PolicyInsight["riskContext"];

export type BlockerPolicyContext = {
  reviewPorts: number[];
  collectorAttempts: number;
  reasoningAttempts: number;
  hasCriticalRisk: boolean;
  hasHighProcessRisk: boolean;
  riskySignals: string[];
};

function severityRank(severity: string): number {
  switch (severity) {
    case "critical":
      return 0;
    case "high":
      return 1;
    case "medium":
      return 2;
    case "low":
      return 3;
    default:
      return 4;
  }
}

type BlockerPolicy = {
  flag: string;
  action: "keep" | "remove";
  applies: (context: BlockerPolicyContext) => boolean;
  note: string;
};

type BlockerPolicyOverride = {
  enabled?: boolean;
  minCollectorAttempts?: number;
  minReasoningAttempts?: number;
  requiresNoCriticalRisk?: boolean;
  requiresNoReviewPorts?: boolean;
  maxRiskySignals?: number;
  requiresNoHighProcessRisk?: boolean;
  note?: string;
};

type BlockerPolicyOverrideMap = Record<string, BlockerPolicyOverride>;
type BlockerPolicyProfileDocument = {
  activeProfile?: string;
  profiles?: Record<string, BlockerPolicyOverrideMap>;
};
type PolicyThresholds = PolicyInsight["thresholds"];

const POLICY_CONFIG_PATH = path.join(
  process.cwd(),
  "data",
  "blocker-policies.json"
);

const DEFAULT_POLICY_OVERRIDES: BlockerPolicyProfileDocument = {
  activeProfile: "default",
  profiles: {
    default: {
      "network-exposure-review": {
        enabled: true,
        minCollectorAttempts: 1,
        minReasoningAttempts: 0,
        requiresNoCriticalRisk: true,
        requiresNoReviewPorts: true,
        note:
          "Tekrarlı collector kanıtı var ve review port görünmüyor; network exposure blocker'ı düşürülebilir."
      },
      "high-risk-triage": {
        enabled: true,
        minCollectorAttempts: 1,
        minReasoningAttempts: 1,
        requiresNoCriticalRisk: true,
        requiresNoHighProcessRisk: true,
        maxRiskySignals: 3,
        note:
          "Collector ve reasoning tekrarlandı; config sinyalleri düşük yoğunlukta ve yüksek süreç riski yok."
      }
    }
  }
};

const BASE_BLOCKER_POLICIES: BlockerPolicy[] = [
  {
    flag: "network-exposure-review",
    action: "remove",
    applies: (context) =>
      context.collectorAttempts >= 1 &&
      !context.hasCriticalRisk &&
      context.reviewPorts.length === 0,
    note:
      "Tekrarlı collector kanıtı var ve review port görünmüyor; network exposure blocker'ı düşürülebilir."
  },
  {
    flag: "high-risk-triage",
    action: "remove",
    applies: (context) =>
      context.collectorAttempts >= 1 &&
      context.reasoningAttempts >= 1 &&
      !context.hasCriticalRisk &&
      !context.hasHighProcessRisk &&
      context.riskySignals.length <= 3,
    note:
      "Collector ve reasoning tekrarlandı; config sinyalleri düşük yoğunlukta ve yüksek süreç riski yok."
  }
];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOverrideMap(value: unknown): value is BlockerPolicyOverrideMap {
  return (
    isPlainObject(value) &&
    Object.values(value).every((entry) => isPlainObject(entry))
  );
}

function loadBlockerPolicyDocument(): BlockerPolicyProfileDocument {
  try {
    if (!fs.existsSync(POLICY_CONFIG_PATH)) {
      return DEFAULT_POLICY_OVERRIDES;
    }

    const raw = fs.readFileSync(POLICY_CONFIG_PATH, "utf8");
    if (!raw.trim()) {
      return DEFAULT_POLICY_OVERRIDES;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!isPlainObject(parsed)) {
      return DEFAULT_POLICY_OVERRIDES;
    }

    const profiles = isPlainObject(parsed.profiles)
      ? Object.fromEntries(
          Object.entries(parsed.profiles).filter(([, value]) =>
            isOverrideMap(value)
          )
        )
      : DEFAULT_POLICY_OVERRIDES.profiles;

    return {
      activeProfile:
        typeof parsed.activeProfile === "string"
          ? parsed.activeProfile
          : DEFAULT_POLICY_OVERRIDES.activeProfile,
      profiles:
        profiles && Object.keys(profiles).length > 0
          ? (profiles as Record<string, BlockerPolicyOverrideMap>)
          : DEFAULT_POLICY_OVERRIDES.profiles
    };
  } catch {
    return DEFAULT_POLICY_OVERRIDES;
  }
}

function applyOverrideRule(
  basePolicy: BlockerPolicy,
  override: BlockerPolicyOverride | undefined
): BlockerPolicy {
  if (!override || override.enabled === false) {
    return {
      ...basePolicy,
      applies: () => false
    };
  }

  return {
    ...basePolicy,
    note: override.note ?? basePolicy.note,
    applies: (context) => {
      if (
        typeof override.minCollectorAttempts === "number" &&
        context.collectorAttempts < override.minCollectorAttempts
      ) {
        return false;
      }

      if (
        typeof override.minReasoningAttempts === "number" &&
        context.reasoningAttempts < override.minReasoningAttempts
      ) {
        return false;
      }

      if (
        override.requiresNoCriticalRisk !== false &&
        context.hasCriticalRisk
      ) {
        return false;
      }

      if (
        override.requiresNoReviewPorts !== false &&
        context.reviewPorts.length > 0
      ) {
        return false;
      }

      if (
        override.requiresNoHighProcessRisk === true &&
        context.hasHighProcessRisk
      ) {
        return false;
      }

      if (
        typeof override.maxRiskySignals === "number" &&
        context.riskySignals.length > override.maxRiskySignals
      ) {
        return false;
      }

      return basePolicy.applies(context);
    }
  };
}

function getActiveBlockerPolicies(): BlockerPolicy[] {
  const document = loadBlockerPolicyDocument();
  const requestedProfile = process.env.PROJECT_ASYLUM_POLICY_PROFILE;
  const profileName =
    typeof requestedProfile === "string" && requestedProfile.trim().length > 0
      ? requestedProfile
      : document.activeProfile ?? "default";
  const overrides =
    document.profiles?.[profileName] ??
    document.profiles?.default ??
    DEFAULT_POLICY_OVERRIDES.profiles?.default ??
    {};

  return BASE_BLOCKER_POLICIES.map((policy) =>
    applyOverrideRule(policy, overrides[policy.flag])
  );
}

function getActiveProfileOverrides(): BlockerPolicyOverrideMap {
  const document = loadBlockerPolicyDocument();
  const requestedProfile = process.env.PROJECT_ASYLUM_POLICY_PROFILE;
  const profileName =
    typeof requestedProfile === "string" && requestedProfile.trim().length > 0
      ? requestedProfile
      : document.activeProfile ?? "default";

  return (
    document.profiles?.[profileName] ??
    document.profiles?.default ??
    DEFAULT_POLICY_OVERRIDES.profiles?.default ??
    {}
  );
}

function highestAttemptForStep(taskRuns: TaskRun[], stepId: string): number {
  const attempts = taskRuns
    .filter((taskRun) => taskRun.stepId === stepId)
    .map((taskRun) => taskRun.attempt);

  return attempts.length > 0 ? Math.max(...attempts) : 0;
}

export function buildBlockerPolicyContext(
  observations: ExecutionObservation[],
  risks: ExecutionRisk[],
  previousTaskRuns: TaskRun[]
): BlockerPolicyContext {
  const networkObservation = observations.find(
    (observation) => observation.kind === "network-surface"
  );
  const configObservation = observations.find(
    (observation) => observation.kind === "configuration"
  );

  return {
    reviewPorts: Array.isArray(networkObservation?.metadata?.reviewPorts)
      ? networkObservation.metadata.reviewPorts.filter(
          (value): value is number => typeof value === "number"
        )
      : [],
    collectorAttempts: highestAttemptForStep(
      previousTaskRuns,
      "step-collect-evidence"
    ),
    reasoningAttempts: highestAttemptForStep(
      previousTaskRuns,
      "step-reasoning-refresh"
    ),
    hasCriticalRisk: risks.some((risk) => risk.severity === "critical"),
    hasHighProcessRisk: risks.some(
      (risk) => risk.id === "risk-process-review" && risk.severity === "high"
    ),
    riskySignals: Array.isArray(configObservation?.metadata?.riskySignals)
      ? configObservation.metadata.riskySignals.filter(
          (value): value is string => typeof value === "string"
        )
      : []
  };
}

export function evaluateBlockerPolicies(
  context: BlockerPolicyContext
): PolicyMatch[] {
  return getActiveBlockerPolicies().map((policy) => ({
    flag: policy.flag,
    action: policy.action,
    matched: policy.applies(context),
    note: policy.note
  }));
}

export function getBlockerPolicyConfigPath(): string {
  return POLICY_CONFIG_PATH;
}

export function getActiveBlockerPolicyProfile(): string {
  const document = loadBlockerPolicyDocument();
  const requestedProfile = process.env.PROJECT_ASYLUM_POLICY_PROFILE;

  if (
    typeof requestedProfile === "string" &&
    requestedProfile.trim().length > 0 &&
    document.profiles?.[requestedProfile]
  ) {
    return requestedProfile;
  }

  return document.activeProfile ?? "default";
}

export function buildPolicyRiskContext(
  risks: PromptExecutionReport["risks"]
): PolicyRiskContext {
  const entries: Array<[string, string[]]> = [
    ["network-exposure-review", ["risk-network-exposure", "risk-admin-surface"]],
    ["high-risk-triage", risks.filter((risk) => ["high", "critical"].includes(risk.severity)).map((risk) => risk.id)],
    ["critical-surface-review", risks.filter((risk) => risk.severity === "critical").map((risk) => risk.id)],
    ["safe-first-validation", ["risk-safe-first-gate"]]
  ];

  return Object.fromEntries(
    entries.map(([flag, ids]) => {
      const matchedRisks = risks.filter((risk) => ids.includes(risk.id));
      const sorted = [...matchedRisks].sort((left, right) => {
        const leftRank = severityRank(left.severity);
        const rightRank = severityRank(right.severity);

        if (leftRank !== rightRank) {
          return leftRank - rightRank;
        }

        return (right.score ?? 0) - (left.score ?? 0);
      });

      return [
        flag,
        {
          severity: sorted[0]?.severity ?? "info",
          score: typeof sorted[0]?.score === "number" ? sorted[0].score : null,
          riskIds: matchedRisks.map((risk) => risk.id)
        }
      ];
    })
  );
}

export function buildPolicyInsight(
  profile: string,
  policyMatches: PolicyMatch[] = [],
  riskContext: PolicyRiskContext = {},
  context: BlockerPolicyContext = {
    collectorAttempts: 0,
    reasoningAttempts: 0,
    reviewPorts: [],
    riskySignals: [],
    hasCriticalRisk: false,
    hasHighProcessRisk: false
  }
): PolicyInsight {
  const overrides = getActiveProfileOverrides();
  const matchedRules = policyMatches
    .filter((match) => match.matched)
    .map((match) => match.flag);
  const pendingRules = policyMatches
    .filter((match) => !match.matched)
    .map((match) => match.flag);

  const posture =
    profile === "strict-soc"
      ? "strict"
      : profile === "lenient-lab"
        ? "lenient"
        : "balanced";

  const explanation =
    posture === "strict"
      ? "Strict SOC profili blocker'ları daha geç temizler; aynı kanıt için daha fazla tekrar ve daha düşük risk yoğunluğu ister."
      : posture === "lenient"
        ? "Lab profili blocker'ları daha esnek yorumlar; tekrar eden temiz kanıtlar karar zincirini daha hızlı ilerletebilir."
        : "Varsayılan profil blocker'ları dengeli yorumlar; tekrar collector/reasoning kanıtı geldikçe karar zinciri yumuşatılır.";

  const thresholds: PolicyThresholds = Object.fromEntries(
    Object.entries(overrides).map(([flag, override]) => [
      flag,
      {
        enabled: override.enabled !== false,
        minCollectorAttempts:
          typeof override.minCollectorAttempts === "number"
            ? override.minCollectorAttempts
            : null,
        minReasoningAttempts:
          typeof override.minReasoningAttempts === "number"
            ? override.minReasoningAttempts
            : null,
        maxRiskySignals:
          typeof override.maxRiskySignals === "number"
            ? override.maxRiskySignals
            : null,
        requiresNoCriticalRisk: override.requiresNoCriticalRisk !== false,
        requiresNoReviewPorts: override.requiresNoReviewPorts !== false,
        requiresNoHighProcessRisk:
          override.requiresNoHighProcessRisk === true
      }
    ])
  );

  const evaluations: PolicyEvaluations = Object.fromEntries(
    Object.entries(thresholds).map(([flag, threshold]) => [
      flag,
      {
        matched: matchedRules.includes(flag),
        collectorAttemptsSatisfied:
          threshold.minCollectorAttempts === null ||
          context.collectorAttempts >= threshold.minCollectorAttempts,
        reasoningAttemptsSatisfied:
          threshold.minReasoningAttempts === null ||
          context.reasoningAttempts >= threshold.minReasoningAttempts,
        riskySignalsSatisfied:
          threshold.maxRiskySignals === null ||
          context.riskySignals.length <= threshold.maxRiskySignals,
        criticalRiskSatisfied:
          !threshold.requiresNoCriticalRisk || !context.hasCriticalRisk,
        reviewPortsSatisfied:
          !threshold.requiresNoReviewPorts || context.reviewPorts.length === 0,
        highProcessRiskSatisfied:
          !threshold.requiresNoHighProcessRisk || !context.hasHighProcessRisk
      }
    ])
  );

  return {
    profile,
    posture,
    explanation,
    context,
    riskContext,
    thresholds,
    evaluations,
    matchedRules,
    pendingRules
  };
}

function getPolicyFlagPriority(flag: string): number {
  if (flag === "critical-surface-review") {
    return 0;
  }

  if (flag === "high-risk-triage") {
    return 1;
  }

  if (flag === "network-exposure-review") {
    return 2;
  }

  if (flag === "safe-first-validation") {
    return 3;
  }

  return 4;
}

function getSeverityPriorityBoost(severity: string): number {
  switch (severity) {
    case "critical":
      return -0.3;
    case "high":
      return -0.2;
    case "medium":
      return -0.1;
    default:
      return 0;
  }
}

function getScorePriorityBoost(score: number | null): number {
  if (typeof score !== "number") {
    return 0;
  }

  return -Math.min(Math.max(score, 0), 0.99) / 10;
}

function getPolicyFlagSeverity(
  flag: string,
  status: PolicyDecisionDetail["status"],
  riskContext: PolicyRiskContext
): PolicyDecisionDetail["severity"] {
  const derivedSeverity = riskContext[flag]?.severity;
  if (
    derivedSeverity === "critical" ||
    derivedSeverity === "high" ||
    derivedSeverity === "medium" ||
    derivedSeverity === "low"
  ) {
    return derivedSeverity;
  }

  if (flag === "critical-surface-review") {
    return "critical";
  }

  if (flag === "high-risk-triage") {
    return "high";
  }

  if (flag === "network-exposure-review") {
    return status === "pending" ? "high" : "medium";
  }

  if (flag === "safe-first-validation") {
    return "medium";
  }

  return "info";
}

function buildPolicyDecisionDetails(
  insight: PromptExecutionReport["policyInsight"] | null | undefined
): PolicyDecisionDetail[] {
  if (!insight) {
    return [
      {
        flag: "policy-unavailable",
        severity: "info",
        status: "informational",
        priority: 999,
        line: "Policy farkı için henüz detaylı bir açıklama üretilmemiş."
      }
    ];
  }

  const details: PolicyDecisionDetail[] = [
    {
      flag: "policy-profile",
      severity: "info",
      status: "informational",
      priority: 999,
      line: `${insight.profile} profili ${insight.posture} postürde çalışıyor. ${insight.explanation}`
    }
  ];

  for (const [flag, evaluation] of Object.entries(insight.evaluations)) {
    const threshold = insight.thresholds[flag];
    const failedChecks: string[] = [];

    if (!evaluation.collectorAttemptsSatisfied) {
      failedChecks.push(
        `collector denemesi yetersiz (${insight.context.collectorAttempts}/${threshold.minCollectorAttempts})`
      );
    }

    if (!evaluation.reasoningAttemptsSatisfied) {
      failedChecks.push(
        `reasoning denemesi yetersiz (${insight.context.reasoningAttempts}/${threshold.minReasoningAttempts})`
      );
    }

    if (!evaluation.riskySignalsSatisfied) {
      failedChecks.push(
        `riskli sinyal yoğunluğu yüksek (${insight.context.riskySignals.length}/${threshold.maxRiskySignals})`
      );
    }

    if (!evaluation.criticalRiskSatisfied) {
      failedChecks.push("kritik risk devam ediyor");
    }

    if (!evaluation.reviewPortsSatisfied) {
      failedChecks.push(
        `inceleme bekleyen portlar var (${insight.context.reviewPorts.join(", ")})`
      );
    }

    if (!evaluation.highProcessRiskSatisfied) {
      failedChecks.push("yüksek süreç riski devam ediyor");
    }

    const status: PolicyDecisionDetail["status"] = evaluation.matched
      ? "matched"
      : failedChecks.length > 0
        ? "pending"
        : "informational";

    const line = evaluation.matched
      ? `${flag} kuralı geçti; mevcut context bu profilin eşiklerini sağlıyor.`
      : failedChecks.length > 0
        ? `${flag} kuralı beklemede; ${failedChecks.join(", ")}.`
        : `${flag} kuralı henüz eşleşmedi; policy koşulları tam tamamlanmadı.`;

    details.push({
      flag,
      severity: getPolicyFlagSeverity(flag, status, insight.riskContext),
      status,
      priority:
        getPolicyFlagPriority(flag) +
        getSeverityPriorityBoost(insight.riskContext[flag]?.severity ?? "info") +
        getScorePriorityBoost(insight.riskContext[flag]?.score ?? null),
      line
    });
  }

  return details.sort((left, right) =>
    left.priority === right.priority
      ? left.line.localeCompare(right.line)
      : left.priority - right.priority
  );
}

export function sortBlockerFlagsByPriority(
  flags: string[],
  insight: PromptExecutionReport["policyInsight"] | null | undefined
): string[] {
  const priorityMap = new Map(
    buildPolicyDecisionDetails(insight).map((detail) => [detail.flag, detail.priority])
  );

  return [...new Set(flags)].sort((left, right) => {
    const leftPriority = priorityMap.get(left) ?? 999;
    const rightPriority = priorityMap.get(right) ?? 999;

    return leftPriority === rightPriority
      ? left.localeCompare(right)
      : leftPriority - rightPriority;
  });
}

export function buildPolicyDecisionExplanationLines(
  insight: PromptExecutionReport["policyInsight"] | null | undefined
): string[] {
  return buildPolicyDecisionDetails(insight).map((detail) => detail.line);
}

export function buildPolicyDecisionExplanation(
  insight: PromptExecutionReport["policyInsight"] | null | undefined
): PolicyDecisionExplanation {
  const structuredDetails = buildPolicyDecisionDetails(insight);
  const details = buildPolicyDecisionExplanationLines(insight);
  const primaryBlockerReason =
    structuredDetails.find((detail) => detail.status === "pending") ?? null;

  if (!insight) {
    return {
      summary: "Policy özeti henüz üretilemedi.",
      details,
      structuredDetails,
      primaryBlockerReason
    };
  }

  if (insight.pendingRules.length === 0 && insight.matchedRules.length > 0) {
    return {
      summary: `${insight.profile} profili altında policy engelleri temizlenmiş görünüyor.`,
      details,
      structuredDetails,
      primaryBlockerReason
    };
  }

  if (insight.pendingRules.length > 0) {
    return {
      summary: `${insight.profile} profili altında ${insight.pendingRules.join(", ")} kuralı hâlâ beklemede.`,
      details,
      structuredDetails,
      primaryBlockerReason
    };
  }

  return {
    summary: `${insight.profile} profili altında policy değerlendirmesi dengeli durumda.`,
    details,
    structuredDetails,
    primaryBlockerReason
  };
}
