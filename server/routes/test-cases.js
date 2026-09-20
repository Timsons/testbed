import express from 'express';
import db from '../db.js';

const router = express.Router();

const SEVERITIES = ['critical', 'major', 'minor', 'trivial'];
const STATUSES = ['draft', 'ready', 'passed', 'failed', 'skipped'];

function serializeTestCase(row) {
  return { ...row, steps: JSON.parse(row.steps) };
}

function validateTestCase(body, { partial = false } = {}) {
  const errors = [];
  const required = ['title', 'steps', 'expected_result', 'severity'];

  if (!partial) {
    for (const field of required) {
      if (body[field] === undefined || body[field] === null || body[field] === '') {
        errors.push(`${field} is required.`);
      }
    }
  }

  if (body.severity !== undefined && !SEVERITIES.includes(body.severity)) {
    errors.push(`severity must be one of: ${SEVERITIES.join(', ')}.`);
  }

  if (body.status !== undefined && !STATUSES.includes(body.status)) {
    errors.push(`status must be one of: ${STATUSES.join(', ')}.`);
  }

  if (
    body.steps !== undefined &&
    (!Array.isArray(body.steps) ||
      body.steps.length === 0 ||
      body.steps.some((step) => typeof step !== 'string' || !step.trim()))
  ) {
    errors.push('steps must be a non-empty array of non-empty strings.');
  }

  return errors;
}

function handleListTestCases(req, res) {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 20, 1), 100);
  const sortBy = req.query.sortBy === 'severity' ? 'severity' : 'updated_at';
  const sortDir = req.query.sortDir === 'asc' ? 'ASC' : 'DESC';
  const status = req.query.status;
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

  const where = [];
  const params = {};

  if (status && STATUSES.includes(status)) {
    where.push('status = @status');
    params.status = status;
  }
  if (search) {
    where.push('title LIKE @search');
    params.search = `%${search}%`;
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const orderClause =
    sortBy === 'severity'
      ? `ORDER BY CASE severity WHEN 'critical' THEN 4 WHEN 'major' THEN 3 WHEN 'minor' THEN 2 WHEN 'trivial' THEN 1 END ${sortDir}`
      : `ORDER BY updated_at ${sortDir}`;

  const total = db.prepare(`SELECT COUNT(*) as count FROM test_cases ${whereClause}`).get(params).count;

  const rows = db
    .prepare(
      `SELECT * FROM test_cases ${whereClause} ${orderClause} LIMIT @limit OFFSET @offset`
    )
    .all({ ...params, limit: pageSize, offset: (page - 1) * pageSize });

  res.json({
    success: true,
    data: {
      items: rows.map(serializeTestCase),
      page,
      pageSize,
      total,
      totalPages: Math.max(Math.ceil(total / pageSize), 1),
    },
    error: null,
  });
}

function handleGetTestCase(req, res) {
  const row = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(req.params.id);
  if (!row) {
    return res.status(404).json({ success: false, data: null, error: 'Test case not found.' });
  }
  res.json({ success: true, data: serializeTestCase(row), error: null });
}

function handleCreateTestCase(req, res) {
  const errors = validateTestCase(req.body);
  if (errors.length) {
    return res.status(400).json({ success: false, data: null, error: errors.join(' ') });
  }

  const now = new Date().toISOString();
  const result = db
    .prepare(
      `INSERT INTO test_cases (title, preconditions, steps, expected_result, severity, status, created_at, updated_at)
       VALUES (@title, @preconditions, @steps, @expected_result, @severity, @status, @created_at, @updated_at)`
    )
    .run({
      title: req.body.title,
      preconditions: req.body.preconditions || '',
      steps: JSON.stringify(req.body.steps),
      expected_result: req.body.expected_result,
      severity: req.body.severity,
      status: req.body.status || 'draft',
      created_at: now,
      updated_at: now,
    });

  const row = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, data: serializeTestCase(row), error: null });
}

function handleUpdateTestCase(req, res) {
  const existing = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ success: false, data: null, error: 'Test case not found.' });
  }

  const errors = validateTestCase(req.body, { partial: true });
  if (errors.length) {
    return res.status(400).json({ success: false, data: null, error: errors.join(' ') });
  }

  const updated = {
    id: req.params.id,
    title: req.body.title ?? existing.title,
    preconditions: req.body.preconditions ?? existing.preconditions,
    steps: req.body.steps ? JSON.stringify(req.body.steps) : existing.steps,
    expected_result: req.body.expected_result ?? existing.expected_result,
    severity: req.body.severity ?? existing.severity,
    status: req.body.status ?? existing.status,
    updated_at: new Date().toISOString(),
  };

  db.prepare(
    `UPDATE test_cases
     SET title = @title, preconditions = @preconditions, steps = @steps,
         expected_result = @expected_result, severity = @severity, status = @status, updated_at = @updated_at
     WHERE id = @id`
  ).run(updated);

  const row = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(req.params.id);
  res.json({ success: true, data: serializeTestCase(row), error: null });
}

function handleDeleteTestCase(req, res) {
  const existing = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ success: false, data: null, error: 'Test case not found.' });
  }
  db.prepare('DELETE FROM test_cases WHERE id = ?').run(req.params.id);
  res.json({ success: true, data: { id: Number(req.params.id) }, error: null });
}

router.get('/', handleListTestCases);
router.get('/:id', handleGetTestCase);
router.post('/', handleCreateTestCase);
router.put('/:id', handleUpdateTestCase);
router.delete('/:id', handleDeleteTestCase);

export default router;
