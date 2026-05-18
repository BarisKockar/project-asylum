import fs from "node:fs";
import path from "node:path";

export type SecurityKnowledgeProfile = {
  reviewProcessKeywords: string[];
  reviewPorts: number[];
  adminPanelEscalationPorts: number[];
  logSecurityKeywords: string[];
};

type SecurityKnowledgeDocument = {
  activeProfile: string;
  profiles: Record<string, SecurityKnowledgeProfile>;
};

const KNOWLEDGE_CONFIG_PATH = path.join(
  process.cwd(),
  "data",
  "security-knowledge.json"
);

const DEFAULT_KNOWLEDGE: SecurityKnowledgeDocument = {
  activeProfile: "default",
  profiles: {
    default: {
      reviewProcessKeywords: [
        "nc",
        "ncat",
        "netcat",
        "socat",
        "tcpdump",
        "wireshark",
        "mitmproxy",
        "frida"
      ],
      reviewPorts: [
        22,
        2375,
        2376,
        3306,
        5432,
        5601,
        6379,
        8000,
        8080,
        8443,
        9000,
        9200
      ],
      adminPanelEscalationPorts: [8000, 8080, 8443, 9000],
      logSecurityKeywords: [
        "failed password",
        "authentication failure",
        "sudo",
        "denied",
        "error",
        "invalid user",
        "security",
        "firewall"
      ]
    }
  }
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickStrings(value: unknown, fallback: string[]): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : fallback;
}

function pickNumbers(value: unknown, fallback: number[]): number[] {
  return Array.isArray(value)
    ? value.filter((item): item is number => typeof item === "number")
    : fallback;
}

function normalizeProfile(
  raw: unknown,
  base: SecurityKnowledgeProfile
): SecurityKnowledgeProfile {
  if (!isPlainObject(raw)) {
    return base;
  }

  return {
    reviewProcessKeywords: pickStrings(
      raw.reviewProcessKeywords,
      base.reviewProcessKeywords
    ),
    reviewPorts: pickNumbers(raw.reviewPorts, base.reviewPorts),
    adminPanelEscalationPorts: pickNumbers(
      raw.adminPanelEscalationPorts,
      base.adminPanelEscalationPorts
    ),
    logSecurityKeywords: pickStrings(
      raw.logSecurityKeywords,
      base.logSecurityKeywords
    )
  };
}

function loadKnowledgeDocument(): SecurityKnowledgeDocument {
  try {
    if (!fs.existsSync(KNOWLEDGE_CONFIG_PATH)) {
      return DEFAULT_KNOWLEDGE;
    }

    const raw = fs.readFileSync(KNOWLEDGE_CONFIG_PATH, "utf8");
    if (!raw.trim()) {
      return DEFAULT_KNOWLEDGE;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!isPlainObject(parsed)) {
      return DEFAULT_KNOWLEDGE;
    }

    const base = DEFAULT_KNOWLEDGE.profiles.default;
    const profilesRaw = isPlainObject(parsed.profiles) ? parsed.profiles : {};
    const profiles: Record<string, SecurityKnowledgeProfile> = {};

    for (const [name, value] of Object.entries(profilesRaw)) {
      profiles[name] = normalizeProfile(value, base);
    }

    if (!profiles.default) {
      profiles.default = base;
    }

    return {
      activeProfile:
        typeof parsed.activeProfile === "string"
          ? parsed.activeProfile
          : DEFAULT_KNOWLEDGE.activeProfile,
      profiles
    };
  } catch {
    return DEFAULT_KNOWLEDGE;
  }
}

function resolveProfileName(document: SecurityKnowledgeDocument): string {
  const requested = process.env.PROJECT_ASYLUM_SECURITY_PROFILE;
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

export function getActiveSecurityKnowledgeProfile(): SecurityKnowledgeProfile {
  const document = loadKnowledgeDocument();
  const name = resolveProfileName(document);
  return (
    document.profiles[name] ??
    document.profiles.default ??
    DEFAULT_KNOWLEDGE.profiles.default
  );
}

export function getActiveSecurityKnowledgeProfileName(): string {
  return resolveProfileName(loadKnowledgeDocument());
}

export function getSecurityKnowledgeConfigPath(): string {
  return KNOWLEDGE_CONFIG_PATH;
}
