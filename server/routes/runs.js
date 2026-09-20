import express from 'express';
import db from '../db.js';

const router = express.Router();

const RESULTS = ['passed', 'failed', 'skipped'];
const APP_BASE_URL = 'http://localhost:5173';

function getRunResults(runId) {
  return db
    .prepare(
      `SELECT r.*, tc.title AS test_case_title, tc.severity AS test_case_severity
       FROM test_run_results r
       LEFT JOIN test_cases tc ON tc.id = r.test_case_id
       WHERE r.run_id = ?
       ORDER BY r.id ASC`
    )
    .all(runId);
}

function recalculateRunCounts(runId) {
  const results = db.prepare('SELECT result FROM test_run_results WHERE run_id = ?').all(runId);
  const passCount = results.filter((r) => r.result === 'passed').length;
  const failCount = results.filter((r) => r.result === 'failed').length;
  const skipCount = results.filter((r) => r.result === 'skipped').length;
  const allRecorded = results.every((r) => r.result !== null);

  const run = db.prepare('SELECT * FROM test_runs_v2 WHERE id = ?').get(runId);
  const shouldComplete = allRecorded && results.length > 0;
  const endTime = shouldComplete ? run.end_time || new Date().toISOString() : null;

  db.prepare(
    `UPDATE test_runs_v2
     SET pass_count = ?, fail_count = ?, skip_count = ?, status = ?, end_time = ?
     WHERE id = ?`
  ).run(passCount, failCount, skipCount, shouldComplete ? 'completed' : 'in-progress', endTime, runId);
}

async function sendFailureAlert({ runId, testCaseTitle, notes }) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return false;

  const runLink = `${APP_BASE_URL}/test-runs/${runId}`;
  const content = [
    `🔴 Test failed: "${testCaseTitle || 'Unknown test case'}"`,
    `Notes: ${notes && notes.trim() ? notes.trim() : 'No notes provided.'}`,
    `Run: ${runLink}`,
  ].join('\n');

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    return res.ok;
  } catch (err) {
    console.error('Failed to send Discord alert:', err.message);
    return false;
  }
}

function handleListRuns(req, res) {
  const rows = db
    .prepare(
      `SELECT r.*, s.name AS suite_name
       FROM test_runs_v2 r
       LEFT JOIN suites s ON s.id = r.suite_id
       ORDER BY r.start_time DESC`
    )
    .all();
  res.json({ success: true, data: rows, error: null });
}

function handleGetRun(req, res) {
  const run = db
    .prepare(
      `SELECT r.*, s.name AS suite_name
       FROM test_runs_v2 r
       LEFT JOIN suites s ON s.id = r.suite_id
       WHERE r.id = ?`
    )
    .get(req.params.id);
  if (!run) {
    return res.status(404).json({ success: false, data: null, error: 'Run not found.' });
  }
  res.json({ success: true, data: { ...run, results: getRunResults(run.id) }, error: null });
}

function handleCreateRun(req, res) {
  const suiteId = Number(req.body.suite_id);
  if (!suiteId) {
    return res.status(400).json({ success: false, data: null, error: 'suite_id is required.' });
  }

  const suite = db.prepare('SELECT * FROM suites WHERE id = ?').get(suiteId);
  if (!suite) {
    return res.status(404).json({ success: false, data: null, error: 'Suite not found.' });
  }

  const cases = db
    .prepare(
      `SELECT test_case_id FROM suite_test_cases WHERE suite_id = ? ORDER BY sort_order ASC`
    )
    .all(suiteId);
  if (cases.length === 0) {
    return res.status(400).json({ success: false, data: null, error: 'Cannot start a run for a suite with no test cases.' });
  }

  const now = new Date().toISOString();

  const createRun = db.transaction(() => {
    const result = db
      .prepare(
        `INSERT INTO test_runs_v2 (suite_id, status, pass_count, fail_count, skip_count, start_time, end_time, created_by)
         VALUES (?, 'in-progress', 0, 0, 0, ?, NULL, NULL)`
      )
      .run(suiteId, now);
    const runId = result.lastInsertRowid;

    const insertResult = db.prepare(
      `INSERT INTO test_run_results (run_id, test_case_id, result, duration_ms, notes, failed_at, alert_sent_at)
       VALUES (?, ?, NULL, NULL, NULL, NULL, NULL)`
    );
    for (const c of cases) {
      insertResult.run(runId, c.test_case_id);
    }

    return runId;
  });

  const runId = createRun();
  const run = db
    .prepare(
      `SELECT r.*, s.name AS suite_name FROM test_runs_v2 r LEFT JOIN suites s ON s.id = r.suite_id WHERE r.id = ?`
    )
    .get(runId);

  res.status(201).json({ success: true, data: { ...run, results: getRunResults(runId) }, error: null });
}

async function handleUpdateResult(req, res) {
  const run = db.prepare('SELECT * FROM test_runs_v2 WHERE id = ?').get(req.params.id);
  if (!run) {
    return res.status(404).json({ success: false, data: null, error: 'Run not found.' });
  }

  const testCaseId = Number(req.params.testCaseId);
  const existing = db
    .prepare('SELECT * FROM test_run_results WHERE run_id = ? AND test_case_id = ?')
    .get(run.id, testCaseId);
  if (!existing) {
    return res.status(404).json({ success: false, data: null, error: 'That test case is not part of this run.' });
  }

  const { result, notes, duration_ms } = req.body;
  if (!result || !RESULTS.includes(result)) {
    return res.status(400).json({ success: false, data: null, error: `result must be one of: ${RESULTS.join(', ')}.` });
  }

  const now = new Date().toISOString();
  let alertSentAt = existing.alert_sent_at;

  if (result === 'failed') {
    const testCase = db.prepare('SELECT title FROM test_cases WHERE id = ?').get(testCaseId);
    const sent = await sendFailureAlert({
      runId: run.id,
      testCaseTitle: testCase ? testCase.title : null,
      notes: notes ?? existing.notes,
    });
    if (sent) alertSentAt = now;
  }

  db.prepare(
    `UPDATE test_run_results
     SET result = ?, notes = ?, duration_ms = ?, failed_at = ?, alert_sent_at = ?
     WHERE run_id = ? AND test_case_id = ?`
  ).run(
    result,
    notes !== undefined ? notes : existing.notes,
    duration_ms !== undefined ? duration_ms : existing.duration_ms,
    result === 'failed' ? now : null,
    alertSentAt,
    run.id,
    testCaseId
  );

  recalculateRunCounts(run.id);

  const updatedRun = db
    .prepare(
      `SELECT r.*, s.name AS suite_name FROM test_runs_v2 r LEFT JOIN suites s ON s.id = r.suite_id WHERE r.id = ?`
    )
    .get(run.id);

  res.json({ success: true, data: { ...updatedRun, results: getRunResults(run.id) }, error: null });
}

router.get('/', handleListRuns);
router.get('/:id', handleGetRun);
router.post('/', handleCreateRun);
router.patch('/:id/results/:testCaseId', handleUpdateResult);

export default router;
