import fs from "node:fs";
import path from "node:path";

import type {
  ApprovalRecord,
  ApprovalStatus,
  DryRunActionClass,
  DryRunBlastRadius,
  PersistentTrustRecord,
  PromptExecution,
  PromptExecutionReport
} from "../../types/agent";

type PersistentExecutionStore = {
  executions: PromptExecution[];
  reports: Record<string, PromptExecutionReport>;
  trustRecords: Record<string, PersistentTrustRecord>;
  approvals: Record<string, ApprovalRecord>;
};

const STORE_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(STORE_DIR, "agent-executions.json");

function emptyStore(): PersistentExecutionStore {
  return {
    executions: [],
    reports: {},
    trustRecords: {},
    approvals: {}
  };
}

const APPROVAL_STATUSES: ApprovalStatus[] = [
  "awaiting-approval",
  "approved",
  "rejected",
  "expired"
];

const APPROVAL_ACTION_CLASSES: DryRunActionClass[] = [
  "network-isolation",
  "config-hardening",
  "service-restart",
  "access-rotation",
  "logging-enable",
  "no-op"
];

const APPROVAL_BLAST_RADIUS: DryRunBlastRadius[] = ["narrow", "moderate", "wide"];

function pickEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T
): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function normalizeApprovalRecord(record: ApprovalRecord): ApprovalRecord {
  return {
    id: typeof record.id === "string" ? record.id : "",
    executionId:
      typeof record.executionId === "string" ? record.executionId : "",
    dryRunActionId:
      typeof record.dryRunActionId === "string" ? record.dryRunActionId : "",
    actionClass: pickEnum(record.actionClass, APPROVAL_ACTION_CLASSES, "no-op"),
    target: typeof record.target === "string" ? record.target : "",
    intent: typeof record.intent === "string" ? record.intent : "",
    blastRadius: pickEnum(record.blastRadius, APPROVAL_BLAST_RADIUS, "narrow"),
    reversible:
      typeof record.reversible === "boolean" ? record.reversible : true,
    status: pickEnum(record.status, APPROVAL_STATUSES, "awaiting-approval"),
    proposedAt:
      typeof record.proposedAt === "string" ? record.proposedAt : new Date(0).toISOString(),
    decidedAt:
      typeof record.decidedAt === "string" ? record.decidedAt : null,
    decidedBy: typeof record.decidedBy === "string" ? record.decidedBy : null,
    decisionRationale:
      typeof record.decisionRationale === "string"
        ? record.decisionRationale
        : null,
    expiresAt:
      typeof record.expiresAt === "string" ? record.expiresAt : new Date().toISOString(),
    matchKey: typeof record.matchKey === "string" ? record.matchKey : ""
  };
}

function normalizeReport(
  report: PromptExecutionReport
): PromptExecutionReport {
  return {
    ...report,
    policyProfile:
      typeof report.policyProfile === "string" && report.policyProfile.length > 0
        ? report.policyProfile
        : report.execution?.policyProfile ?? "default",
    execution: {
      ...report.execution,
      policyProfile:
        typeof report.execution?.policyProfile === "string" &&
        report.execution.policyProfile.length > 0
          ? report.execution.policyProfile
          : report.policyProfile ?? "default"
    },
    taskRuns: Array.isArray(report.taskRuns)
      ? report.taskRuns.map((taskRun, index) => ({
          ...taskRun,
          attempt:
            typeof taskRun.attempt === "number" && Number.isFinite(taskRun.attempt)
              ? taskRun.attempt
              : index + 1
        }))
      : []
  };
}

function normalizeExecution(execution: PromptExecution): PromptExecution {
  return {
    ...execution,
    policyProfile:
      typeof execution.policyProfile === "string" &&
      execution.policyProfile.length > 0
        ? execution.policyProfile
        : "default"
  };
}

function normalizeTrustRecord(
  record: PersistentTrustRecord
): PersistentTrustRecord {
  return {
    key: record.key,
    scope: record.scope === "action" ? "action" : "environment",
    successCount:
      typeof record.successCount === "number" && Number.isFinite(record.successCount)
        ? record.successCount
        : 0,
    triageCount:
      typeof record.triageCount === "number" && Number.isFinite(record.triageCount)
        ? record.triageCount
        : 0,
    lastStatus:
      typeof record.lastStatus === "string" ? record.lastStatus : null,
    lastConfidenceScore:
      typeof record.lastConfidenceScore === "number" &&
      Number.isFinite(record.lastConfidenceScore)
        ? record.lastConfidenceScore
        : null,
    updatedAt:
      typeof record.updatedAt === "string" && record.updatedAt.length > 0
        ? record.updatedAt
        : new Date(0).toISOString()
  };
}

function ensureStoreDir(): void {
  fs.mkdirSync(STORE_DIR, { recursive: true });
}

export function loadPersistentExecutionStore(): PersistentExecutionStore {
  try {
    ensureStoreDir();

    if (!fs.existsSync(STORE_PATH)) {
      return emptyStore();
    }

    const raw = fs.readFileSync(STORE_PATH, "utf8");
    if (!raw.trim()) {
      return emptyStore();
    }

    const parsed = JSON.parse(raw) as Partial<PersistentExecutionStore>;
    const reports =
      parsed.reports && typeof parsed.reports === "object" ? parsed.reports : {};
    const trustRecords =
      parsed.trustRecords && typeof parsed.trustRecords === "object"
        ? parsed.trustRecords
        : {};
    const approvals =
      parsed.approvals && typeof parsed.approvals === "object"
        ? parsed.approvals
        : {};

    return {
      executions: Array.isArray(parsed.executions)
        ? parsed.executions.map((execution) =>
            normalizeExecution(execution as PromptExecution)
          )
        : [],
      reports: Object.fromEntries(
        Object.entries(reports).map(([key, value]) => [
          key,
          normalizeReport(value as PromptExecutionReport)
        ])
      ),
      trustRecords: Object.fromEntries(
        Object.entries(trustRecords).map(([key, value]) => [
          key,
          normalizeTrustRecord(value as PersistentTrustRecord)
        ])
      ),
      approvals: Object.fromEntries(
        Object.entries(approvals).map(([key, value]) => [
          key,
          normalizeApprovalRecord(value as ApprovalRecord)
        ])
      )
    };
  } catch {
    return emptyStore();
  }
}

export function savePersistentExecutionStore(
  store: PersistentExecutionStore
): void {
  ensureStoreDir();
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export function getPersistentExecutionStorePath(): string {
  return STORE_PATH;
}
