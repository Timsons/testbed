import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardMetrics } from '../api/dashboard.js';

const REFRESH_INTERVAL_MS = 30000;

function formatDate(iso) {
  return iso ? new Date(iso).toLocaleString() : '—';
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function isEmptyData(data) {
  return (
    data.metrics.total_test_cases === 0 &&
    data.recent_runs.length === 0 &&
    data.recent_activity.length === 0
  );
}

function MetricCardSkeleton() {
  return <div className="metric-card skeleton" />;
}

function MetricCard({ value, label, emptyText, emptyLink, emptyLinkLabel }) {
  const isEmpty = value === null || value === undefined;
  return (
    <div className="metric-card">
      <div className={isEmpty ? 'metric-value metric-value-empty' : 'metric-value'}>
        {isEmpty ? emptyText : value}
      </div>
      <div className="metric-label">{label}</div>
      {isEmpty && emptyLink && (
        <Link to={emptyLink} className="metric-empty-link">
          {emptyLinkLabel}
        </Link>
      )}
    </div>
  );
}

function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasDataRef = useRef(false);

  const load = useCallback(() => {
    getDashboardMetrics()
      .then((result) => {
        setData(result);
        setError(null);
        hasDataRef.current = true;
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Dashboard</h1>
        </div>
        <div className="metric-cards">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Dashboard</h1>
        </div>
        <p className="form-error" role="alert">
          Could not load dashboard data: {error}
        </p>
        <button onClick={load}>Retry</button>
      </div>
    );
  }

  if (data && isEmptyData(data)) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Dashboard</h1>
        </div>
        <p>Nothing to show yet. Get started with one of these:</p>
        <ul>
          <li>
            <Link to="/test-cases">Create a test case</Link>
          </li>
          <li>
            <Link to="/test-suites">Build a test suite</Link>, then run it to generate pass/fail data
          </li>
          <li>
            <Link to="/bugs">File a bug</Link> to start tracking activity
          </li>
        </ul>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>

      {error && (
        <p className="form-error" role="alert">
          Last refresh failed ({error}) — showing previous data.
        </p>
      )}

      <div className="metric-cards">
        <MetricCard
          value={data.metrics.total_test_cases > 0 ? data.metrics.total_test_cases : null}
          label="Total Test Cases"
          emptyText="No test cases"
          emptyLink="/test-cases"
          emptyLinkLabel="Create one"
        />
        <MetricCard
          value={data.metrics.pass_rate !== null ? `${data.metrics.pass_rate}%` : null}
          label="Pass Rate"
          emptyText="No runs yet"
          emptyLink="/test-suites"
          emptyLinkLabel="Start a run"
        />
        <MetricCard value={data.metrics.open_bugs} label="Open Bugs" />
        <MetricCard
          value={
            data.metrics.avg_run_duration_seconds !== null
              ? formatDuration(data.metrics.avg_run_duration_seconds)
              : null
          }
          label="Avg Run Duration"
          emptyText="No completed runs"
          emptyLink="/test-suites"
          emptyLinkLabel="Start a run"
        />
      </div>

      <h2 className="section-title">Recent Test Runs</h2>
      <table className="test-cases-table">
        <thead>
          <tr>
            <th>Suite</th>
            <th>Passed</th>
            <th>Failed</th>
            <th>Skipped</th>
            <th>When</th>
          </tr>
        </thead>
        <tbody>
          {data.recent_runs.length === 0 ? (
            <tr>
              <td colSpan={5}>
                No test runs yet. Open a <Link to="/test-suites">suite</Link> and click "New Run" to start one.
              </td>
            </tr>
          ) : (
            data.recent_runs.map((run) => (
              <tr key={run.id}>
                <td>
                  <Link to={`/test-runs/${run.id}`}>{run.suite_name || `Suite #${run.suite_id}`}</Link>
                </td>
                <td>{run.pass_count}</td>
                <td>{run.fail_count}</td>
                <td>{run.skip_count}</td>
                <td>{formatDate(run.start_time)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <h2 className="section-title">Recent Activity</h2>
      {data.recent_activity.length === 0 ? (
        <p>
          No activity yet. Status changes and comments on <Link to="/bugs">bugs</Link> will show up here.
        </p>
      ) : (
        <ul className="activity-timeline">
          {data.recent_activity.map((entry) => (
            <li key={entry.id} className="activity-entry">
              <div className="activity-meta">
                <Link to={`/bugs/${entry.bug_id}`}>{entry.summary}</Link>
                <span>{formatDate(entry.timestamp)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default DashboardPage;
