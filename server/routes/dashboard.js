import express from 'express';
import db from '../db.js';

const router = express.Router();

function getTotalTestCases() {
  return db.prepare('SELECT COUNT(*) AS count FROM test_cases').get().count;
}

// Pass rate = passed / (passed + failed) across all recorded results,
// excluding skipped and not-yet-run cases. Null if nothing has been
// executed yet, rather than a misleading 0%.
function getPassRate() {
  const rows = db
    .prepare(
      `SELECT result, COUNT(*) AS count FROM test_run_results
       WHERE result IS NOT NULL GROUP BY result`
    )
    .all();

  const counts = { passed: 0, failed: 0, skipped: 0 };
  for (const row of rows) counts[row.result] = row.count;

  const denominator = counts.passed + counts.failed;
  if (denominator === 0) return null;
  return Math.round((counts.passed / denominator) * 1000) / 10;
}

// "Open" = anything not resolved or closed (open, in-progress, reopened).
function getOpenBugsCount() {
  return db
    .prepare("SELECT COUNT(*) AS count FROM bugs WHERE status NOT IN ('resolved', 'closed')")
    .get().count;
}

// Average wall-clock duration of completed runs, in seconds. Null if no
// run has completed yet.
function getAverageRunDurationSeconds() {
  const rows = db
    .prepare(
      `SELECT start_time, end_time FROM test_runs_v2
       WHERE status = 'completed' AND end_time IS NOT NULL`
    )
    .all();

  if (rows.length === 0) return null;

  const totalSeconds = rows.reduce((sum, row) => {
    return sum + (new Date(row.end_time).getTime() - new Date(row.start_time).getTime()) / 1000;
  }, 0);

  return Math.round(totalSeconds / rows.length);
}

function getRecentRuns() {
  return db
    .prepare(
      `SELECT r.id, r.suite_id, s.name AS suite_name, r.status,
              r.pass_count, r.fail_count, r.skip_count, r.start_time, r.end_time
       FROM test_runs_v2 r
       LEFT JOIN suites s ON s.id = r.suite_id
       ORDER BY r.start_time DESC
       LIMIT 10`
    )
    .all();
}

function summarizeActivity(entry) {
  if (entry.action === 'status_change') {
    return `bug #${entry.bug_id} marked ${entry.new_value}`;
  }
  return `bug #${entry.bug_id} commented`;
}

function getRecentActivity() {
  const rows = db
    .prepare('SELECT * FROM bug_activity ORDER BY timestamp DESC LIMIT 10')
    .all();

  return rows.map((entry) => ({
    id: entry.id,
    bug_id: entry.bug_id,
    action: entry.action,
    summary: summarizeActivity(entry),
    timestamp: entry.timestamp,
  }));
}

function handleGetDashboardMetrics(req, res) {
  res.json({
    success: true,
    data: {
      metrics: {
        total_test_cases: getTotalTestCases(),
        pass_rate: getPassRate(),
        open_bugs: getOpenBugsCount(),
        avg_run_duration_seconds: getAverageRunDurationSeconds(),
      },
      recent_runs: getRecentRuns(),
      recent_activity: getRecentActivity(),
    },
    error: null,
  });
}

router.get('/metrics', handleGetDashboardMetrics);

export default router;
