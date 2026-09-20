import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listRuns } from '../api/runs.js';

function formatDate(iso) {
  return iso ? new Date(iso).toLocaleString() : '—';
}

function TestRunsPage() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    listRuns()
      .then(setRuns)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Test Runs</h1>
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <table className="test-cases-table">
        <thead>
          <tr>
            <th>Suite</th>
            <th>Status</th>
            <th>Passed</th>
            <th>Failed</th>
            <th>Skipped</th>
            <th>Started</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6}>Loading...</td>
            </tr>
          ) : runs.length === 0 ? (
            <tr>
              <td colSpan={6}>No test runs yet.</td>
            </tr>
          ) : (
            runs.map((run) => (
              <tr key={run.id}>
                <td>
                  <Link to={`/test-runs/${run.id}`}>{run.suite_name || `Suite #${run.suite_id}`}</Link>
                </td>
                <td>{run.status}</td>
                <td>{run.pass_count}</td>
                <td>{run.fail_count}</td>
                <td>{run.skip_count}</td>
                <td>{formatDate(run.start_time)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default TestRunsPage;
