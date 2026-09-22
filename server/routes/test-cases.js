import express from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import db from '../db.js';

const router = express.Router();

export const SEVERITIES = ['critical', 'major', 'minor', 'trivial'];
export const STATUSES = ['draft', 'ready', 'passed', 'failed', 'skipped'];

const REQUIRED_IMPORT_HEADERS = ['title', 'severity', 'steps', 'expected_result'];
const MAX_IMPORT_ROWS = 5000;
const BLANK_AFTER_TRIM_FIELDS = ['title', 'expected_result'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

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

  for (const field of BLANK_AFTER_TRIM_FIELDS) {
    if (typeof body[field] === 'string' && body[field].trim() === '' && body[field] !== '') {
      errors.push(`${field} cannot be blank.`);
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

function normalizeHeader(header) {
  return header.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

// One step per line (mirrors TestCaseFormModal's textToSteps convention, e.g.
// a quoted multiline CSV cell). If that yields a single item, also try `|`
// as a fallback for spreadsheet tools that don't make embedding newlines easy.
function parseStepsCell(raw) {
  const text = String(raw ?? '');
  let parts = text.split('\n');
  if (parts.length === 1 && text.includes('|')) {
    parts = text.split('|');
  }
  return parts.map((step) => step.trim()).filter(Boolean);
}

function mapImportRow(rawRow) {
  const severity = (rawRow.severity || '').trim().toLowerCase();
  const status = (rawRow.status || '').trim().toLowerCase();
  return {
    title: (rawRow.title || '').trim(),
    preconditions: (rawRow.preconditions || '').trim(),
    steps: parseStepsCell(rawRow.steps),
    expected_result: (rawRow.expected_result || '').trim(),
    severity,
    status: status || 'draft',
  };
}

function parseImportCsv(buffer) {
  let missingHeaders = [];
  const rawRows = parse(buffer, {
    columns: (headerRow) => {
      const normalized = headerRow.map(normalizeHeader);
      missingHeaders = REQUIRED_IMPORT_HEADERS.filter((h) => !normalized.includes(h));
      return normalized;
    },
    skip_empty_lines: true,
    trim: true,
    bom: true,
    relax_column_count: true,
  });
  return { rawRows, missingHeaders };
}

function handleImportPreview(req, res) {
  if (!req.file) {
    return res.status(400).json({ success: false, data: null, error: 'No file uploaded.' });
  }

  // csv-parse decodes the buffer as UTF-8; an invalid byte sequence decodes to
  // U+FFFD rather than throwing, so this is the signal that the file probably
  // wasn't saved as UTF-8 (e.g. a Windows-1252/Latin-1 export with accented
  // characters or smart quotes).
  const encodingWarning = req.file.buffer.toString('utf8').includes('�')
    ? "This file doesn't look like valid UTF-8 — some characters may have been replaced with �. Try re-saving it as \"CSV UTF-8\" and uploading again."
    : null;

  let rawRows;
  let missingHeaders;
  try {
    ({ rawRows, missingHeaders } = parseImportCsv(req.file.buffer));
  } catch (err) {
    return res.status(400).json({
      success: false,
      data: null,
      error: `Could not parse CSV: ${err.message}. If this file wasn't saved as UTF-8, try re-saving it as UTF-8 CSV and uploading again.`,
    });
  }

  if (missingHeaders.length > 0) {
    return res.status(400).json({
      success: false,
      data: null,
      error: `CSV is missing required column(s): ${missingHeaders.join(', ')}.`,
    });
  }

  if (rawRows.length > MAX_IMPORT_ROWS) {
    return res.status(400).json({
      success: false,
      data: null,
      error: `CSV has too many rows (${rawRows.length}); the limit is ${MAX_IMPORT_ROWS}.`,
    });
  }

  const rows = rawRows.map((rawRow, index) => {
    const fields = mapImportRow(rawRow);
    const errors = validateTestCase(fields);
    return { row_number: index + 2, fields, errors };
  });

  res.json({
    success: true,
    data: {
      total_rows: rows.length,
      valid_count: rows.filter((r) => r.errors.length === 0).length,
      invalid_count: rows.filter((r) => r.errors.length > 0).length,
      encoding_warning: encodingWarning,
      rows,
    },
    error: null,
  });
}

function handleImportCommit(req, res) {
  const submittedRows = Array.isArray(req.body.rows) ? req.body.rows : [];

  const checked = submittedRows.map((row, index) => {
    const fields = row?.fields || {};
    const errors = validateTestCase(fields);
    return { row_number: row?.row_number ?? index + 2, fields, errors };
  });

  const toInsert = checked.filter((r) => r.errors.length === 0);
  const skipped = checked.filter((r) => r.errors.length > 0);

  const now = new Date().toISOString();
  const insertStmt = db.prepare(
    `INSERT INTO test_cases (title, preconditions, steps, expected_result, severity, status, created_at, updated_at)
     VALUES (@title, @preconditions, @steps, @expected_result, @severity, @status, @created_at, @updated_at)`
  );

  const createdIds = [];
  const insertAll = db.transaction(() => {
    for (const row of toInsert) {
      const result = insertStmt.run({
        title: row.fields.title,
        preconditions: row.fields.preconditions || '',
        steps: JSON.stringify(row.fields.steps),
        expected_result: row.fields.expected_result,
        severity: row.fields.severity,
        status: row.fields.status || 'draft',
        created_at: now,
        updated_at: now,
      });
      createdIds.push(result.lastInsertRowid);
    }
  });
  insertAll();

  res.status(201).json({
    success: true,
    data: {
      imported_count: toInsert.length,
      skipped_count: skipped.length,
      created_ids: createdIds,
      skipped_rows: skipped,
    },
    error: null,
  });
}

// Shared by the list endpoint and the CSV export, so filtering/sorting can
// never drift between "what you see" and "what you export".
function buildTestCaseFilter(req) {
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

  return { whereClause, orderClause, params };
}

function handleListTestCases(req, res) {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 20, 1), 100);
  const { whereClause, orderClause, params } = buildTestCaseFilter(req);

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

const EXPORT_COLUMNS = ['title', 'severity', 'steps', 'expected_result', 'preconditions', 'status'];

function handleExportTestCases(req, res) {
  const { whereClause, orderClause, params } = buildTestCaseFilter(req);

  const rows = db.prepare(`SELECT * FROM test_cases ${whereClause} ${orderClause}`).all(params);

  // Steps go back out one-per-line in a single cell — the exact convention
  // the CSV importer's parseStepsCell already reads on the way back in, so
  // export -> import round-trips cleanly.
  const records = rows.map((row) => ({
    title: row.title,
    severity: row.severity,
    steps: JSON.parse(row.steps).join('\n'),
    expected_result: row.expected_result,
    preconditions: row.preconditions,
    status: row.status,
  }));

  const csv = stringify(records, { header: true, columns: EXPORT_COLUMNS });
  const timestamp = new Date().toISOString().slice(0, 10);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="test-cases-export-${timestamp}.csv"`);
  res.send(csv);
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

function handleFileUpload(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (max 5MB).' : err.message;
      return res.status(400).json({ success: false, data: null, error: message });
    }
    next();
  });
}

router.get('/', handleListTestCases);
router.get('/export', handleExportTestCases);
router.get('/:id', handleGetTestCase);
router.post('/', handleCreateTestCase);
router.post('/import/preview', handleFileUpload, handleImportPreview);
router.post('/import/commit', handleImportCommit);
router.put('/:id', handleUpdateTestCase);
router.delete('/:id', handleDeleteTestCase);

export default router;
