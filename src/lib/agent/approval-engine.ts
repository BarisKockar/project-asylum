import type {
  ApprovalRecord,
  ApprovalStatus,
  DryRunAction
} from "../../types/agent";
import {
  getExecutionStore,
  listApprovalRecords,
  persistExecutionStore
} from "./execution-store";

// 24h validity window for an approval. Past this point an unhandled
// awaiting record is auto-expired on the next sweep, and a decided
// record stops counting as a fresh decision for the same (class,target).
export const APPROVAL_TTL_MS = 24 * 60 * 60 * 1000;

function buildMatchKey(actionClass: string, target: string): string {
  return `${actionClass}::${target}`;
}

function generateApprovalId(): string {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `apr-${Date.now()}-${suffix}`;
}

function isLive(record: ApprovalRecord, now: number): boolean {
  if (record.status === "expired" || record.status === "rejected") {
    return false;
  }

  return new Date(record.expiresAt).getTime() > now;
}

/**
 * Record any awaiting-approval dry-run actions that don't already have a
 * live approval entry. Approvals are de-duplicated by (executionId,
 * dryRunActionId) so re-running the same execution doesn't create spam.
 */
export function recordPendingApprovals(
  executionId: string,
  actions: DryRunAction[]
): ApprovalRecord[] {
  const store = getExecutionStore();
  const now = Date.now();
  const created: ApprovalRecord[] = [];

  for (const action of actions) {
    if (action.status !== "awaiting-approval") {
      continue;
    }

    const existing = Object.values(store.approvals).find(
      (record) =>
        record.executionId === executionId &&
        record.dryRunActionId === action.id
    );

    if (existing) {
      continue;
    }

    const record: ApprovalRecord = {
      id: generateApprovalId(),
      executionId,
      dryRunActionId: action.id,
      actionClass: action.class,
      target: action.target,
      intent: action.intent,
      blastRadius: action.blastRadius,
      reversible: action.reversible,
      status: "awaiting-approval",
      proposedAt: new Date(now).toISOString(),
      decidedAt: null,
      decidedBy: null,
      decisionRationale: null,
      expiresAt: new Date(now + APPROVAL_TTL_MS).toISOString(),
      matchKey: buildMatchKey(action.class, action.target)
    };

    store.approvals[record.id] = record;
    created.push(record);
  }

  if (created.length > 0) {
    persistExecutionStore();
  }

  return created;
}

function decideApproval(
  approvalId: string,
  status: "approved" | "rejected",
  options: { decidedBy: string; rationale: string }
): ApprovalRecord {
  const store = getExecutionStore();
  const record = store.approvals[approvalId];

  if (!record) {
    throw new Error(`Approval not found: ${approvalId}`);
  }

  if (record.status !== "awaiting-approval") {
    throw new Error(
      `Approval ${approvalId} already decided (status=${record.status}); cannot transition to ${status}.`
    );
  }

  const updated: ApprovalRecord = {
    ...record,
    status,
    decidedAt: new Date().toISOString(),
    decidedBy: options.decidedBy,
    decisionRationale: options.rationale
  };

  store.approvals[approvalId] = updated;
  persistExecutionStore();

  return updated;
}

export function approveAction(
  approvalId: string,
  options: { decidedBy: string; rationale: string }
): ApprovalRecord {
  return decideApproval(approvalId, "approved", options);
}

export function rejectAction(
  approvalId: string,
  options: { decidedBy: string; rationale: string }
): ApprovalRecord {
  return decideApproval(approvalId, "rejected", options);
}

/**
 * Sweep awaiting-approval records whose TTL has lapsed and mark them
 * expired. Returns the count of records transitioned.
 */
export function expirePendingApprovals(nowMs: number = Date.now()): number {
  const store = getExecutionStore();
  let count = 0;

  for (const [id, record] of Object.entries(store.approvals)) {
    if (record.status !== "awaiting-approval") {
      continue;
    }

    if (new Date(record.expiresAt).getTime() <= nowMs) {
      store.approvals[id] = {
        ...record,
        status: "expired",
        decidedAt: new Date(nowMs).toISOString()
      };
      count += 1;
    }
  }

  if (count > 0) {
    persistExecutionStore();
  }

  return count;
}

/**
 * Find the most recent LIVE approval (awaiting/approved) for a given
 * (actionClass, target) tuple. Used by the dry-run engine to honor an
 * operator's earlier decision on the same surface without forcing them
 * to re-approve every prompt run.
 */
export function findLiveApprovalFor(
  actionClass: string,
  target: string,
  nowMs: number = Date.now()
): ApprovalRecord | null {
  const matchKey = buildMatchKey(actionClass, target);
  const candidates = Object.values(getExecutionStore().approvals)
    .filter((record) => record.matchKey === matchKey)
    .filter((record) => isLive(record, nowMs))
    .sort((left, right) => right.proposedAt.localeCompare(left.proposedAt));

  return candidates[0] ?? null;
}

export function getApproval(approvalId: string): ApprovalRecord | null {
  return getExecutionStore().approvals[approvalId] ?? null;
}

export function listApprovals(filters?: {
  status?: ApprovalStatus | "all";
  executionId?: string;
}): ApprovalRecord[] {
  return listApprovalRecords(filters);
}
