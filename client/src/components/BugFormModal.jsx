import { useEffect, useRef, useState } from 'react';
import { useSettings } from '../context/SettingsContext.jsx';

const SEVERITIES = ['critical', 'major', 'minor', 'trivial'];
const ENVIRONMENTS = ['Web Chrome', 'Android Chrome', 'iOS Chrome', 'iOS Safari'];

function textToSteps(text) {
  return text
    .split('\n')
    .map((step) => step.trim())
    .filter(Boolean);
}

function BugFormModal({ onClose, onSubmit }) {
  const { settings } = useSettings();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState(settings?.default_severity_for_new_bugs || 'major');
  const [stepsText, setStepsText] = useState('');
  const [expected, setExpected] = useState('');
  const [actual, setActual] = useState('');
  const [environment, setEnvironment] = useState(ENVIRONMENTS[0]);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const modalRef = useRef(null);
  const titleFieldRef = useRef(null);

  useEffect(() => {
    titleFieldRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !modalRef.current) return;

      const focusable = Array.from(
        modalRef.current.querySelectorAll('input, select, textarea, button')
      ).filter((el) => !el.disabled);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  async function handleSubmit(event) {
    event.preventDefault();
    const steps = textToSteps(stepsText);

    if (!title.trim() || !expected.trim() || !actual.trim() || steps.length === 0) {
      setError('Title, steps to reproduce, expected, and actual are all required.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        severity,
        steps_to_reproduce: steps,
        expected: expected.trim(),
        actual: actual.trim(),
        environment,
      });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bug-modal-title"
        ref={modalRef}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="bug-modal-title">New Bug</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Title
            <input
              ref={titleFieldRef}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </label>

          <label>
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
            />
          </label>

          <label>
            Steps to Reproduce (one per line)
            <textarea
              value={stepsText}
              onChange={(event) => setStepsText(event.target.value)}
              rows={4}
              required
            />
          </label>

          <label>
            Expected
            <textarea value={expected} onChange={(event) => setExpected(event.target.value)} rows={2} required />
          </label>

          <label>
            Actual
            <textarea value={actual} onChange={(event) => setActual(event.target.value)} rows={2} required />
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
            Environment
            <select value={environment} onChange={(event) => setEnvironment(event.target.value)} required>
              {ENVIRONMENTS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

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

export default BugFormModal;
