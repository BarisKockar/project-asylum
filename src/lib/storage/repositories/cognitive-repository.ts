import {
  CognitiveBelief,
  CognitiveDecision,
  CognitiveEpisode,
  CognitiveGoal,
  CognitiveHypothesis,
  CognitiveObservation,
  CognitiveOutcome,
  CognitivePlan
} from "@/types/cognitive";
import { bootstrapStorage } from "@/lib/storage/bootstrap";

export function listObservations(targetId?: string): CognitiveObservation[] {
  const db = bootstrapStorage();
  const rows = targetId
    ? db.prepare("SELECT * FROM cognitive_observations WHERE target_id = ? ORDER BY rowid ASC").all(targetId)
    : db.prepare("SELECT * FROM cognitive_observations ORDER BY rowid ASC").all();
  const evidenceStmt = db.prepare(
    "SELECT evidence FROM cognitive_observation_evidence WHERE observation_id = ? ORDER BY position ASC"
  );

  return rows.map((row) => {
    const observation = row as {
      id: string;
      target_id: string;
      kind: CognitiveObservation["kind"];
      source: string;
      summary: string;
      confidence: CognitiveObservation["confidence"];
      observed_at: string;
    };

    return {
      id: observation.id,
      targetId: observation.target_id,
      kind: observation.kind,
      source: observation.source,
      summary: observation.summary,
      evidence: evidenceStmt.all(observation.id).map((item) => (item as { evidence: string }).evidence),
      confidence: observation.confidence,
      observedAt: observation.observed_at
    };
  });
}

export function listBeliefs(targetId?: string): CognitiveBelief[] {
  const db = bootstrapStorage();
  const rows = targetId
    ? db.prepare("SELECT * FROM cognitive_beliefs WHERE target_id = ? ORDER BY rowid ASC").all(targetId)
    : db.prepare("SELECT * FROM cognitive_beliefs ORDER BY rowid ASC").all();
  const basisStmt = db.prepare(
    "SELECT observation_id FROM cognitive_belief_observations WHERE belief_id = ? ORDER BY position ASC"
  );

  return rows.map((row) => {
    const belief = row as {
      id: string;
      target_id: string;
      statement: string;
      confidence: number;
      status: CognitiveBelief["status"];
      updated_at: string;
    };

    return {
      id: belief.id,
      targetId: belief.target_id,
      statement: belief.statement,
      basisObservationIds: basisStmt.all(belief.id).map((item) => (item as { observation_id: string }).observation_id),
      confidence: belief.confidence,
      status: belief.status,
      updatedAt: belief.updated_at
    };
  });
}

export function listHypotheses(targetId?: string): CognitiveHypothesis[] {
  const db = bootstrapStorage();
  const rows = targetId
    ? db.prepare("SELECT * FROM cognitive_hypotheses WHERE target_id = ? ORDER BY rowid ASC").all(targetId)
    : db.prepare("SELECT * FROM cognitive_hypotheses ORDER BY rowid ASC").all();
  const beliefStmt = db.prepare(
    "SELECT belief_id FROM cognitive_hypothesis_beliefs WHERE hypothesis_id = ? ORDER BY position ASC"
  );

  return rows.map((row) => {
    const hypothesis = row as {
      id: string;
      target_id: string;
      title: string;
      explanation: string;
      risk_score: number;
      uncertainty_score: number;
      status: CognitiveHypothesis["status"];
      updated_at: string;
    };

    return {
      id: hypothesis.id,
      targetId: hypothesis.target_id,
      title: hypothesis.title,
      explanation: hypothesis.explanation,
      supportingBeliefIds: beliefStmt.all(hypothesis.id).map((item) => (item as { belief_id: string }).belief_id),
      riskScore: hypothesis.risk_score,
      uncertaintyScore: hypothesis.uncertainty_score,
      status: hypothesis.status,
      updatedAt: hypothesis.updated_at
    };
  });
}

export function listGoals(targetId?: string): CognitiveGoal[] {
  const db = bootstrapStorage();
  const rows = targetId
    ? db.prepare("SELECT * FROM cognitive_goals WHERE target_id = ? ORDER BY rowid ASC").all(targetId)
    : db.prepare("SELECT * FROM cognitive_goals ORDER BY rowid ASC").all();

  return rows.map((row) => {
    const goal = row as {
      id: string;
      target_id: string;
      kind: CognitiveGoal["kind"];
      intent: string;
      priority: number;
      created_at: string;
    };

    return {
      id: goal.id,
      targetId: goal.target_id,
      kind: goal.kind,
      intent: goal.intent,
      priority: goal.priority,
      createdAt: goal.created_at
    };
  });
}

