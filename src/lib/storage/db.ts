import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DATABASE_DIR = path.join(process.cwd(), "data");
const DATABASE_PATH = path.join(DATABASE_DIR, "project-asylum.db");
const MIGRATIONS_DIR = path.join(process.cwd(), "src", "lib", "storage", "migrations");

let database: Database.Database | null = null;
let initialized = false;

function ensureDirectory() {
  fs.mkdirSync(DATABASE_DIR, { recursive: true });
}

function getMigrationFiles() {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort();
}

function applyMigrations(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const existing = new Set(
    db
      .prepare("SELECT version FROM schema_migrations")
      .all()
      .map((row) => String((row as { version: string }).version))
  );

  for (const file of getMigrationFiles()) {
    if (existing.has(file)) {
      continue;
    }

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    const transaction = db.transaction(() => {
      db.exec(sql);
      db
        .prepare(
          "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)"
        )
        .run(file, new Date().toISOString());
    });

    transaction();
  }
}

export function getDb() {
  if (!database) {
    ensureDirectory();
    database = new Database(DATABASE_PATH);
    database.pragma("journal_mode = WAL");
    database.pragma("foreign_keys = ON");
  }

  return database;
}

export function ensureDbInitialized(onFirstInit?: (db: Database.Database) => void) {
  const db = getDb();
  applyMigrations(db);

  if (!initialized) {
    onFirstInit?.(db);
    initialized = true;
  }

  return db;
}

export function getDatabasePath() {
  return DATABASE_PATH;
}
