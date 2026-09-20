import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import SeverityBadge from '../components/SeverityBadge.jsx';
import { getRun, updateResult } from '../api/runs.js';
import { createReport } from '../api/reports.js';

function formatDate(iso) {
  return iso ? new Date(iso).toLocaleString() : '—';
}

function RunResultRow({ result, runId, onUpdated }) {
  const [notes, setNotes] = useState(result.notes || '');
  const [submitting, setSubmitting] = useState(null); // null | 'passed' | 'failed' | 'skipped'
  const [error, setError] = useState(null);

  async function handleMark(nextResult) {
    setSubmitting(nextResult);
    setError(null);
    try {
      const updatedRun = await updateResult(runId, result.test_case_id, { result: nextResult, notes });
      onUpdated(updatedRun);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <tr>
      <td>{result.test_case_title || `Test case #${result.test_case_id}`}</td>
      <td>
        <SeverityBadge severity={result.test_case_severity} />
      </td>
      <td>{result.result || 'not run'}</td>
      <td>
        <textarea
          rows={1}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          aria-label={`Notes for ${result.test_case_title}`}
        />
      </td>
      <td className="result-buttons">
        <button disabled={submitting !== null} onClick={() => handleMark('passed')}>
          Pass
        </button>
        <button disabled={submitting !== null} onClick={() => handleMark('failed')}>
          Fail
        </button>
        <button disabled={submitting !== null} onClick={() => handleMark('skipped')}>
          Skip
        </button>
        {result.alert_sent_at && <span className="alert-sent-badge">{'🔔'} Alert sent</span>}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </td>
    </tr>
  );
}

function RunDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [run, setRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getRun(id)
      .then(setRun)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleGenerateReport() {
    setGeneratingReport(true);
    setError(null);
    try {
      const report = await createReport(id);
      navigate(`/reports/${report.id}`);
    } catch (err) {
      setError(err.message);
      setGeneratingReport(false);
    }
  }

  if (loading) return <div className="page">Loading...</div>;
  if (!run) {
    return (
      <div className="page">
        <p>Run not found.</p>
        <p>
          <Link to="/test-runs">&larr; Back to Test Runs</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="page">
      <p>
        <Link to="/test-runs">&larr; Back to Test Runs</Link>
      </p>

      <div className="page-header">
        <h1>
          {run.suite_name || `Suite #${run.suite_id}`} &mdash; Run #{run.id}
        </h1>
        <button onClick={handleGenerateReport} disabled={generatingReport}>
          {generatingReport ? 'Generating...' : 'Generate Report'}
        </button>
      </div>

      <p className="suite-meta">
        Status: <strong>{run.status}</strong> &middot; Passed: <strong>{run.pass_count}</strong> &middot; Failed:{' '}
        <strong>{run.fail_count}</strong> &middot; Skipped: <strong>{run.skip_count}</strong>
      </p>
      <p className="suite-meta">
        Started: {formatDate(run.start_time)} &middot; Ended: {formatDate(run.end_time)}
      </p>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <table className="test-cases-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Severity</th>
            <th>Result</th>
            <th>Notes</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {run.results.map((result) => (
            <RunResultRow key={result.id} result={result} runId={run.id} onUpdated={setRun} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default RunDetailPage;
