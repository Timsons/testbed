import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import SeverityBadge from '../components/SeverityBadge.jsx';
import { getReport, getReportExportUrl, getReportPrintUrl } from '../api/reports.js';

function formatDate(iso) {
  return iso ? new Date(iso).toLocaleString() : '—';
}

function ReportDetailPage() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getReport(id)
      .then(setReport)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="page">Loading...</div>;

  if (error && !report) {
    return (
      <div className="page">
        <p className="form-error" role="alert">
          Could not load report: {error}
        </p>
        <p>
          <Link to="/reports">&larr; Back to Reports</Link>
        </p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="page">
        <p>Report not found.</p>
        <p>
          <Link to="/reports">&larr; Back to Reports</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="page report-detail">
      <p className="no-print">
        <Link to="/reports">&larr; Back to Reports</Link>
      </p>

      <div className="page-header">
        <h1>{report.suite_name}</h1>
        <div className="no-print report-actions">
          <a className="button-link" href={getReportExportUrl(report.id)} download>
            Download HTML
          </a>
          <button onClick={() => window.open(getReportPrintUrl(report.id), '_blank', 'noopener')}>
            Print / Save as PDF
          </button>
        </div>
      </div>

      <p className="suite-meta">
        Run date: {formatDate(report.run_date)} &middot; Generated: {formatDate(report.generated_at)}
      </p>

      <div className="metric-cards">
        <div className="metric-card">
          <div className="metric-value">{report.total_count}</div>
          <div className="metric-label">Total</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{report.passed_count}</div>
          <div className="metric-label">Passed</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{report.failed_count}</div>
          <div className="metric-label">Failed</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{report.skipped_count}</div>
          <div className="metric-label">Skipped</div>
        </div>
      </div>

      <table className="test-cases-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Severity</th>
            <th>Result</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {report.results.length === 0 ? (
            <tr>
              <td colSpan={4}>No test case results recorded.</td>
            </tr>
          ) : (
            report.results.map((item) => (
              <tr key={item.test_case_id}>
                <td>{item.test_case_title || `Test case #${item.test_case_id}`}</td>
                <td>
                  <SeverityBadge severity={item.test_case_severity} />
                </td>
                <td>{item.result || 'not run'}</td>
                <td>{item.notes || '—'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default ReportDetailPage;
