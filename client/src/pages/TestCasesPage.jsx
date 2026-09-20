import { Fragment, useCallback, useEffect, useState } from 'react';
import SeverityBadge from '../components/SeverityBadge.jsx';
import Pagination from '../components/Pagination.jsx';
import TestCaseFormModal from '../components/TestCaseFormModal.jsx';
import { createTestCase, deleteTestCase, listTestCases, updateTestCase } from '../api/test-cases.js';

const STATUSES = ['draft', 'ready', 'passed', 'failed', 'skipped'];
const PAGE_SIZE = 20;

function formatDate(iso) {
  return new Date(iso).toLocaleString();
}

function TestCasesPage() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('updated_at');
  const [sortDir, setSortDir] = useState('desc');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalState, setModalState] = useState(null); // null | 'create' | <test case object>
  const [openMenuId, setOpenMenuId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    listTestCases({ page, pageSize: PAGE_SIZE, sortBy, sortDir, status: statusFilter, search })
      .then((data) => {
        setItems(data.items);
        setTotalPages(data.totalPages);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page, sortBy, sortDir, statusFilter, search]);

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, search, sortBy, sortDir]);

  function toggleSort(field) {
    if (sortBy === field) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  }

  async function handleCreate(payload) {
    await createTestCase(payload);
    setModalState(null);
    load();
  }

  async function handleUpdate(id, payload) {
    await updateTestCase(id, payload);
    setModalState(null);
    load();
  }

  async function handleDelete(id) {
    setOpenMenuId(null);
    if (!window.confirm('Delete this test case? This cannot be undone.')) return;
    await deleteTestCase(id);
    load();
  }

  function sortIndicator(field) {
    if (sortBy !== field) return '';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Test Cases</h1>
        <button onClick={() => setModalState('create')}>+ New Test Case</button>
      </div>

      <div className="toolbar">
        <input
          placeholder="Search by title..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
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
            <th>Title</th>
            <th className="sortable" onClick={() => toggleSort('severity')}>
              Severity{sortIndicator('severity')}
            </th>
            <th>Status</th>
            <th className="sortable" onClick={() => toggleSort('updated_at')}>
              Updated{sortIndicator('updated_at')}
            </th>
            <th />
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={5}>Loading...</td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={5}>No test cases found.</td>
            </tr>
          ) : (
            items.map((item) => (
              <Fragment key={item.id}>
                <tr>
                  <td>
                    <button
                      className="title-toggle"
                      onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    >
                      <span className={`chevron ${expandedId === item.id ? 'open' : ''}`}>&#8250;</span>
                      {item.title}
                    </button>
                  </td>
                  <td>
                    <SeverityBadge severity={item.severity} />
                  </td>
                  <td>{item.status}</td>
                  <td>{formatDate(item.updated_at)}</td>
                  <td className="row-actions">
                    <button
                      className="icon-button"
                      onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                    >
                      &#8942;
                    </button>
                    {openMenuId === item.id && (
                      <div className="row-menu">
                        <button
                          onClick={() => {
                            setModalState(item);
                            setOpenMenuId(null);
                          }}
                        >
                          Edit
                        </button>
                        <button onClick={() => handleDelete(item.id)}>Delete</button>
                      </div>
                    )}
                  </td>
                </tr>
                {expandedId === item.id && (
                  <tr className="detail-row">
                    <td colSpan={5}>
                      <div className="detail-section">
                        <strong>Preconditions</strong>
                        <p>{item.preconditions || 'None'}</p>
                      </div>
                      <div className="detail-section">
                        <strong>Steps</strong>
                        <ol>
                          {item.steps.map((step, index) => (
                            <li key={index}>{step}</li>
                          ))}
                        </ol>
                      </div>
                      <div className="detail-section">
                        <strong>Expected Result</strong>
                        <p>{item.expected_result}</p>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))
          )}
        </tbody>
      </table>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {modalState && (
        <TestCaseFormModal
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

export default TestCasesPage;
