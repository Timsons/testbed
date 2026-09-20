import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SeverityBadge from '../components/SeverityBadge.jsx';
import BugFormModal from '../components/BugFormModal.jsx';
import { createBug, listBugs } from '../api/bugs.js';

const STATUSES = ['open', 'in-progress', 'resolved', 'closed', 'reopened'];
const SEVERITIES = ['critical', 'major', 'minor', 'trivial'];

function formatDate(iso) {
  return new Date(iso).toLocaleString();
}

function BugsPage() {
  const [bugs, setBugs] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('updated_at');
  const [sortDir, setSortDir] = useState('desc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    listBugs({ status: statusFilter, severity: severityFilter, search, sortBy, sortDir })
      .then(setBugs)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [statusFilter, severityFilter, search, sortBy, sortDir]);

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  function toggleSort(field) {
    if (sortBy === field) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  }

  function sortIndicator(field) {
    if (sortBy !== field) return '';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  }

  function ariaSortValue(field) {
    if (sortBy !== field) return 'none';
    return sortDir === 'asc' ? 'ascending' : 'descending';
  }

  function handleSortKeyDown(event, field) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleSort(field);
    }
  }

  async function handleCreate(payload) {
    await createBug(payload);
    setShowForm(false);
    load();
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Bugs</h1>
        <button onClick={() => setShowForm(true)}>+ New Bug</button>
      </div>

      <div className="toolbar">
        <input
          placeholder="Search by title or description..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="">All statuses</option>
          {STATUSES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by severity"
          value={severityFilter}
          onChange={(event) => setSeverityFilter(event.target.value)}
        >
          <option value="">All severities</option>
          {SEVERITIES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <table className="test-cases-table">
        <thead>
          <tr>
            <th>Title</th>
            <th
              className="sortable"
              tabIndex={0}
              role="button"
              aria-sort={ariaSortValue('severity')}
              onClick={() => toggleSort('severity')}
              onKeyDown={(event) => handleSortKeyDown(event, 'severity')}
            >
              Severity{sortIndicator('severity')}
            </th>
            <th>Status</th>
            <th
              className="sortable"
              tabIndex={0}
              role="button"
              aria-sort={ariaSortValue('updated_at')}
              onClick={() => toggleSort('updated_at')}
              onKeyDown={(event) => handleSortKeyDown(event, 'updated_at')}
            >
              Updated{sortIndicator('updated_at')}
            </th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={4}>Loading...</td>
            </tr>
          ) : bugs.length === 0 ? (
            <tr>
              <td colSpan={4}>No bugs found.</td>
            </tr>
          ) : (
            bugs.map((bug) => (
              <tr key={bug.id}>
                <td>
                  <Link to={`/bugs/${bug.id}`}>{bug.title}</Link>
                </td>
                <td>
                  <SeverityBadge severity={bug.severity} />
                </td>
                <td>{bug.status}</td>
                <td>{formatDate(bug.updated_at)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {showForm && <BugFormModal onClose={() => setShowForm(false)} onSubmit={handleCreate} />}
    </div>
  );
}

export default BugsPage;
