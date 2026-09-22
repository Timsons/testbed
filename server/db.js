import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, 'data.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS test_cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    preconditions TEXT NOT NULL DEFAULT '',
    steps TEXT NOT NULL,
    expected_result TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('critical', 'major', 'minor', 'trivial')),
    status TEXT NOT NULL CHECK (status IN ('draft', 'ready', 'passed', 'failed', 'skipped')) DEFAULT 'draft',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS suites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    feature TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('draft', 'ready', 'in-progress', 'passed', 'failed')) DEFAULT 'draft',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS suite_test_cases (
    suite_id INTEGER NOT NULL REFERENCES suites(id) ON DELETE CASCADE,
    test_case_id INTEGER NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL,
    PRIMARY KEY (suite_id, test_case_id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS bugs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    severity TEXT NOT NULL CHECK (severity IN ('critical', 'major', 'minor', 'trivial')),
    status TEXT NOT NULL CHECK (status IN ('open', 'in-progress', 'resolved', 'closed', 'reopened')) DEFAULT 'open',
    steps_to_reproduce TEXT NOT NULL,
    expected TEXT NOT NULL,
    actual TEXT NOT NULL,
    environment TEXT NOT NULL CHECK (environment IN ('Web Chrome', 'Android Chrome', 'iOS Chrome', 'iOS Safari')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS bug_activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bug_id INTEGER NOT NULL REFERENCES bugs(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('status_change', 'comment')),
    old_value TEXT,
    new_value TEXT,
    message TEXT,
    timestamp TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS test_runs_v2 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    suite_id INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('in-progress', 'completed')) DEFAULT 'in-progress',
    pass_count INTEGER NOT NULL DEFAULT 0,
    fail_count INTEGER NOT NULL DEFAULT 0,
    skip_count INTEGER NOT NULL DEFAULT 0,
    start_time TEXT NOT NULL,
    end_time TEXT,
    created_by TEXT
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS test_run_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL REFERENCES test_runs_v2(id) ON DELETE CASCADE,
    test_case_id INTEGER NOT NULL,
    result TEXT CHECK (result IS NULL OR result IN ('passed', 'failed', 'skipped')),
    duration_ms INTEGER,
    notes TEXT,
    failed_at TEXT,
    alert_sent_at TEXT
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL REFERENCES test_runs_v2(id) ON DELETE CASCADE,
    suite_name TEXT NOT NULL,
    run_date TEXT NOT NULL,
    total_count INTEGER NOT NULL DEFAULT 0,
    passed_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    skipped_count INTEGER NOT NULL DEFAULT 0,
    results TEXT NOT NULL,
    generated_at TEXT NOT NULL
  )
`);

// Singleton row (id is always 1) — one row per user, and for now there's
// only one user.
db.exec(`
  CREATE TABLE IF NOT EXISTS user_preferences (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    theme TEXT NOT NULL CHECK (theme IN ('light', 'dark', 'system')) DEFAULT 'system',
    default_severity_for_new_bugs TEXT NOT NULL CHECK (default_severity_for_new_bugs IN ('critical', 'major', 'minor', 'trivial')) DEFAULT 'minor',
    default_page_size INTEGER NOT NULL CHECK (default_page_size IN (10, 20, 50, 100)) DEFAULT 20,
    timezone TEXT,
    auto_generate_report_after_run INTEGER NOT NULL CHECK (auto_generate_report_after_run IN (0, 1)) DEFAULT 1,
    updated_at TEXT NOT NULL
  )
`);

export default db;
