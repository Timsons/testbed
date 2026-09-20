import express from 'express';
import db from '../db.js';

const router = express.Router();

function getRunWithSuite(runId) {
  return db
    .prepare(
      `SELECT r.*, s.name AS suite_name
       FROM test_runs_v2 r
       LEFT JOIN suites s ON s.id = r.suite_id
       WHERE r.id = ?`
    )
    .get(runId);
}

function getRunResultsForReport(runId) {
  return db
    .prepare(
      `SELECT r.test_case_id, tc.title AS test_case_title, tc.severity AS test_case_severity,
              r.result, r.duration_ms, r.notes
       FROM test_run_results r
       LEFT JOIN test_cases tc ON tc.id = r.test_case_id
       WHERE r.run_id = ?
       ORDER BY r.id ASC`
    )
    .all(runId);
}

function serializeReport(row) {
  return { ...row, results: JSON.parse(row.results) };
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}

function formatDateForHtml(iso) {
  return iso
    ? new Date(iso).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—';
}

function formatPassRate(passedCount, failedCount) {
  const denominator = passedCount + failedCount;
  if (denominator === 0) return null;
  return Math.round((passedCount / denominator) * 1000) / 10;
}

function getOverallStatus(report) {
  const notRunCount = report.total_count - report.passed_count - report.failed_count - report.skipped_count;
  if (report.total_count === 0) {
    return { key: 'neutral', label: 'No Results' };
  }
  if (report.failed_count > 0) {
    return { key: 'failed', label: `${report.failed_count} of ${report.total_count} Failed` };
  }
  if (notRunCount > 0) {
    return { key: 'incomplete', label: 'Incomplete' };
  }
  return { key: 'passed', label: 'All Passed' };
}

const RESULT_SORT_PRIORITY = { failed: 0, skipped: 1, null: 2, passed: 3 };

function sortResultsForDisplay(results) {
  return [...results].sort((a, b) => {
    const rank = RESULT_SORT_PRIORITY[a.result] - RESULT_SORT_PRIORITY[b.result];
    return rank !== 0 ? rank : a.test_case_id - b.test_case_id;
  });
}

