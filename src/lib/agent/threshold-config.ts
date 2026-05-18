import fs from "node:fs";
import path from "node:path";

export type TrustThresholds = {
  lowRiskAutoConfidence: number;
  approvalRequiredConfidence: number;
  contradictionForceObserveOnly: number;
  contradictionForceApproval: number;
};

export type IntegrityThresholds = {
  strongEvidenceScore: number;
  partialEvidenceScore: number;
  partialMaxContradictions: number;
  pilotReadyEvidenceScore: number;
  pilotReadyCoverageScore: number;
  pilotReadyTaskCompletion: number;
  pilotReadyCoherenceScore: number;
};

export type AgentThresholdProfile = {
  trust: TrustThresholds;
  integrity: IntegrityThresholds;
};

type AgentThresholdDocument = {
  activeProfile: string;
  profiles: Record<string, AgentThresholdProfile>;
};

const THRESHOLD_CONFIG_PATH = path.join(
  process.cwd(),
  "data",
  "agent-thresholds.json"
);

const DEFAULT_THRESHOLDS: AgentThresholdDocument = {
  activeProfile: "default",
  profiles: {
    default: {
      trust: {
        lowRiskAutoConfidence: 0.85,
        approvalRequiredConfidence: 0.6,
        contradictionForceObserveOnly: 2,
        contradictionForceApproval: 1
      },
      integrity: {
        strongEvidenceScore: 0.78,
        partialEvidenceScore: 0.55,
        partialMaxContradictions: 3,
        pilotReadyEvidenceScore: 0.72,
        pilotReadyCoverageScore: 0.8,
        pilotReadyTaskCompletion: 0.66,
        pilotReadyCoherenceScore: 0.8
      }
    }
  }
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeTrust(
  raw: unknown,
  base: TrustThresholds
): TrustThresholds {
  if (!isPlainObject(raw)) {
    return base;
  }

  return {
    lowRiskAutoConfidence: pickNumber(
      raw.lowRiskAutoConfidence,
      base.lowRiskAutoConfidence
    ),
    approvalRequiredConfidence: pickNumber(
      raw.approvalRequiredConfidence,
      base.approvalRequiredConfidence
    ),
    contradictionForceObserveOnly: pickNumber(
      raw.contradictionForceObserveOnly,
      base.contradictionForceObserveOnly
    ),
    contradictionForceApproval: pickNumber(
      raw.contradictionForceApproval,
      base.contradictionForceApproval
    )
  };
}

function normalizeIntegrity(
  raw: unknown,
  base: IntegrityThresholds
): IntegrityThresholds {
  if (!isPlainObject(raw)) {
    return base;
  }

  return {
    strongEvidenceScore: pickNumber(
      raw.strongEvidenceScore,
      base.strongEvidenceScore
    ),
    partialEvidenceScore: pickNumber(
      raw.partialEvidenceScore,
      base.partialEvidenceScore
    ),
    partialMaxContradictions: pickNumber(
      raw.partialMaxContradictions,
      base.partialMaxContradictions
    ),
    pilotReadyEvidenceScore: pickNumber(
      raw.pilotReadyEvidenceScore,
      base.pilotReadyEvidenceScore
    ),
    pilotReadyCoverageScore: pickNumber(
      raw.pilotReadyCoverageScore,
      base.pilotReadyCoverageScore
    ),
    pilotReadyTaskCompletion: pickNumber(
      raw.pilotReadyTaskCompletion,
      base.pilotReadyTaskCompletion
    ),
    pilotReadyCoherenceScore: pickNumber(
      raw.pilotReadyCoherenceScore,
      base.pilotReadyCoherenceScore
    )
  };
}

function loadThresholdDocument(): AgentThresholdDocument {
  try {
    if (!fs.existsSync(THRESHOLD_CONFIG_PATH)) {
      return DEFAULT_THRESHOLDS;
    }

    const raw = fs.readFileSync(THRESHOLD_CONFIG_PATH, "utf8");
    if (!raw.trim()) {
      return DEFAULT_THRESHOLDS;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!isPlainObject(parsed)) {
      return DEFAULT_THRESHOLDS;
    }

    const base = DEFAULT_THRESHOLDS.profiles.default;
    const profilesRaw = isPlainObject(parsed.profiles) ? parsed.profiles : {};
    const profiles: Record<string, AgentThresholdProfile> = {};

    for (const [name, value] of Object.entries(profilesRaw)) {
      if (!isPlainObject(value)) {
        continue;
      }

      profiles[name] = {
        trust: normalizeTrust(value.trust, base.trust),
        integrity: normalizeIntegrity(value.integrity, base.integrity)
      };
    }

    if (!profiles.default) {
      profiles.default = base;
    }

    return {
      activeProfile:
        typeof parsed.activeProfile === "string"
          ? parsed.activeProfile
          : DEFAULT_THRESHOLDS.activeProfile,
      profiles
    };
  } catch {
    return DEFAULT_THRESHOLDS;
  }
}

function resolveProfileName(document: AgentThresholdDocument): string {
  const requested = process.env.PROJECT_ASYLUM_THRESHOLD_PROFILE;
  if (
    typeof requested === "string" &&
    requested.trim().length > 0 &&
    document.profiles[requested]
  ) {
    return requested;
  }

  return document.profiles[document.activeProfile]
    ? document.activeProfile
    : "default";
}

export function getActiveAgentThresholdProfile(): AgentThresholdProfile {
  const document = loadThresholdDocument();
  const name = resolveProfileName(document);
  return (
    document.profiles[name] ??
    document.profiles.default ??
    DEFAULT_THRESHOLDS.profiles.default
  );
}

export function getActiveAgentThresholdProfileName(): string {
  return resolveProfileName(loadThresholdDocument());
}

export function getAgentThresholdConfigPath(): string {
  return THRESHOLD_CONFIG_PATH;
}
