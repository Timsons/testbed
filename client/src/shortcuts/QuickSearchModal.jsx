import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listTestCases } from '../api/test-cases.js';
import { listBugs } from '../api/bugs.js';
import { listSuites } from '../api/suites.js';

const RESULTS_PER_GROUP = 5;
const GROUP_ORDER = ['Test Cases', 'Bugs', 'Test Suites'];

function QuickSearchModal({ onClose }) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [testCases, setTestCases] = useState([]);
  const [bugs, setBugs] = useState([]);
  const [suites, setSuites] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setTestCases([]);
      setBugs([]);
      setSuites([]);
      setError(null);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError(null);
    const timer = setTimeout(() => {
      Promise.all([
        listTestCases({ search: trimmed, pageSize: RESULTS_PER_GROUP }),
        listBugs({ search: trimmed }),
        listSuites({ search: trimmed }),
      ])
        .then(([testCaseData, bugData, suiteData]) => {
          setTestCases(testCaseData.items.slice(0, RESULTS_PER_GROUP));
          setBugs(bugData.slice(0, RESULTS_PER_GROUP));
          setSuites(suiteData.slice(0, RESULTS_PER_GROUP));
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // The single list every other piece of state derives from: keyboard nav
  // indexes into this, and rendering groups it back by `group`.
  const flatResults = useMemo(
    () => [
      ...testCases.map((tc) => ({
        key: `test-case-${tc.id}`,
        group: 'Test Cases',
        label: tc.title,
        meta: tc.severity,
        to: `/test-cases?search=${encodeURIComponent(tc.title)}`,
      })),
      ...bugs.map((bug) => ({
        key: `bug-${bug.id}`,
        group: 'Bugs',
        label: bug.title,
        meta: bug.status,
        to: `/bugs/${bug.id}`,
      })),
      ...suites.map((suite) => ({
        key: `suite-${suite.id}`,
        group: 'Test Suites',
        label: suite.name,
        meta: suite.feature,
        to: `/test-suites/${suite.id}`,
      })),
    ],
    [testCases, bugs, suites]
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [flatResults.length]);

  function goTo(result) {
    if (!result) return;
    navigate(result.to);
    onClose();
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      onClose();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, flatResults.length - 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      goTo(flatResults[activeIndex]);
    }
  }

  const hasQuery = query.trim().length > 0;
  const hasResults = flatResults.length > 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal quick-search-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Quick search"
        onClick={(event) => event.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="text"
          className="quick-search-input"
          placeholder="Search test cases, bugs, and suites..."
          aria-label="Search test cases, bugs, and suites"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
        />

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        {!hasQuery && <p className="quick-search-hint">Start typing to search across the app.</p>}
        {hasQuery && loading && <p className="quick-search-hint">Searching...</p>}
        {hasQuery && !loading && !hasResults && !error && (
          <p className="quick-search-hint">No matches for &ldquo;{query}&rdquo;.</p>
        )}

        {GROUP_ORDER.map((groupName) => {
          const items = flatResults.filter((result) => result.group === groupName);
          if (items.length === 0) return null;
          return (
            <div key={groupName} className="quick-search-group">
              <h3>{groupName}</h3>
              <ul>
                {items.map((result) => {
                  const index = flatResults.indexOf(result);
                  return (
                    <li key={result.key}>
                      <button
                        type="button"
                        className={index === activeIndex ? 'quick-search-result active' : 'quick-search-result'}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => goTo(result)}
                      >
                        <span>{result.label}</span>
                        <span className="quick-search-meta">{result.meta}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default QuickSearchModal;
