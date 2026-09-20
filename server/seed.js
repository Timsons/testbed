import db from './db.js';

const SEED_CASES = [
  {
    title: 'Login with valid credentials',
    preconditions: 'A registered user account exists with a known email and password. The user is logged out.',
    steps: ['Go to the login page.', 'Enter the registered email and correct password.', 'Click "Log in."'],
    expected_result: 'The user is redirected to their dashboard and their name appears in the top navigation.',
    severity: 'major',
    status: 'passed',
  },
  {
    title: 'Login with incorrect password',
    preconditions: 'A registered user account exists. The user is logged out.',
    steps: ['Go to the login page.', 'Enter the registered email and an incorrect password.', 'Click "Log in."'],
    expected_result: 'An "invalid email or password" error is shown and the user stays on the login page.',
    severity: 'major',
    status: 'ready',
  },
  {
    title: 'Password reset email delivery',
    preconditions: 'A registered user account exists with a verified email address.',
    steps: [
      'Go to the login page.',
      'Click "Forgot password."',
      'Enter the registered email.',
      'Click "Send reset link."',
    ],
    expected_result: 'A password reset email arrives within 2 minutes containing a valid, single-use reset link.',
    severity: 'critical',
    status: 'failed',
  },
  {
    title: 'Session persists after browser refresh',
    preconditions: 'The user is logged in.',
    steps: ['Refresh the browser page.'],
    expected_result: 'The user remains logged in and lands on the same page.',
    severity: 'minor',
    status: 'draft',
  },
  {
    title: 'Logout link label spelling',
    preconditions: 'The user is logged in.',
    steps: ['Open the account menu in the top navigation.'],
    expected_result: 'The menu item reads "Log out" (not "Logout" or "Sign out").',
    severity: 'trivial',
    status: 'skipped',
  },
];

export function seedIfEmpty() {
  const { count } = db.prepare('SELECT COUNT(*) as count FROM test_cases').get();
  if (count > 0) return;

  const insert = db.prepare(`
    INSERT INTO test_cases (title, preconditions, steps, expected_result, severity, status, created_at, updated_at)
    VALUES (@title, @preconditions, @steps, @expected_result, @severity, @status, @created_at, @updated_at)
  `);

  const insertAll = db.transaction((cases) => {
    for (const testCase of cases) {
      const now = new Date().toISOString();
      insert.run({
        ...testCase,
        steps: JSON.stringify(testCase.steps),
        created_at: now,
        updated_at: now,
      });
    }
  });

  insertAll(SEED_CASES);
}

const SEED_SUITES = [
  {
    name: 'Login Core Flows',
    feature: 'login',
    status: 'ready',
    caseTitles: [
      'Login with valid credentials',
      'Login with incorrect password',
      'Session persists after browser refresh',
    ],
  },
  {
    name: 'Account Recovery',
    feature: 'password-reset',
    status: 'in-progress',
    caseTitles: [
      'Password reset email delivery',
      'Login with valid credentials',
      'Logout link label spelling',
    ],
  },
];

export function seedSuitesIfEmpty() {
  const { count } = db.prepare('SELECT COUNT(*) as count FROM suites').get();
  if (count > 0) return;

  const insertSuite = db.prepare(`
    INSERT INTO suites (name, feature, status, created_at, updated_at)
    VALUES (@name, @feature, @status, @created_at, @updated_at)
  `);
  const findCaseId = db.prepare('SELECT id FROM test_cases WHERE title = ?');
  const insertLink = db.prepare(
    'INSERT INTO suite_test_cases (suite_id, test_case_id, sort_order) VALUES (?, ?, ?)'
  );

  const insertAll = db.transaction((suites) => {
    for (const suite of suites) {
      const now = new Date().toISOString();
      const result = insertSuite.run({
        name: suite.name,
        feature: suite.feature,
        status: suite.status,
        created_at: now,
        updated_at: now,
      });
      const suiteId = result.lastInsertRowid;

      suite.caseTitles.forEach((title, index) => {
        const testCase = findCaseId.get(title);
        if (testCase) {
          insertLink.run(suiteId, testCase.id, index);
        }
      });
    }
  });

  insertAll(SEED_SUITES);
}

function hoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

