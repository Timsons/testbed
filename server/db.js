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

export default db;
