import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import TestCasesPage from './pages/TestCasesPage.jsx';
import TestSuitesPage from './pages/TestSuitesPage.jsx';
import SuiteDetailPage from './pages/SuiteDetailPage.jsx';
import BugsPage from './pages/BugsPage.jsx';
import BugDetailPage from './pages/BugDetailPage.jsx';
import TestRunsPage from './pages/TestRunsPage.jsx';
import RunDetailPage from './pages/RunDetailPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import ReportDetailPage from './pages/ReportDetailPage.jsx';

function App() {
  return (
    <BrowserRouter>
      <nav className="nav">
        <Link to="/">Home</Link>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/test-cases">Test Cases</Link>
        <Link to="/test-suites">Test Suites</Link>
        <Link to="/bugs">Bugs</Link>
        <Link to="/test-runs">Test Runs</Link>
        <Link to="/reports">Reports</Link>
      </nav>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/test-cases" element={<TestCasesPage />} />
        <Route path="/test-suites" element={<TestSuitesPage />} />
        <Route path="/test-suites/:id" element={<SuiteDetailPage />} />
        <Route path="/bugs" element={<BugsPage />} />
        <Route path="/bugs/:id" element={<BugDetailPage />} />
        <Route path="/test-runs" element={<TestRunsPage />} />
        <Route path="/test-runs/:id" element={<RunDetailPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/reports/:id" element={<ReportDetailPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
