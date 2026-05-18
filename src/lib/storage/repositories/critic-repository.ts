import { CognitiveCritique } from "@/types/cognitive";
import { bootstrapStorage } from "@/lib/storage/bootstrap";

export function listCritiques(targetId?: string): CognitiveCritique[] {
  const db = bootstrapStorage();
  const rows = targetId
    ? db
        .prepare(
          "SELECT * FROM cognitive_critiques WHERE target_id = ? ORDER BY rowid ASC"
        )
        .all(targetId)
    : db
        .prepare("SELECT * FROM cognitive_critiques ORDER BY rowid ASC")
        .all();

  const reasonStmt = db.prepare(
    "SELECT reason FROM cognitive_critique_reasons WHERE critique_id = ? ORDER BY position ASC"
  );
  const flagStmt = db.prepare(
    "SELECT risk_flag FROM cognitive_critique_risk_flags WHERE critique_id = ? ORDER BY position ASC"
  );

  return rows.map((row) => {
    const critique = row as {
      id: string;
      target_id: string;
      plan_id: string | null;
      verdict: CognitiveCritique["verdict"];
      created_at: string;
    };

    return {
      id: critique.id,
      targetId: critique.target_id,
      planId: critique.plan_id,
      verdict: critique.verdict,
      reasons: reasonStmt
        .all(critique.id)
        .map((item) => (item as { reason: string }).reason),
      riskFlags: flagStmt
        .all(critique.id)
        .map((item) => (item as { risk_flag: string }).risk_flag),
      createdAt: critique.created_at
    };
  });
}

export function insertCritique(critique: CognitiveCritique) {
  const db = bootstrapStorage();
  const critiqueId = critique.id ?? `critique-${Date.now()}`;

  db.prepare(
    `
      INSERT OR REPLACE INTO cognitive_critiques (
        id, target_id, plan_id, verdict, created_at
      ) VALUES (?, ?, ?, ?, ?)
    `
  ).run(
    critiqueId,
    critique.targetId,
    critique.planId,
    critique.verdict,
    critique.createdAt
  );

  critique.reasons.forEach((reason, index) => {
    db.prepare(
      `
        INSERT INTO cognitive_critique_reasons (critique_id, reason, position)
        VALUES (?, ?, ?)
      `
    ).run(critiqueId, reason, index);
  });

  critique.riskFlags.forEach((flag, index) => {
    db.prepare(
      `
        INSERT INTO cognitive_critique_risk_flags (critique_id, risk_flag, position)
        VALUES (?, ?, ?)
      `
    ).run(critiqueId, flag, index);
  });

  return {
    ...critique,
    id: critiqueId
  };
}
