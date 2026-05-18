CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS runtime_policy (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  local_only INTEGER NOT NULL,
  external_apis_allowed INTEGER NOT NULL,
  approval_required_for_high_risk INTEGER NOT NULL,
  allowed_execution_targets_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workflow_stages (
  name TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS findings (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  asset TEXT NOT NULL,
  severity TEXT NOT NULL,
  confidence REAL NOT NULL,
  summary TEXT NOT NULL,
  recommended_action TEXT NOT NULL,
  requires_approval INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS finding_evidence (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  finding_id TEXT NOT NULL,
  evidence TEXT NOT NULL,
  position INTEGER NOT NULL,
  FOREIGN KEY (finding_id) REFERENCES findings(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS playbooks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  blast_radius TEXT NOT NULL,
  rollback_ready INTEGER NOT NULL,
  automation_level TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS playbook_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  playbook_id TEXT NOT NULL,
  step TEXT NOT NULL,
  position INTEGER NOT NULL,
  FOREIGN KEY (playbook_id) REFERENCES playbooks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS platform_components (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  responsibility TEXT NOT NULL,
  local_only INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS component_dependencies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  component_id TEXT NOT NULL,
  dependency_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  FOREIGN KEY (component_id) REFERENCES platform_components(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pipeline_runs (
  id TEXT PRIMARY KEY,
  target TEXT NOT NULL,
  status TEXT NOT NULL,
  current_stage TEXT NOT NULL,
  started_at TEXT NOT NULL,
  summary TEXT NOT NULL
);
