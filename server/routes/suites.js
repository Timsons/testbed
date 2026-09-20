import express from 'express';
import db from '../db.js';

const router = express.Router();

const STATUSES = ['draft', 'ready', 'in-progress', 'passed', 'failed'];

function validateSuite(body, { partial = false } = {}) {
  const errors = [];
  const fields = ['name', 'feature'];

  for (const field of fields) {
    const provided = body[field] !== undefined && body[field] !== null;
    if (!partial && !provided) {
      errors.push(`${field} is required.`);
      continue;
    }
    if (provided && String(body[field]).trim() === '') {
      errors.push(`${field} cannot be blank.`);
    }
  }

  if (body.status !== undefined && !STATUSES.includes(body.status)) {
    errors.push(`status must be one of: ${STATUSES.join(', ')}.`);
  }

  return errors;
}

function getSuiteCases(suiteId) {
  return db
    .prepare(
      `SELECT tc.id, tc.title, tc.severity, tc.status, stc.sort_order
       FROM suite_test_cases stc
       JOIN test_cases tc ON tc.id = stc.test_case_id
       WHERE stc.suite_id = ?
       ORDER BY stc.sort_order ASC`
    )
    .all(suiteId);
}

function handleListSuites(req, res) {
  const status = req.query.status;
  const where = [];
  const params = {};

  if (status && STATUSES.includes(status)) {
    where.push('status = @status');
    params.status = status;
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const rows = db
    .prepare(
      `SELECT s.*, (SELECT COUNT(*) FROM suite_test_cases WHERE suite_id = s.id) AS case_count
       FROM suites s
       ${whereClause}
       ORDER BY s.updated_at DESC`
    )
    .all(params);

  res.json({ success: true, data: rows, error: null });
}

function handleGetSuite(req, res) {
  const suite = db.prepare('SELECT * FROM suites WHERE id = ?').get(req.params.id);
  if (!suite) {
    return res.status(404).json({ success: false, data: null, error: 'Suite not found.' });
  }
  res.json({ success: true, data: { ...suite, cases: getSuiteCases(suite.id) }, error: null });
}

function handleCreateSuite(req, res) {
  const errors = validateSuite(req.body);
  if (errors.length) {
    return res.status(400).json({ success: false, data: null, error: errors.join(' ') });
  }

  const now = new Date().toISOString();
  const result = db
    .prepare(
      `INSERT INTO suites (name, feature, status, created_at, updated_at)
       VALUES (@name, @feature, @status, @created_at, @updated_at)`
    )
    .run({
      name: req.body.name.trim(),
      feature: req.body.feature.trim(),
      status: req.body.status || 'draft',
      created_at: now,
      updated_at: now,
    });

  const suite = db.prepare('SELECT * FROM suites WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, data: { ...suite, cases: [] }, error: null });
}

function handleUpdateSuite(req, res) {
  const existing = db.prepare('SELECT * FROM suites WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ success: false, data: null, error: 'Suite not found.' });
  }

  const errors = validateSuite(req.body, { partial: true });
  if (errors.length) {
    return res.status(400).json({ success: false, data: null, error: errors.join(' ') });
  }

  const updated = {
    id: req.params.id,
    name: req.body.name !== undefined ? req.body.name.trim() : existing.name,
    feature: req.body.feature !== undefined ? req.body.feature.trim() : existing.feature,
    status: req.body.status ?? existing.status,
    updated_at: new Date().toISOString(),
  };

  db.prepare(
    `UPDATE suites SET name = @name, feature = @feature, status = @status, updated_at = @updated_at
     WHERE id = @id`
  ).run(updated);

  const suite = db.prepare('SELECT * FROM suites WHERE id = ?').get(req.params.id);
  res.json({ success: true, data: { ...suite, cases: getSuiteCases(suite.id) }, error: null });
}

function handleDeleteSuite(req, res) {
  const existing = db.prepare('SELECT * FROM suites WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ success: false, data: null, error: 'Suite not found.' });
  }
  db.prepare('DELETE FROM suites WHERE id = ?').run(req.params.id);
  res.json({ success: true, data: { id: Number(req.params.id) }, error: null });
}

function handleAddCaseToSuite(req, res) {
  const suite = db.prepare('SELECT * FROM suites WHERE id = ?').get(req.params.id);
  if (!suite) {
    return res.status(404).json({ success: false, data: null, error: 'Suite not found.' });
  }

  const testCaseId = Number(req.body.test_case_id);
  if (!testCaseId) {
    return res.status(400).json({ success: false, data: null, error: 'test_case_id is required.' });
  }

  const testCase = db.prepare('SELECT id FROM test_cases WHERE id = ?').get(testCaseId);
  if (!testCase) {
    return res.status(404).json({ success: false, data: null, error: 'Test case not found.' });
  }

  const alreadyLinked = db
    .prepare('SELECT 1 FROM suite_test_cases WHERE suite_id = ? AND test_case_id = ?')
    .get(suite.id, testCaseId);
  if (alreadyLinked) {
    return res.status(400).json({ success: false, data: null, error: 'That test case is already in this suite.' });
  }

  const { maxOrder } = db
    .prepare('SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM suite_test_cases WHERE suite_id = ?')
    .get(suite.id);

  db.prepare(
    'INSERT INTO suite_test_cases (suite_id, test_case_id, sort_order) VALUES (?, ?, ?)'
  ).run(suite.id, testCaseId, maxOrder + 1);

  db.prepare('UPDATE suites SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), suite.id);

  res.status(201).json({ success: true, data: getSuiteCases(suite.id), error: null });
}

function handleRemoveCaseFromSuite(req, res) {
  const suite = db.prepare('SELECT * FROM suites WHERE id = ?').get(req.params.id);
  if (!suite) {
    return res.status(404).json({ success: false, data: null, error: 'Suite not found.' });
  }

  const testCaseId = Number(req.params.caseId);
  const existing = db
    .prepare('SELECT 1 FROM suite_test_cases WHERE suite_id = ? AND test_case_id = ?')
    .get(suite.id, testCaseId);
  if (!existing) {
    return res.status(404).json({ success: false, data: null, error: 'That test case is not in this suite.' });
  }

  db.prepare('DELETE FROM suite_test_cases WHERE suite_id = ? AND test_case_id = ?').run(suite.id, testCaseId);
  db.prepare('UPDATE suites SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), suite.id);

  res.json({ success: true, data: getSuiteCases(suite.id), error: null });
}

function handleReorderSuiteCases(req, res) {
  const suite = db.prepare('SELECT * FROM suites WHERE id = ?').get(req.params.id);
  if (!suite) {
    return res.status(404).json({ success: false, data: null, error: 'Suite not found.' });
  }

  const order = req.body.order;
  if (!Array.isArray(order) || order.length === 0) {
    return res.status(400).json({ success: false, data: null, error: 'order must be a non-empty array of test case ids.' });
  }

  const current = db
    .prepare('SELECT test_case_id FROM suite_test_cases WHERE suite_id = ?')
    .all(suite.id)
    .map((row) => row.test_case_id);

  const currentSet = new Set(current);
  const orderSet = new Set(order.map(Number));

  if (currentSet.size !== orderSet.size || [...currentSet].some((id) => !orderSet.has(id))) {
    return res.status(400).json({
      success: false,
      data: null,
      error: 'order must contain exactly the test case ids currently in this suite, with no additions or omissions.',
    });
  }

  const reorder = db.transaction((ids) => {
    const stmt = db.prepare(
      'UPDATE suite_test_cases SET sort_order = ? WHERE suite_id = ? AND test_case_id = ?'
    );
    ids.forEach((id, index) => stmt.run(index, suite.id, id));
  });
  reorder(order.map(Number));

  db.prepare('UPDATE suites SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), suite.id);

  res.json({ success: true, data: getSuiteCases(suite.id), error: null });
}

router.get('/', handleListSuites);
router.get('/:id', handleGetSuite);
router.post('/', handleCreateSuite);
router.put('/:id', handleUpdateSuite);
router.delete('/:id', handleDeleteSuite);
router.post('/:id/cases', handleAddCaseToSuite);
router.delete('/:id/cases/:caseId', handleRemoveCaseFromSuite);
router.put('/:id/reorder', handleReorderSuiteCases);

export default router;
