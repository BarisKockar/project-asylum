import fs from "node:fs";
import path from "node:path";

import type { PromptExecution, PromptExecutionReport } from "../../types/agent";

type PersistentExecutionStore = {
  executions: PromptExecution[];
  reports: Record<string, PromptExecutionReport>;
};

const STORE_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(STORE_DIR, "agent-executions.json");

function emptyStore(): PersistentExecutionStore {
  return {
    executions: [],
    reports: {}
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
