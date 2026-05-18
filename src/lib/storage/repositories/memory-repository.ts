import { CognitiveMemorySummary } from "@/types/cognitive";
import { bootstrapStorage } from "@/lib/storage/bootstrap";

export function getMemorySummary(targetId: string): CognitiveMemorySummary | null {
  const db = bootstrapStorage();
  const row = db
    .prepare("SELECT * FROM cognitive_memory_summaries WHERE target_id = ?")
    .get(targetId) as
    | {
        target_id: string;
        total_outcomes: number;
        partial_outcomes: number;
        failed_outcomes: number;
        last_outcome_status: CognitiveMemorySummary["lastOutcomeStatus"];
        effect: string;
        updated_at: string;
      }
    | undefined;

  if (!row) {
    return null;
  }

  return {
    targetId: row.target_id,
    totalOutcomes: row.total_outcomes,
    partialOutcomes: row.partial_outcomes,
    failedOutcomes: row.failed_outcomes,
    lastOutcomeStatus: row.last_outcome_status,
    effect: row.effect,
    updatedAt: row.updated_at
  };
}

export function upsertMemorySummary(summary: CognitiveMemorySummary) {
  const db = bootstrapStorage();
  db.prepare(
    `
      INSERT OR REPLACE INTO cognitive_memory_summaries (
        target_id,
        total_outcomes,
        partial_outcomes,
        failed_outcomes,
        last_outcome_status,
        effect,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `
  ).run(
    summary.targetId,
    summary.totalOutcomes,
    summary.partialOutcomes,
    summary.failedOutcomes,
    summary.lastOutcomeStatus,
    summary.effect,
    summary.updatedAt ?? new Date().toISOString()
  );

  return summary;
}