const SEED_BUGS = [
  {
    title: 'Login page shows a 500 error on iOS Safari',
    description: 'Submitting the login form on iOS Safari returns a server error instead of logging the user in.',
    severity: 'critical',
    steps_to_reproduce: [
      'Open the login page on an iPhone in Safari.',
      'Enter a valid email and password.',
      'Tap "Log in."',
    ],
    expected: 'The user is logged in and redirected to their dashboard.',
    actual: 'The page shows a generic "500 Internal Server Error" and the user stays logged out.',
    environment: 'iOS Safari',
    createdHoursAgo: 72,
    activity: [
      { hoursAgo: 70, action: 'comment', message: 'Reproduced on iOS 17.4 Safari. Investigating.' },
      { hoursAgo: 68, action: 'status_change', from: 'open', to: 'in-progress', message: null },
      {
        hoursAgo: 24,
        action: 'comment',
        message: 'Root cause: a missing null check in the auth redirect handler on Safari\'s stricter cookie handling.',
      },
      { hoursAgo: 20, action: 'status_change', from: 'in-progress', to: 'resolved', message: 'Fix deployed; null check added.' },
    ],
    finalStatus: 'resolved',
  },
  {
    title: 'Suite reorder occasionally reverts on a slow connection',
    description: 'Dragging a test case to a new position in a suite sometimes snaps back to its old position.',
    severity: 'major',
    steps_to_reproduce: [
      'Throttle the network to "Slow 3G" in devtools.',
      'Open a suite with at least 3 cases at /test-suites/:id.',
      'Drag the first case to the last position.',
      'Immediately drag another case before the first drag finishes saving.',
    ],
    expected: 'Both reorders apply in the order they were dropped.',
    actual: 'The second drop sometimes reverts to the order from before the first drag.',
    environment: 'Web Chrome',
    createdHoursAgo: 30,
    activity: [
      { hoursAgo: 28, action: 'status_change', from: 'open', to: 'in-progress', message: null },
      { hoursAgo: 10, action: 'comment', message: "Can't reproduce reliably yet — needs aggressive throttling plus rapid back-to-back drags." },
    ],
    finalStatus: 'in-progress',
  },
  {
    title: 'Severity badge text is hard to read in the trivial color',
    description: 'The gray background used for the "trivial" severity badge has low contrast with its label text.',
    severity: 'trivial',
    steps_to_reproduce: [
      'Go to /test-cases.',
      'Find a row with severity "trivial".',
      'Look at the badge text.',
    ],
    expected: 'The badge text is easily readable against its background.',
    actual: 'The gray-on-gray badge text is noticeably lower contrast than the other three severity colors.',
    environment: 'Web Chrome',
    createdHoursAgo: 3,
    activity: [],
    finalStatus: 'open',
  },
];

export function seedBugsIfEmpty() {
  const { count } = db.prepare('SELECT COUNT(*) as count FROM bugs').get();
  if (count > 0) return;

  const insertBug = db.prepare(`
    INSERT INTO bugs (title, description, severity, status, steps_to_reproduce, expected, actual, environment, created_at, updated_at)
    VALUES (@title, @description, @severity, @status, @steps_to_reproduce, @expected, @actual, @environment, @created_at, @updated_at)
  `);
  const insertActivity = db.prepare(`
    INSERT INTO bug_activity (bug_id, action, old_value, new_value, message, timestamp)
    VALUES (@bug_id, @action, @old_value, @new_value, @message, @timestamp)
  `);

  const insertAll = db.transaction((bugs) => {
    for (const bug of bugs) {
      const createdAt = hoursAgo(bug.createdHoursAgo);
      const updatedAt = bug.activity.length
        ? hoursAgo(bug.activity[bug.activity.length - 1].hoursAgo)
        : createdAt;

      const result = insertBug.run({
        title: bug.title,
        description: bug.description,
        severity: bug.severity,
        status: 'open',
        steps_to_reproduce: JSON.stringify(bug.steps_to_reproduce),
        expected: bug.expected,
        actual: bug.actual,
        environment: bug.environment,
        created_at: createdAt,
        updated_at: updatedAt,
      });
      const bugId = result.lastInsertRowid;

      for (const entry of bug.activity) {
        insertActivity.run({
          bug_id: bugId,
          action: entry.action,
          old_value: entry.action === 'status_change' ? entry.from : null,
          new_value: entry.action === 'status_change' ? entry.to : null,
          message: entry.message,
          timestamp: hoursAgo(entry.hoursAgo),
        });
      }

      if (bug.finalStatus !== 'open') {
        db.prepare('UPDATE bugs SET status = ? WHERE id = ?').run(bug.finalStatus, bugId);
      }
    }
  });

  insertAll(SEED_BUGS);
}