export function listPlans(targetId?: string): CognitivePlan[] {
  const db = bootstrapStorage();
  const rows = targetId
    ? db.prepare("SELECT * FROM cognitive_plans WHERE target_id = ? ORDER BY rowid ASC").all(targetId)
    : db.prepare("SELECT * FROM cognitive_plans ORDER BY rowid ASC").all();
  const hypothesisStmt = db.prepare(
    "SELECT hypothesis_id FROM cognitive_plan_hypotheses WHERE plan_id = ? ORDER BY position ASC"
  );
  const stepStmt = db.prepare(
    "SELECT * FROM cognitive_plan_steps WHERE plan_id = ? ORDER BY position ASC"
  );

  return rows.map((row) => {
    const plan = row as {
      id: string;
      target_id: string;
      goal_id: string;
      rationale: string;
      blast_radius: CognitivePlan["blastRadius"];
      confidence: number;
      status: CognitivePlan["status"];
      created_at: string;
    };

    return {
      id: plan.id,
      targetId: plan.target_id,
      goalId: plan.goal_id,
      hypothesisIds: hypothesisStmt.all(plan.id).map((item) => (item as { hypothesis_id: string }).hypothesis_id),
      rationale: plan.rationale,
      blastRadius: plan.blast_radius,
      confidence: plan.confidence,
      status: plan.status,
      steps: stepStmt.all(plan.id).map((item) => {
        const step = item as {
          id: string;
          title: string;
          action_type: string;
          requires_approval: number;
          rollback_hint: string | null;
        };
        return {
          id: step.id,
          title: step.title,
          actionType: step.action_type,
          requiresApproval: Boolean(step.requires_approval),
          rollbackHint: step.rollback_hint
        };
      }),
      createdAt: plan.created_at
    };
  });
}

export function listDecisions(targetId?: string): CognitiveDecision[] {
  const db = bootstrapStorage();
  const rows = targetId
    ? db.prepare("SELECT * FROM cognitive_decisions WHERE target_id = ? ORDER BY rowid ASC").all(targetId)
    : db.prepare("SELECT * FROM cognitive_decisions ORDER BY rowid ASC").all();
  const blockerStmt = db.prepare(
    "SELECT blocker FROM cognitive_decision_blockers WHERE decision_id = ? ORDER BY position ASC"
  );

  return rows.map((row) => {
    const decision = row as {
      id: string;
      target_id: string;
      selected_plan_id: string | null;
      status: CognitiveDecision["status"];
      justification: string;
      created_at: string;
    };

    return {
      id: decision.id,
      targetId: decision.target_id,
      selectedPlanId: decision.selected_plan_id,
      status: decision.status,
      justification: decision.justification,
      blockedBy: blockerStmt.all(decision.id).map((item) => (item as { blocker: string }).blocker),
      createdAt: decision.created_at
    };
  });
}

export function listOutcomes(targetId?: string): CognitiveOutcome[] {
  const db = bootstrapStorage();
  const rows = targetId
    ? db.prepare("SELECT * FROM cognitive_outcomes WHERE target_id = ? ORDER BY rowid ASC").all(targetId)
    : db.prepare("SELECT * FROM cognitive_outcomes ORDER BY rowid ASC").all();
  const lessonStmt = db.prepare(
    "SELECT lesson FROM cognitive_outcome_lessons WHERE outcome_id = ? ORDER BY position ASC"
  );

  return rows.map((row) => {
    const outcome = row as {
      id: string;
      target_id: string;
      plan_id: string | null;
      status: CognitiveOutcome["status"];
      expected_result: string;
      actual_result: string;
      recorded_at: string;
    };

    return {
      id: outcome.id,
      targetId: outcome.target_id,
      planId: outcome.plan_id,
      status: outcome.status,
      expectedResult: outcome.expected_result,
      actualResult: outcome.actual_result,
      lessons: lessonStmt.all(outcome.id).map((item) => (item as { lesson: string }).lesson),
      recordedAt: outcome.recorded_at
    };
  });
}

export function getCognitiveEpisode(targetId: string): CognitiveEpisode {
  return {
    targetId,
    observations: listObservations(targetId),
    beliefs: listBeliefs(targetId),
    hypotheses: listHypotheses(targetId),
    goals: listGoals(targetId),
    plans: listPlans(targetId),
    decisions: listDecisions(targetId),
    outcomes: listOutcomes(targetId)
  };
}

export function insertObservation(observation: CognitiveObservation) {
  const db = bootstrapStorage();
  db.prepare(
    `
      INSERT OR REPLACE INTO cognitive_observations (
        id, target_id, kind, source, summary, confidence, observed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `
  ).run(
    observation.id,
    observation.targetId,
    observation.kind,
    observation.source,
    observation.summary,
    observation.confidence,
    observation.observedAt
  );

  observation.evidence.forEach((evidence, index) => {
    db.prepare(
      `
        INSERT INTO cognitive_observation_evidence (observation_id, evidence, position)
        VALUES (?, ?, ?)
      `
    ).run(observation.id, evidence, index);
  });

  return observation;
}

