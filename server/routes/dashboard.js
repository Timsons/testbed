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

const TEST_CASE_STATUSES = ['draft', 'ready', 'passed', 'failed', 'skipped'];
const BUG_WEEKS = 8;
const PASS_RATE_RUN_LIMIT = 10;

// Pass rate per run, oldest to newest, over the last PASS_RATE_RUN_LIMIT runs.
// Null pass_rate means nothing was recorded yet for that run (no passed/failed
// results), rather than a misleading 0%.
function getPassRateTrend() {
  const runs = db
    .prepare(
      `SELECT r.id, r.start_time,
              SUM(CASE WHEN rr.result = 'passed' THEN 1 ELSE 0 END) AS passed,
              SUM(CASE WHEN rr.result = 'failed' THEN 1 ELSE 0 END) AS failed
       FROM test_runs_v2 r
       LEFT JOIN test_run_results rr ON rr.run_id = r.id
       GROUP BY r.id
       ORDER BY r.start_time DESC
       LIMIT ?`
    )
    .all(PASS_RATE_RUN_LIMIT);

  return runs.reverse().map((run) => {
    const denominator = run.passed + run.failed;
    return {
      run_id: run.id,
      date: run.start_time,
      pass_rate: denominator > 0 ? Math.round((run.passed / denominator) * 1000) / 10 : null,
    };
  });
}

// Monday-based week start (UTC day granularity).
function startOfWeek(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

// Bugs opened (created) vs closed (a status_change into resolved/closed) per
// week, for the last BUG_WEEKS weeks including the current one.
function getBugsWeeklyTrend() {
  const currentWeekStart = startOfWeek(new Date());

  const buckets = [];
  for (let i = BUG_WEEKS - 1; i >= 0; i--) {
    const start = new Date(currentWeekStart);
    start.setUTCDate(start.getUTCDate() - i * 7);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 7);
    buckets.push({ week_start: start.toISOString(), start, end, opened: 0, closed: 0 });
  }

  function bucketFor(timestamp) {
    const t = new Date(timestamp);
    return buckets.find((b) => t >= b.start && t < b.end);
  }

  const openedRows = db.prepare('SELECT created_at FROM bugs').all();
  for (const row of openedRows) {
    const bucket = bucketFor(row.created_at);
    if (bucket) bucket.opened += 1;
  }

  const closedRows = db
    .prepare(
      `SELECT timestamp FROM bug_activity
       WHERE action = 'status_change' AND new_value IN ('resolved', 'closed')`
    )
    .all();
  for (const row of closedRows) {
    const bucket = bucketFor(row.timestamp);
    if (bucket) bucket.closed += 1;
  }

  return buckets.map((b) => ({ week_start: b.week_start, opened: b.opened, closed: b.closed }));
}

function getTestCaseStatusBreakdown() {
  const rows = db.prepare('SELECT status, COUNT(*) AS count FROM test_cases GROUP BY status').all();
  const counts = Object.fromEntries(TEST_CASE_STATUSES.map((status) => [status, 0]));
  for (const row of rows) counts[row.status] = row.count;
  return TEST_CASE_STATUSES.map((status) => ({ status, count: counts[status] }));
}

function handleGetDashboardTrends(req, res) {
  res.json({
    success: true,
    data: {
      pass_rate_trend: getPassRateTrend(),
      bugs_weekly: getBugsWeeklyTrend(),
      status_breakdown: getTestCaseStatusBreakdown(),
    },
    error: null,
  });
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
router.get('/trends', handleGetDashboardTrends);

export default router;