export function seedRunsIfEmpty() {
  const { count } = db.prepare('SELECT COUNT(*) as count FROM test_runs_v2').get();
  if (count > 0) return;

  const suite = db.prepare("SELECT id FROM suites WHERE name = 'Login Core Flows'").get();
  if (!suite) return;

  const cases = db
    .prepare('SELECT test_case_id FROM suite_test_cases WHERE suite_id = ? ORDER BY sort_order ASC')
    .all(suite.id);
  if (cases.length === 0) return;

  const findCaseTitle = db.prepare('SELECT title FROM test_cases WHERE id = ?');

  // Seed results by title so this stays correct regardless of the suite's exact case order.
  const RESULTS_BY_TITLE = {
    'Login with valid credentials': { result: 'passed', duration_ms: 1200, notes: null },
    'Login with incorrect password': {
      result: 'failed',
      duration_ms: 3400,
      notes: 'The error message shown was generic ("Something went wrong") instead of "invalid email or password."',
    },
    'Session persists after browser refresh': { result: 'skipped', duration_ms: null, notes: 'Blocked: staging environment was down.' },
  };

  const startTime = hoursAgo(5);
  const endTime = hoursAgo(4);

  const insertRun = db.prepare(`
    INSERT INTO test_runs_v2 (suite_id, status, pass_count, fail_count, skip_count, start_time, end_time, created_by)
    VALUES (?, 'completed', 1, 1, 1, ?, ?, NULL)
  `);
  const insertResult = db.prepare(`
    INSERT INTO test_run_results (run_id, test_case_id, result, duration_ms, notes, failed_at, alert_sent_at)
    VALUES (?, ?, ?, ?, ?, ?, NULL)
  `);

  const insertAll = db.transaction(() => {
    const result = insertRun.run(suite.id, startTime, endTime);
    const runId = result.lastInsertRowid;

    for (const c of cases) {
      const title = findCaseTitle.get(c.test_case_id)?.title;
      const seedResult = RESULTS_BY_TITLE[title];
      if (!seedResult) continue;

      insertResult.run(
        runId,
        c.test_case_id,
        seedResult.result,
        seedResult.duration_ms,
        seedResult.notes,
        seedResult.result === 'failed' ? endTime : null
      );
    }
  });

  insertAll();
}

export function seedReportsIfEmpty() {
  const { count } = db.prepare('SELECT COUNT(*) as count FROM reports').get();
  if (count > 0) return;

  const run = db
    .prepare(
      `SELECT r.*, s.name AS suite_name FROM test_runs_v2 r LEFT JOIN suites s ON s.id = r.suite_id
       ORDER BY r.start_time ASC LIMIT 1`
    )
    .get();
  if (!run) return;

  const results = db
    .prepare(
      `SELECT r.test_case_id, tc.title AS test_case_title, tc.severity AS test_case_severity,
              r.result, r.duration_ms, r.notes
       FROM test_run_results r
       LEFT JOIN test_cases tc ON tc.id = r.test_case_id
       WHERE r.run_id = ?
       ORDER BY r.id ASC`
    )
    .all(run.id);

  const passedCount = results.filter((r) => r.result === 'passed').length;
  const failedCount = results.filter((r) => r.result === 'failed').length;
  const skippedCount = results.filter((r) => r.result === 'skipped').length;

  db.prepare(
    `INSERT INTO reports (run_id, suite_name, run_date, total_count, passed_count, failed_count, skipped_count, results, generated_at)
     VALUES (@run_id, @suite_name, @run_date, @total_count, @passed_count, @failed_count, @skipped_count, @results, @generated_at)`
  ).run({
    run_id: run.id,
    suite_name: run.suite_name || `Suite #${run.suite_id}`,
    run_date: run.start_time,
    total_count: results.length,
    passed_count: passedCount,
    failed_count: failedCount,
    skipped_count: skippedCount,
    results: JSON.stringify(results),
    generated_at: hoursAgo(3),
  });
}