export function insertBelief(belief: CognitiveBelief) {
  const db = bootstrapStorage();
  db.prepare(
    `
      INSERT OR REPLACE INTO cognitive_beliefs (
        id, target_id, statement, confidence, status, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `
  ).run(
    belief.id,
    belief.targetId,
    belief.statement,
    belief.confidence,
    belief.status,
    belief.updatedAt
  );

  belief.basisObservationIds.forEach((observationId, index) => {
    db.prepare(
      `
        INSERT INTO cognitive_belief_observations (belief_id, observation_id, position)
        VALUES (?, ?, ?)
      `
    ).run(belief.id, observationId, index);
  });

  return belief;
}

export function insertHypothesis(hypothesis: CognitiveHypothesis) {
  const db = bootstrapStorage();
  db.prepare(
    `
      INSERT OR REPLACE INTO cognitive_hypotheses (
        id, target_id, title, explanation, risk_score, uncertainty_score, status, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
  ).run(
    hypothesis.id,
    hypothesis.targetId,
    hypothesis.title,
    hypothesis.explanation,
    hypothesis.riskScore,
    hypothesis.uncertaintyScore,
    hypothesis.status,
    hypothesis.updatedAt
  );

  hypothesis.supportingBeliefIds.forEach((beliefId, index) => {
    db.prepare(
      `
        INSERT INTO cognitive_hypothesis_beliefs (hypothesis_id, belief_id, position)
        VALUES (?, ?, ?)
      `
    ).run(hypothesis.id, beliefId, index);
  });

  return hypothesis;
}

export function insertGoal(goal: CognitiveGoal) {
  const db = bootstrapStorage();
  db.prepare(
    `
      INSERT OR REPLACE INTO cognitive_goals (
        id, target_id, kind, intent, priority, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `
  ).run(goal.id, goal.targetId, goal.kind, goal.intent, goal.priority, goal.createdAt);

  return goal;
}

export function insertPlan(plan: CognitivePlan) {
  const db = bootstrapStorage();
  db.prepare(
    `
      INSERT OR REPLACE INTO cognitive_plans (
        id, target_id, goal_id, rationale, blast_radius, confidence, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
  ).run(
    plan.id,
    plan.targetId,
    plan.goalId,
    plan.rationale,
    plan.blastRadius,
    plan.confidence,
    plan.status,
    plan.createdAt
  );

  plan.hypothesisIds.forEach((hypothesisId, index) => {
    db.prepare(
      `
        INSERT INTO cognitive_plan_hypotheses (plan_id, hypothesis_id, position)
        VALUES (?, ?, ?)
      `
    ).run(plan.id, hypothesisId, index);
  });

  plan.steps.forEach((step, index) => {
    db.prepare(
      `
        INSERT INTO cognitive_plan_steps (
          id, plan_id, title, action_type, requires_approval, rollback_hint, position
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      step.id,
      plan.id,
      step.title,
      step.actionType,
      Number(step.requiresApproval),
      step.rollbackHint,
      index
    );
  });

  return plan;
}

export function insertDecision(decision: CognitiveDecision) {
  const db = bootstrapStorage();
  db.prepare(
    `
      INSERT OR REPLACE INTO cognitive_decisions (
        id, target_id, selected_plan_id, status, justification, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `
  ).run(
    decision.id,
    decision.targetId,
    decision.selectedPlanId,
    decision.status,
    decision.justification,
    decision.createdAt
  );

  db.prepare("DELETE FROM cognitive_decision_blockers WHERE decision_id = ?").run(
    decision.id
  );

  decision.blockedBy.forEach((blocker, index) => {
    db.prepare(
      `
        INSERT INTO cognitive_decision_blockers (decision_id, blocker, position)
        VALUES (?, ?, ?)
      `
    ).run(decision.id, blocker, index);
  });

  return decision;
}

export function insertOutcome(outcome: CognitiveOutcome) {
  const db = bootstrapStorage();
  db.prepare(
    `
      INSERT OR REPLACE INTO cognitive_outcomes (
        id, target_id, plan_id, status, expected_result, actual_result, recorded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `
  ).run(
    outcome.id,
    outcome.targetId,
    outcome.planId,
    outcome.status,
    outcome.expectedResult,
    outcome.actualResult,
    outcome.recordedAt
  );

  outcome.lessons.forEach((lesson, index) => {
    db.prepare(
      `
        INSERT INTO cognitive_outcome_lessons (outcome_id, lesson, position)
        VALUES (?, ?, ?)
      `
    ).run(outcome.id, lesson, index);
  });

  return outcome;
}