function buildReportHtml(report, { autoPrint = false } = {}) {
  const status = getOverallStatus(report);
  const passRate = formatPassRate(report.passed_count, report.failed_count);
  const notRunCount = Math.max(
    0,
    report.total_count - report.passed_count - report.failed_count - report.skipped_count
  );

  const distributionSegments = [
    { key: 'passed', count: report.passed_count, label: 'Passed' },
    { key: 'failed', count: report.failed_count, label: 'Failed' },
    { key: 'skipped', count: report.skipped_count, label: 'Skipped' },
    { key: 'not-run', count: notRunCount, label: 'Not Run' },
  ].filter((segment) => segment.count > 0);

  const distributionBar = report.total_count
    ? distributionSegments
        .map(
          (segment) =>
            `<div class="dist-segment dist-${segment.key}" style="width:${(
              (segment.count / report.total_count) *
              100
            ).toFixed(2)}%" title="${segment.label}: ${segment.count}"></div>`
        )
        .join('')
    : '';

  const distributionLegend = distributionSegments
    .map(
      (segment) =>
        `<span class="legend-item"><span class="legend-dot legend-${segment.key}"></span>${segment.label} (${segment.count})</span>`
    )
    .join('');

  const rows = sortResultsForDisplay(report.results)
    .map((item) => {
      const resultKey = item.result || 'not-run';
      const rowClass = resultKey === 'failed' ? ' class="row-failed"' : '';
      return `
      <tr${rowClass}>
        <td>${escapeHtml(item.test_case_title || `Test case #${item.test_case_id}`)}</td>
        <td><span class="badge badge-${escapeHtml(item.test_case_severity || 'trivial')}">${escapeHtml(
          item.test_case_severity || 'unknown'
        )}</span></td>
        <td><span class="badge result-badge result-${escapeHtml(resultKey)}">${escapeHtml(
          item.result || 'Not Run'
        )}</span></td>
        <td>${escapeHtml(item.notes || '—')}</td>
      </tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Test Report — ${escapeHtml(report.suite_name)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  html, body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    margin: 0;
    padding: 2.5rem;
    color: #1a1a1a;
    background: #fff;
    line-height: 1.4;
  }
  .report {
    max-width: 860px;
    margin: 0 auto;
  }

  /* Header */
  header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1.5rem;
    padding-bottom: 1.25rem;
    border-bottom: 2px solid #1a1a1a;
    margin-bottom: 1.75rem;
  }
  .eyebrow {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #888;
    margin: 0 0 0.35rem;
  }
  h1 {
    font-size: 1.6rem;
    margin: 0 0 0.5rem;
    line-height: 1.25;
  }
  .meta-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0 1.25rem;
    font-size: 0.85rem;
    color: #555;
  }
  .meta-row span strong { color: #1a1a1a; font-weight: 600; }
  .status-pill {
    display: inline-block;
    white-space: nowrap;
    padding: 0.4rem 0.9rem;
    border-radius: 999px;
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    border: 1px solid transparent;
  }
  .status-passed { background: #e6f4ea; color: #1b7f37; border-color: #b7dfc3; }
  .status-failed { background: #fde2e1; color: #a11d10; border-color: #f3b4b0; }
  .status-incomplete { background: #eef1ff; color: #33409c; border-color: #c7cdf5; }
  .status-neutral { background: #eee; color: #555; border-color: #ddd; }

  /* Summary cards */
  .summary-cards {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.75rem;
    margin-bottom: 1.25rem;
  }
  .summary-card {
    border: 1px solid #e0e0e0;
    border-top: 3px solid #ccc;
    border-radius: 8px;
    padding: 0.85rem 0.75rem;
    text-align: center;
  }
  .summary-card.card-total { border-top-color: #1a1a1a; }
  .summary-card.card-passed { border-top-color: #2fa84f; }
  .summary-card.card-failed { border-top-color: #d6362a; }
  .summary-card.card-skipped { border-top-color: #d1a600; }
  .summary-card.card-rate { border-top-color: #4a56c9; }
  .summary-value {
    font-size: 1.55rem;
    font-weight: 700;
    line-height: 1.1;
  }
  .summary-label {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #777;
    margin-top: 0.3rem;
  }

  /* Distribution bar */
  .distribution {
    margin-bottom: 2rem;
  }
  .dist-bar {
    display: flex;
    width: 100%;
    height: 10px;
    border-radius: 6px;
    overflow: hidden;
    background: #eee;
    margin-bottom: 0.6rem;
  }
  .dist-segment { height: 100%; }
  .dist-passed { background: #2fa84f; }
  .dist-failed { background: #d6362a; }
  .dist-skipped { background: #e0b400; }
  .dist-not-run { background: #bbb; }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0 1.25rem;
    font-size: 0.78rem;
    color: #555;
  }
  .legend-item { display: inline-flex; align-items: center; gap: 0.35rem; }
  .legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
  }
  .legend-passed { background: #2fa84f; }
  .legend-failed { background: #d6362a; }
  .legend-skipped { background: #e0b400; }
  .legend-not-run { background: #bbb; }

  /* Results table */
  h2 {
    font-size: 0.95rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #444;
    margin: 0 0 0.75rem;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th, td {
    text-align: left;
    padding: 0.65rem 0.75rem;
    border-bottom: 1px solid #eaeaea;
    font-size: 0.85rem;
    vertical-align: top;
  }
  td:first-child, th:first-child { padding-left: 0; }
  td:last-child, th:last-child { padding-right: 0; }
  th {
    background: #fafafa;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: #666;
    border-bottom: 1px solid #ddd;
  }
  tr.row-failed { background: #fef7f6; }
  .badge {
    display: inline-block;
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 600;
    white-space: nowrap;
  }
  .badge-critical { background: #fde2e1; color: #a11d10; }
  .badge-major { background: #ffe8cc; color: #a15c00; }
  .badge-minor { background: #fff6cc; color: #8a6d00; }
  .badge-trivial { background: #e6e6e6; color: #555555; }
  .result-badge.result-passed { background: #e6f4ea; color: #1b7f37; }
  .result-badge.result-failed { background: #fde2e1; color: #a11d10; }
  .result-badge.result-skipped { background: #fff6cc; color: #8a6d00; }
  .result-badge.result-not-run { background: #eee; color: #777; }

  footer {
    margin-top: 2rem;
    padding-top: 1rem;
    border-top: 1px solid #e0e0e0;
    font-size: 0.75rem;
    color: #888;
    display: flex;
    justify-content: space-between;
  }

  @media print {
    body { padding: 0; font-size: 12px; }
    .report { max-width: none; }
    @page { size: auto; margin: 0.6in; }
    header { break-inside: avoid; }
    .summary-cards { break-inside: avoid; }
    .distribution { break-inside: avoid; }
    tr, .summary-card { break-inside: avoid; }
    thead { display: table-header-group; }
    a[href]::after { content: ''; }
  }
</style>
</head>
<body>
  <div class="report">
    <header>
      <div>
        <p class="eyebrow">Test Report</p>
        <h1>${escapeHtml(report.suite_name)}</h1>
        <div class="meta-row">
          <span>Run date: <strong>${escapeHtml(formatDateForHtml(report.run_date))}</strong></span>
          <span>Report #<strong>${report.id}</strong></span>
        </div>
      </div>
      <span class="status-pill status-${status.key}">${escapeHtml(status.label)}</span>
    </header>

    <div class="summary-cards">
      <div class="summary-card card-total">
        <div class="summary-value">${report.total_count}</div>
        <div class="summary-label">Total</div>
      </div>
      <div class="summary-card card-passed">
        <div class="summary-value">${report.passed_count}</div>
        <div class="summary-label">Passed</div>
      </div>
      <div class="summary-card card-failed">
        <div class="summary-value">${report.failed_count}</div>
        <div class="summary-label">Failed</div>
      </div>
      <div class="summary-card card-skipped">
        <div class="summary-value">${report.skipped_count}</div>
        <div class="summary-label">Skipped</div>
      </div>
      <div class="summary-card card-rate">
        <div class="summary-value">${passRate !== null ? `${passRate}%` : '—'}</div>
        <div class="summary-label">Pass Rate</div>
      </div>
    </div>

    <div class="distribution">
      <div class="dist-bar">${distributionBar}</div>
      <div class="legend">${distributionLegend}</div>
    </div>

    <h2>Test Case Results</h2>
    <table>
      <thead>
        <tr>
          <th>Title</th>
          <th>Severity</th>
          <th>Result</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="4">No test case results recorded.</td></tr>'}
      </tbody>
    </table>

    <footer>
      <span>Generated ${escapeHtml(formatDateForHtml(report.generated_at))}</span>
      <span>Report #${report.id}</span>
    </footer>
  </div>
  ${autoPrint ? '<script>window.addEventListener("load", () => window.print());</script>' : ''}
</body>
</html>`;
}

function handleListReports(req, res) {
  const rows = db
    .prepare(
      `SELECT id, run_id, suite_name, run_date, total_count, passed_count, failed_count, skipped_count, generated_at
       FROM reports
       ORDER BY generated_at DESC`
    )
    .all();
  res.json({ success: true, data: rows, error: null });
}

function handleGetReport(req, res) {
  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id);
  if (!report) {
    return res.status(404).json({ success: false, data: null, error: 'Report not found.' });
  }
  res.json({ success: true, data: serializeReport(report), error: null });
}

function handleCreateReport(req, res) {
  const runId = Number(req.body.run_id);
  if (!runId) {
    return res.status(400).json({ success: false, data: null, error: 'run_id is required.' });
  }

  const run = getRunWithSuite(runId);
  if (!run) {
    return res.status(404).json({ success: false, data: null, error: 'Run not found.' });
  }

  const results = getRunResultsForReport(runId);
  const passedCount = results.filter((r) => r.result === 'passed').length;
  const failedCount = results.filter((r) => r.result === 'failed').length;
  const skippedCount = results.filter((r) => r.result === 'skipped').length;

  const now = new Date().toISOString();
  const insertResult = db
    .prepare(
      `INSERT INTO reports (run_id, suite_name, run_date, total_count, passed_count, failed_count, skipped_count, results, generated_at)
       VALUES (@run_id, @suite_name, @run_date, @total_count, @passed_count, @failed_count, @skipped_count, @results, @generated_at)`
    )
    .run({
      run_id: runId,
      suite_name: run.suite_name || `Suite #${run.suite_id}`,
      run_date: run.start_time,
      total_count: results.length,
      passed_count: passedCount,
      failed_count: failedCount,
      skipped_count: skippedCount,
      results: JSON.stringify(results),
      generated_at: now,
    });

  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(insertResult.lastInsertRowid);
  res.status(201).json({ success: true, data: serializeReport(report), error: null });
}

function handleExportReportHtml(req, res) {
  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id);
  if (!report) {
    return res.status(404).json({ success: false, data: null, error: 'Report not found.' });
  }

  const html = buildReportHtml(serializeReport(report));
  const safeName = (report.suite_name || 'report').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="report-${report.id}-${safeName || 'suite'}.html"`);
  res.send(html);
}

function handlePrintReportHtml(req, res) {
  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id);
  if (!report) {
    return res.status(404).json({ success: false, data: null, error: 'Report not found.' });
  }

  const html = buildReportHtml(serializeReport(report), { autoPrint: true });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
}

router.get('/', handleListReports);
router.get('/:id', handleGetReport);
router.post('/', handleCreateReport);
router.get('/:id/export/html', handleExportReportHtml);
router.get('/:id/print', handlePrintReportHtml);

export default router;
