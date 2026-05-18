CREATE TABLE IF NOT EXISTS cognitive_memory_summaries (
  target_id TEXT PRIMARY KEY,
  total_outcomes INTEGER NOT NULL,
  partial_outcomes INTEGER NOT NULL,
  failed_outcomes INTEGER NOT NULL,
  last_outcome_status TEXT,
  effect TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
