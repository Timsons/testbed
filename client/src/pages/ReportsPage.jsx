import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listReports } from '../api/reports.js';

function formatDate(iso) {
  return iso ? new Date(iso).toLocaleString() : '—';
}

function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    listReports()
      .then(setReports)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Reports</h1>
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
            <th>Run Date</th>
            <th>Total</th>
            <th>Passed</th>
            <th>Failed</th>
            <th>Skipped</th>
            <th>Generated</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={7}>Loading...</td>
            </tr>
          ) : reports.length === 0 ? (
            <tr>
              <td colSpan={7}>
                No reports yet. Open a <Link to="/test-runs">test run</Link> and click "Generate Report" to create one.
              </td>
            </tr>
          ) : (
            reports.map((report) => (
              <tr key={report.id}>
                <td>
                  <Link to={`/reports/${report.id}`}>{report.suite_name}</Link>
                </td>
                <td>{formatDate(report.run_date)}</td>
                <td>{report.total_count}</td>
                <td>{report.passed_count}</td>
                <td>{report.failed_count}</td>
                <td>{report.skipped_count}</td>
                <td>{formatDate(report.generated_at)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default ReportsPage;
