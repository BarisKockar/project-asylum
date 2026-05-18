CREATE TABLE IF NOT EXISTS cognitive_critiques (
  id TEXT PRIMARY KEY,
  target_id TEXT NOT NULL,
  plan_id TEXT,
  verdict TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (plan_id) REFERENCES cognitive_plans(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS cognitive_critique_reasons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  critique_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  position INTEGER NOT NULL,
  FOREIGN KEY (critique_id) REFERENCES cognitive_critiques(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cognitive_critique_risk_flags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  critique_id TEXT NOT NULL,
  risk_flag TEXT NOT NULL,
  position INTEGER NOT NULL,
  FOREIGN KEY (critique_id) REFERENCES cognitive_critiques(id) ON DELETE CASCADE
);
