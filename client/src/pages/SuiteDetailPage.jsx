import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import SeverityBadge from '../components/SeverityBadge.jsx';
import { addCaseToSuite, getSuite, removeCaseFromSuite, reorderSuiteCases } from '../api/suites.js';
import { listTestCases } from '../api/test-cases.js';
import { createRun } from '../api/runs.js';

const SUITE_NOT_FOUND = 'Suite not found.';

function SuiteDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [suite, setSuite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [draggedId, setDraggedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [startingRun, setStartingRun] = useState(false);

  const reorderSeqRef = useRef(0);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getSuite(id)
      .then(setSuite)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!searchQuery.trim() || !suite) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    const timer = setTimeout(() => {
      listTestCases({ search: searchQuery, pageSize: 20 })
        .then((data) => {
          const linkedIds = new Set(suite.cases.map((c) => c.id));
          setSearchResults(data.items.filter((tc) => !linkedIds.has(tc.id)));
        })
        .catch((err) => setError(err.message))
        .finally(() => setSearching(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, suite]);

  function handleSuiteGoneOrError(err) {
    if (err.message === SUITE_NOT_FOUND) {
      navigate('/test-suites');
      return;
    }
    setError(err.message);
  }

  async function applyReorder(newCases) {
    setError(null);
    setSuite((current) => ({ ...current, cases: newCases }));
    const seq = ++reorderSeqRef.current;

    try {
      const updatedCases = await reorderSuiteCases(id, newCases.map((c) => c.id));
      if (reorderSeqRef.current !== seq) return; // superseded by a newer reorder
      setSuite((current) => ({ ...current, cases: updatedCases }));
    } catch (err) {
      if (reorderSeqRef.current !== seq) return;
      handleSuiteGoneOrError(err);
      load();
    }
  }

  function handleDragStart(caseId) {
    setDraggedId(caseId);
  }

  function handleDragOver(event) {
    event.preventDefault();
  }

  function handleDrop(targetId) {
    if (draggedId === null || draggedId === targetId) return;

    const cases = [...suite.cases];
    const fromIndex = cases.findIndex((c) => c.id === draggedId);
    const toIndex = cases.findIndex((c) => c.id === targetId);
    const [moved] = cases.splice(fromIndex, 1);
    cases.splice(toIndex, 0, moved);

    setDraggedId(null);
    applyReorder(cases);
  }

  function moveCase(caseId, direction) {
    const cases = [...suite.cases];
    const index = cases.findIndex((c) => c.id === caseId);
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= cases.length) return;

    [cases[index], cases[targetIndex]] = [cases[targetIndex], cases[index]];
    applyReorder(cases);
  }

  async function handleRemove(caseId) {
    if (!window.confirm('Remove this test case from the suite?')) return;
    setError(null);
    try {
      const updatedCases = await removeCaseFromSuite(id, caseId);
      setSuite((current) => ({ ...current, cases: updatedCases }));
    } catch (err) {
      handleSuiteGoneOrError(err);
    }
  }

  async function handleAddCase(testCaseId) {
    setError(null);
    try {
      const updatedCases = await addCaseToSuite(id, testCaseId);
      setSuite((current) => ({ ...current, cases: updatedCases }));
      setSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      handleSuiteGoneOrError(err);
    }
  }

  async function handleNewRun() {
    setStartingRun(true);
    setError(null);
    try {
      const run = await createRun(id);
      navigate(`/test-runs/${run.id}`);
    } catch (err) {
      setError(err.message);
      setStartingRun(false);
    }
  }

  if (loading) return <div className="page">Loading...</div>;
  if (!suite) {
    return (
      <div className="page">
        <p>Suite not found.</p>
        <p>
          <Link to="/test-suites">&larr; Back to Test Suites</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="page">
      <p>
        <Link to="/test-suites">&larr; Back to Test Suites</Link>
      </p>

      <div className="page-header">
        <h1>{suite.name}</h1>
        <button onClick={handleNewRun} disabled={startingRun || suite.cases.length === 0}>
          {startingRun ? 'Starting...' : '+ New Run'}
        </button>
      </div>
      <p className="suite-meta">
        Feature: <strong>{suite.feature}</strong> &middot; Status: <strong>{suite.status}</strong>
      </p>

      {error && <p className="form-error">{error}</p>}

      <table className="test-cases-table">
        <thead>
          <tr>
            <th />
            <th>Title</th>
            <th>Severity</th>
            <th>Status</th>
            <th />
            <th />
          </tr>
        </thead>
        <tbody>
          {suite.cases.length === 0 ? (
            <tr>
              <td colSpan={6}>No test cases in this suite yet.</td>
            </tr>
          ) : (
            suite.cases.map((testCase, index) => (
              <tr
                key={testCase.id}
                draggable
                onDragStart={() => handleDragStart(testCase.id)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(testCase.id)}
                className={draggedId === testCase.id ? 'dragging' : ''}
              >
                <td className="drag-handle" aria-hidden="true">
                  &#9776;
                </td>
                <td>{testCase.title}</td>
                <td>
                  <SeverityBadge severity={testCase.severity} />
                </td>
                <td>{testCase.status}</td>
                <td className="reorder-buttons">
                  <button
                    aria-label={`Move ${testCase.title} up`}
                    onClick={() => moveCase(testCase.id, -1)}
                    disabled={index === 0}
                  >
                    &#9650;
                  </button>
                  <button
                    aria-label={`Move ${testCase.title} down`}
                    onClick={() => moveCase(testCase.id, 1)}
                    disabled={index === suite.cases.length - 1}
                  >
                    &#9660;
                  </button>
                </td>
                <td className="row-actions">
                  <button onClick={() => handleRemove(testCase.id)}>Remove</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="add-case-search">
        <label htmlFor="add-case-search-input">Add a test case</label>
        <input
          id="add-case-search-input"
          type="text"
          placeholder="Search test cases by title..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
        {searchQuery.trim() && (
          <ul className="search-results">
            {searching ? (
              <li className="search-results-message">Searching...</li>
            ) : searchResults.length === 0 ? (
              <li className="search-results-message">No matching test cases to add.</li>
            ) : (
              searchResults.map((tc) => (
                <li key={tc.id}>
                  <span>{tc.title}</span>
                  <button onClick={() => handleAddCase(tc.id)}>+ Add</button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

export default SuiteDetailPage;
