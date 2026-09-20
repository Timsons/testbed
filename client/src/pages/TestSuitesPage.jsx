import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SuiteFormModal from '../components/SuiteFormModal.jsx';
import { createSuite, deleteSuite, listSuites, updateSuite } from '../api/suites.js';

const STATUSES = ['draft', 'ready', 'in-progress', 'passed', 'failed'];

function formatDate(iso) {
  return new Date(iso).toLocaleString();
}

function TestSuitesPage() {
  const [suites, setSuites] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalState, setModalState] = useState(null); // null | 'create' | <suite object>
  const [openMenuId, setOpenMenuId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    listSuites({ status: statusFilter })
      .then(setSuites)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(payload) {
    await createSuite(payload);
    setModalState(null);
    load();
  }

  async function handleUpdate(suiteId, payload) {
    await updateSuite(suiteId, payload);
    setModalState(null);
    load();
  }

  async function handleDelete(suiteId) {
    setOpenMenuId(null);
    if (!window.confirm('Delete this suite? Its test cases are not affected, only the suite itself. This cannot be undone.')) {
      return;
    }
    setError(null);
    try {
      await deleteSuite(suiteId);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Test Suites</h1>
        <button onClick={() => setModalState('create')}>+ New Suite</button>
      </div>

      <div className="toolbar">
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
      </div>

      {error && <p className="form-error">{error}</p>}

      <table className="test-cases-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Feature</th>
            <th>Status</th>
            <th>Cases</th>
            <th>Updated</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6}>Loading...</td>
            </tr>
          ) : suites.length === 0 ? (
            <tr>
              <td colSpan={6}>No suites found.</td>
            </tr>
          ) : (
            suites.map((suite) => (
              <tr key={suite.id}>
                <td>
                  <Link to={`/test-suites/${suite.id}`}>{suite.name}</Link>
                </td>
                <td>{suite.feature}</td>
                <td>{suite.status}</td>
                <td>{suite.case_count}</td>
                <td>{formatDate(suite.updated_at)}</td>
                <td className="row-actions">
                  <button
                    className="icon-button"
                    aria-label={`Actions for ${suite.name}`}
                    onClick={() => setOpenMenuId(openMenuId === suite.id ? null : suite.id)}
                  >
                    &#8942;
                  </button>
                  {openMenuId === suite.id && (
                    <div className="row-menu">
                      <button
                        onClick={() => {
                          setModalState(suite);
                          setOpenMenuId(null);
                        }}
                      >
                        Edit
                      </button>
                      <button onClick={() => handleDelete(suite.id)}>Delete</button>
                    </div>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {modalState && (
        <SuiteFormModal
          initial={modalState === 'create' ? null : modalState}
          onClose={() => setModalState(null)}
          onSubmit={(payload) =>
            modalState === 'create' ? handleCreate(payload) : handleUpdate(modalState.id, payload)
          }
        />
      )}
    </div>
  );
}

export default TestSuitesPage;
