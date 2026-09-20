import { useState } from 'react';

const SEVERITIES = ['critical', 'major', 'minor', 'trivial'];
const STATUSES = ['draft', 'ready', 'passed', 'failed', 'skipped'];

function stepsToText(steps) {
  return (steps || []).join('\n');
}

function textToSteps(text) {
  return text
    .split('\n')
    .map((step) => step.trim())
    .filter(Boolean);
}

function TestCaseFormModal({ initial, onClose, onSubmit }) {
  const isEdit = Boolean(initial);
  const [title, setTitle] = useState(initial?.title || '');
  const [preconditions, setPreconditions] = useState(initial?.preconditions || '');
  const [stepsText, setStepsText] = useState(stepsToText(initial?.steps));
  const [expectedResult, setExpectedResult] = useState(initial?.expected_result || '');
  const [severity, setSeverity] = useState(initial?.severity || 'major');
  const [status, setStatus] = useState(initial?.status || 'draft');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const steps = textToSteps(stepsText);

    if (!title.trim() || steps.length === 0 || !expectedResult.trim() || !severity) {
      setError('Title, steps, expected result, and severity are all required.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        title: title.trim(),
        preconditions: preconditions.trim(),
        steps,
        expected_result: expectedResult.trim(),
        severity,
        status,
      });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <h2>{isEdit ? 'Edit Test Case' : 'New Test Case'}</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Title
            <input value={title} onChange={(event) => setTitle(event.target.value)} required />
          </label>

          <label>
            Preconditions (optional)
            <textarea
              value={preconditions}
              onChange={(event) => setPreconditions(event.target.value)}
              rows={2}
              placeholder="None"
            />
          </label>

          <label>
            Steps (one per line)
            <textarea
              value={stepsText}
              onChange={(event) => setStepsText(event.target.value)}
              rows={4}
              required
            />
          </label>

          <label>
            Expected Result
            <textarea
              value={expectedResult}
              onChange={(event) => setExpectedResult(event.target.value)}
              rows={2}
              required
            />
          </label>

          <label>
            Severity
            <select value={severity} onChange={(event) => setSeverity(event.target.value)} required>
              {SEVERITIES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label>
            Status
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              {STATUSES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          {error && <p className="form-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TestCaseFormModal;
