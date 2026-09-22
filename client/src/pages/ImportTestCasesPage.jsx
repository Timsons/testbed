import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import SeverityBadge from '../components/SeverityBadge.jsx';
import { commitTestCaseImport, previewTestCaseImport } from '../api/test-cases.js';

const SEVERITIES = ['critical', 'major', 'minor', 'trivial'];

function ImportTestCasesPage() {
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [committing, setCommitting] = useState(false);
  const [commitError, setCommitError] = useState(null);
  const [commitResult, setCommitResult] = useState(null);

  function resetAll() {
    setFileName('');
    setPreview(null);
    setPreviewError(null);
    setCommitResult(null);
    setCommitError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handlePreview(event) {
    event.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setPreviewError('Choose a CSV file first.');
      return;
    }

    setFileName(file.name);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreview(null);
    setCommitResult(null);
    setCommitError(null);
    try {
      const data = await previewTestCaseImport(file);
      setPreview(data);
    } catch (err) {
      setPreviewError(err.message);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleCommit() {
    if (!preview) return;
    const validRows = preview.rows.filter((row) => row.errors.length === 0);
    if (validRows.length === 0) return;

    setCommitting(true);
    setCommitError(null);
    try {
      const result = await commitTestCaseImport(validRows);
      setCommitResult(result);
    } catch (err) {
      setCommitError(err.message);
    } finally {
      setCommitting(false);
    }
  }

  const validCount = preview ? preview.rows.filter((row) => row.errors.length === 0).length : 0;

  return (
    <div className="page">
      <p>
        <Link to="/test-cases">&larr; Back to Test Cases</Link>
      </p>

      <div className="page-header">
        <h1>Import Test Cases from CSV</h1>
      </div>

      <div className="import-help">
        <p>The CSV must include these columns (any order, case-insensitive): <strong>title</strong>, <strong>severity</strong>, <strong>steps</strong>, <strong>expected_result</strong>.</p>
        <p><strong>preconditions</strong> and <strong>status</strong> are optional (default to blank and "draft").</p>
        <p>
          For <strong>steps</strong> with more than one step in a cell, either put each step on its own line
          within a quoted cell, or separate them with <code>|</code>.
        </p>
      </div>

      <form onSubmit={handlePreview} className="import-upload-form">
        <input type="file" accept=".csv,text/csv" ref={fileInputRef} aria-label="CSV file to import" />
        <button type="submit" className="import-primary-button" disabled={previewLoading}>
          {previewLoading ? 'Uploading...' : 'Upload & Preview'}
        </button>
        {preview && (
          <button type="button" onClick={resetAll}>
            Start Over
          </button>
        )}
      </form>

      {previewError && (
        <p className="form-error" role="alert">
          {previewError}
        </p>
      )}

      {preview && (
        <>
          <p className="import-summary">
            <strong>{fileName}</strong> — {preview.total_rows} row{preview.total_rows === 1 ? '' : 's'} found:{' '}
            <strong>{preview.valid_count} valid</strong>, <strong>{preview.invalid_count} invalid</strong>.
          </p>

          {preview.encoding_warning && (
            <p className="form-error" role="alert">
              {preview.encoding_warning}
            </p>
          )}

          <table className="test-cases-table">
            <thead>
              <tr>
                <th>Row</th>
                <th>Title</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Steps</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((row) => (
                <tr key={row.row_number} className={row.errors.length ? 'import-row-invalid' : 'import-row-valid'}>
                  <td>{row.row_number}</td>
                  <td>{row.fields.title || <em>(blank)</em>}</td>
                  <td>
                    {SEVERITIES.includes(row.fields.severity) ? (
                      <SeverityBadge severity={row.fields.severity} />
                    ) : (
                      row.fields.severity || <em>(blank)</em>
                    )}
                  </td>
                  <td>{row.fields.status}</td>
                  <td>{row.fields.steps.length}</td>
                  <td>
                    {row.errors.length === 0 ? (
                      <span className="import-valid-tag">Valid</span>
                    ) : (
                      <ul className="import-error-list">
                        {row.errors.map((message, index) => (
                          <li key={index}>{message}</li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!commitResult && (
            <div className="import-commit-bar">
              <button onClick={handleCommit} disabled={committing || validCount === 0}>
                {committing ? 'Importing...' : `Import ${validCount} Valid Row${validCount === 1 ? '' : 's'}`}
              </button>
              {commitError && (
                <p className="form-error" role="alert">
                  {commitError}
                </p>
              )}
            </div>
          )}

          {commitResult && (
            <p className="import-summary import-summary-done">
              Imported {commitResult.imported_count} test case{commitResult.imported_count === 1 ? '' : 's'}.{' '}
              {commitResult.skipped_count > 0 && `Skipped ${commitResult.skipped_count} invalid row${commitResult.skipped_count === 1 ? '' : 's'} (see above).`}{' '}
              <Link to="/test-cases">View Test Cases &rarr;</Link>
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default ImportTestCasesPage;
