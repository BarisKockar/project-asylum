import Database from "better-sqlite3";
import { getSeedBundle } from "@/lib/storage/seed";
import { ensureDbInitialized } from "@/lib/storage/db";

function hasCoreSeedData(db: Database.Database) {
  const row = db
    .prepare("SELECT COUNT(*) as count FROM findings")
    .get() as { count: number };

  return row.count > 0;
}

function hasTableData(db: Database.Database, table: string) {
  const row = db
    .prepare(`SELECT COUNT(*) as count FROM ${table}`)
    .get() as { count: number };

  return row.count > 0;
}

function seedDatabase(db: Database.Database) {
  const seed = getSeedBundle();
  const now = new Date().toISOString();

  const transaction = db.transaction(() => {
    if (!hasCoreSeedData(db)) {
      db.prepare(
        `
          INSERT OR REPLACE INTO runtime_policy (
            id,
            local_only,
            external_apis_allowed,
            approval_required_for_high_risk,
            allowed_execution_targets_json,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?)
        `
      ).run(
        1,
        Number(seed.runtimePolicy.localOnly),
        Number(seed.runtimePolicy.externalApisAllowed),
        Number(seed.runtimePolicy.approvalRequiredForHighRisk),
        JSON.stringify(seed.runtimePolicy.allowedExecutionTargets),
        now
      );

      for (const stage of seed.workflow) {
        db.prepare(
          `
            INSERT OR REPLACE INTO workflow_stages (name, description, status)
            VALUES (?, ?, ?)
          `
        ).run(stage.name, stage.description, stage.status);
      }

      for (const finding of seed.findings) {
        db.prepare(
          `
            INSERT OR REPLACE INTO findings (
              id,
              title,
              asset,
              severity,
              confidence,
              summary,
              recommended_action,
              requires_approval
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `
        ).run(
          finding.id,
          finding.title,
          finding.asset,
          finding.severity,
          finding.confidence,
          finding.summary,
          finding.recommendedAction,
          Number(finding.requiresApproval)
        );

        finding.evidence.forEach((evidence, index) => {
          db.prepare(
            `
              INSERT INTO finding_evidence (finding_id, evidence, position)
              VALUES (?, ?, ?)
            `
          ).run(finding.id, evidence, index);
        });
      }

      for (const playbook of seed.playbooks) {
        db.prepare(
          `
            INSERT OR REPLACE INTO playbooks (
              id,
              title,
              blast_radius,
              rollback_ready,
              automation_level
            ) VALUES (?, ?, ?, ?, ?)
          `
        ).run(
          playbook.id,
          playbook.title,
          playbook.blastRadius,
          Number(playbook.rollbackReady),
          playbook.automationLevel
        );

        playbook.steps.forEach((step, index) => {
          db.prepare(
            `
              INSERT INTO playbook_steps (playbook_id, step, position)
              VALUES (?, ?, ?)
            `
          ).run(playbook.id, step, index);
        });
      }

      for (const component of seed.components) {
        db.prepare(
          `
            INSERT OR REPLACE INTO platform_components (
              id,
              name,
              kind,
              responsibility,
              local_only
            ) VALUES (?, ?, ?, ?, ?)
          `
        ).run(
          component.id,
          component.name,
          component.kind,
          component.responsibility,
          Number(component.localOnly)
        );

        component.dependencies.forEach((dependencyId, index) => {
          db.prepare(
            `
              INSERT INTO component_dependencies (component_id, dependency_id, position)
              VALUES (?, ?, ?)
            `
          ).run(component.id, dependencyId, index);
        });
      }

      for (const run of seed.runs) {
        db.prepare(
          `
            INSERT OR REPLACE INTO pipeline_runs (
              id,
              target,
              status,
              current_stage,
              started_at,
              summary
            ) VALUES (?, ?, ?, ?, ?, ?)
          `
        ).run(
          run.id,
          run.target,
          run.status,
          run.currentStage,
          run.startedAt,
          run.summary
        );
      }
    }

    if (!hasTableData(db, "assets")) {
      for (const asset of seed.assets) {
        db.prepare(
          `
            INSERT OR REPLACE INTO assets (
              id,
              name,
              kind,
              target,
              environment,
              criticality,
              owner,
              tags_json,
              created_at,
              updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `
        ).run(
          asset.id,
          asset.name,
          asset.kind,
          asset.target,
          asset.environment,
          asset.criticality,
          asset.owner,
          JSON.stringify(asset.tags),
          asset.createdAt,
          asset.updatedAt
        );
      }
    }

    if (!hasTableData(db, "scans")) {
      for (const scan of seed.scans) {
        db.prepare(
          `
            INSERT OR REPLACE INTO scans (
              id,
              asset_id,
              kind,
              status,
              started_at,
              finished_at,
              summary
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `
        ).run(
          scan.id,
          scan.assetId,
          scan.kind,
          scan.status,
          scan.startedAt,
          scan.finishedAt,
          scan.summary
        );
      }
    }

    if (!hasTableData(db, "policies")) {
      for (const policy of seed.policies) {
        db.prepare(
          `
            INSERT OR REPLACE INTO policies (
              id,
              name,
              description,
              mode,
              enabled,
              scope,
              created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `
        ).run(
          policy.id,
          policy.name,
          policy.description,
          policy.mode,
          Number(policy.enabled),
          policy.scope,
          policy.createdAt
        );
      }
    }

    if (!hasTableData(db, "audit_logs")) {
      for (const log of seed.auditLogs) {
        db.prepare(
          `
            INSERT OR REPLACE INTO audit_logs (
              id,
              actor,
              action,
              target_type,
              target_id,
              level,
              details,
              created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `
        ).run(
          log.id,
          log.actor,
          log.action,
          log.targetType,
          log.targetId,
          log.level,
          log.details,
          log.createdAt
        );
      }
    }

    if (!hasTableData(db, "cognitive_observations")) {
      for (const observation of seed.cognitiveEpisode.observations) {
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
      }

      for (const belief of seed.cognitiveEpisode.beliefs) {
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
      }

      for (const hypothesis of seed.cognitiveEpisode.hypotheses) {
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
      }

      for (const goal of seed.cognitiveEpisode.goals) {
        db.prepare(
          `
            INSERT OR REPLACE INTO cognitive_goals (
              id, target_id, kind, intent, priority, created_at
            ) VALUES (?, ?, ?, ?, ?, ?)
          `
        ).run(goal.id, goal.targetId, goal.kind, goal.intent, goal.priority, goal.createdAt);
      }

      for (const plan of seed.cognitiveEpisode.plans) {
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
      }

      for (const decision of seed.cognitiveEpisode.decisions) {
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

        decision.blockedBy.forEach((blocker, index) => {
          db.prepare(
            `
              INSERT INTO cognitive_decision_blockers (decision_id, blocker, position)
              VALUES (?, ?, ?)
            `
          ).run(decision.id, blocker, index);
        });
      }

      for (const outcome of seed.cognitiveEpisode.outcomes) {
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
      }
    }
  });

  transaction();
}

export function bootstrapStorage() {
  return ensureDbInitialized(seedDatabase);
}
