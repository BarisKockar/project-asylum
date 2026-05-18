CREATE TABLE IF NOT EXISTS cognitive_observations (
  id TEXT PRIMARY KEY,
  target_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  source TEXT NOT NULL,
  summary TEXT NOT NULL,
  confidence TEXT NOT NULL,
  observed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cognitive_observation_evidence (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  observation_id TEXT NOT NULL,
  evidence TEXT NOT NULL,
  position INTEGER NOT NULL,
  FOREIGN KEY (observation_id) REFERENCES cognitive_observations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cognitive_beliefs (
  id TEXT PRIMARY KEY,
  target_id TEXT NOT NULL,
  statement TEXT NOT NULL,
  confidence REAL NOT NULL,
  status TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cognitive_belief_observations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  belief_id TEXT NOT NULL,
  observation_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  FOREIGN KEY (belief_id) REFERENCES cognitive_beliefs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cognitive_hypotheses (
  id TEXT PRIMARY KEY,
  target_id TEXT NOT NULL,
  title TEXT NOT NULL,
  explanation TEXT NOT NULL,
  risk_score REAL NOT NULL,
  uncertainty_score REAL NOT NULL,
  status TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cognitive_hypothesis_beliefs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hypothesis_id TEXT NOT NULL,
  belief_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  FOREIGN KEY (hypothesis_id) REFERENCES cognitive_hypotheses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cognitive_goals (
  id TEXT PRIMARY KEY,
  target_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  intent TEXT NOT NULL,
  priority INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cognitive_plans (
  id TEXT PRIMARY KEY,
  target_id TEXT NOT NULL,
  goal_id TEXT NOT NULL,
  rationale TEXT NOT NULL,
  blast_radius TEXT NOT NULL,
  confidence REAL NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (goal_id) REFERENCES cognitive_goals(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cognitive_plan_hypotheses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id TEXT NOT NULL,
  hypothesis_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  FOREIGN KEY (plan_id) REFERENCES cognitive_plans(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cognitive_plan_steps (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  title TEXT NOT NULL,
  action_type TEXT NOT NULL,
  requires_approval INTEGER NOT NULL,
  rollback_hint TEXT,
  position INTEGER NOT NULL,
  FOREIGN KEY (plan_id) REFERENCES cognitive_plans(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cognitive_decisions (
  id TEXT PRIMARY KEY,
  target_id TEXT NOT NULL,
  selected_plan_id TEXT,
  status TEXT NOT NULL,
  justification TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (selected_plan_id) REFERENCES cognitive_plans(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS cognitive_decision_blockers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  decision_id TEXT NOT NULL,
  blocker TEXT NOT NULL,
  position INTEGER NOT NULL,
  FOREIGN KEY (decision_id) REFERENCES cognitive_decisions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cognitive_outcomes (
  id TEXT PRIMARY KEY,
  target_id TEXT NOT NULL,
  plan_id TEXT,
  status TEXT NOT NULL,
  expected_result TEXT NOT NULL,
  actual_result TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  FOREIGN KEY (plan_id) REFERENCES cognitive_plans(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS cognitive_outcome_lessons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  outcome_id TEXT NOT NULL,
  lesson TEXT NOT NULL,
  position INTEGER NOT NULL,
  FOREIGN KEY (outcome_id) REFERENCES cognitive_outcomes(id) ON DELETE CASCADE
);
