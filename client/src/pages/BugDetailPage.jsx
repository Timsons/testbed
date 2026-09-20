import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import SeverityBadge from '../components/SeverityBadge.jsx';
import { addBugComment, changeBugStatus, deleteBug, getBug } from '../api/bugs.js';

function formatDate(iso) {
  return new Date(iso).toLocaleString();
}

function ActivityEntry({ entry }) {
  if (entry.action === 'status_change') {
    return (
      <li className="activity-entry">
        <div className="activity-meta">
          <strong>
            Status changed: {entry.old_value} &rarr; {entry.new_value}
          </strong>
          <span>{formatDate(entry.timestamp)}</span>
        </div>
        {entry.message && <p>{entry.message}</p>}
      </li>
    );
  }

  return (
    <li className="activity-entry">
      <div className="activity-meta">
        <strong>Comment</strong>
        <span>{formatDate(entry.timestamp)}</span>
      </div>
      <p>{entry.message}</p>
    </li>
  );
}

function BugDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bug, setBug] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nextStatus, setNextStatus] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [commentText, setCommentText] = useState('');
  const [submittingStatus, setSubmittingStatus] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getBug(id)
      .then((data) => {
        setBug(data);
        setNextStatus('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  function handleBugGoneOrError(err) {
    if (err.message === 'Bug not found.') {
      navigate('/bugs');
      return;
    }
    setError(err.message);
  }

  async function handleStatusChange(event) {
    event.preventDefault();
    if (!nextStatus) return;
    setSubmittingStatus(true);
    setError(null);
    try {
      const updated = await changeBugStatus(id, nextStatus, statusMessage.trim() || undefined);
      setBug(updated);
      setNextStatus('');
      setStatusMessage('');
    } catch (err) {
      handleBugGoneOrError(err);
    } finally {
      setSubmittingStatus(false);
    }
  }

  async function handleAddComment(event) {
    event.preventDefault();
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    setError(null);
    try {
      const activity = await addBugComment(id, commentText.trim());
      setBug((current) => ({ ...current, activity }));
      setCommentText('');
    } catch (err) {
      handleBugGoneOrError(err);
    } finally {
      setSubmittingComment(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this bug? This cannot be undone.')) return;
    setError(null);
    try {
      await deleteBug(id);
      navigate('/bugs');
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <div className="page">Loading...</div>;
  if (!bug) {
    return (
      <div className="page">
        <p>Bug not found.</p>
        <p>
          <Link to="/bugs">&larr; Back to Bugs</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="page">
      <p>
        <Link to="/bugs">&larr; Back to Bugs</Link>
      </p>

      <div className="page-header">
        <h1>{bug.title}</h1>
        <button onClick={handleDelete}>Delete</button>
      </div>

      <p className="suite-meta">
        <SeverityBadge severity={bug.severity} /> &middot; Status: <strong>{bug.status}</strong> &middot; Environment:{' '}
        <strong>{bug.environment}</strong>
      </p>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <section className="bug-section">
        <h3>Description</h3>
        <p>{bug.description || 'None'}</p>
      </section>

      <section className="bug-section">
        <h3>Steps to Reproduce</h3>
        <ol>
          {bug.steps_to_reproduce.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
      </section>

      <section className="bug-section">
        <h3>Expected</h3>
        <p>{bug.expected}</p>
      </section>

      <section className="bug-section">
        <h3>Actual</h3>
        <p>{bug.actual}</p>
      </section>

      <section className="bug-section">
        <h3>Change Status</h3>
        {bug.allowed_next_statuses.length === 0 ? (
          <p>No further status transitions are allowed from "{bug.status}".</p>
        ) : (
          <form onSubmit={handleStatusChange} className="status-change-form">
            <label htmlFor="next-status-select">New status</label>
            <select
              id="next-status-select"
              value={nextStatus}
              onChange={(event) => setNextStatus(event.target.value)}
            >
              <option value="">Select a status...</option>
              {bug.allowed_next_statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Optional note about this change"
              value={statusMessage}
              onChange={(event) => setStatusMessage(event.target.value)}
              aria-label="Optional note about this status change"
            />
            <button type="submit" disabled={!nextStatus || submittingStatus}>
              {submittingStatus ? 'Updating...' : 'Update Status'}
            </button>
          </form>
        )}
      </section>

      <section className="bug-section">
        <h3>Activity</h3>
        {bug.activity.length === 0 ? (
          <p>No activity yet.</p>
        ) : (
          <ul className="activity-timeline">
            {bug.activity.map((entry) => (
              <ActivityEntry key={entry.id} entry={entry} />
            ))}
          </ul>
        )}

        <form onSubmit={handleAddComment} className="comment-form">
          <label htmlFor="comment-input">Add a comment</label>
          <textarea
            id="comment-input"
            rows={2}
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
          />
          <button type="submit" disabled={!commentText.trim() || submittingComment}>
            {submittingComment ? 'Posting...' : 'Post Comment'}
          </button>
        </form>
      </section>
    </div>
  );
}

export default BugDetailPage;
