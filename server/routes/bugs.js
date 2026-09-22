import express from 'express';
import multer from 'multer';
import db from '../db.js';

const router = express.Router();

const SEVERITIES = ['critical', 'major', 'minor', 'trivial'];
const STATUSES = ['open', 'in-progress', 'resolved', 'closed', 'reopened'];
const ENVIRONMENTS = ['Web Chrome', 'Android Chrome', 'iOS Chrome', 'iOS Safari'];
const SCREENSHOT_MIME_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const MAX_SCREENSHOTS_PER_UPLOAD = 5;

const uploadScreenshots = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: MAX_SCREENSHOTS_PER_UPLOAD },
  fileFilter: (req, file, cb) => {
    if (!SCREENSHOT_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error(`"${file.originalname}" isn't a supported image type (PNG, JPEG, GIF, or WEBP only).`));
    }
    cb(null, true);
  },
});

function handleScreenshotUpload(req, res, next) {
  uploadScreenshots.array('files', MAX_SCREENSHOTS_PER_UPLOAD)(req, res, (err) => {
    if (err) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Each screenshot must be 5MB or smaller.'
          : err.code === 'LIMIT_FILE_COUNT'
            ? `You can upload at most ${MAX_SCREENSHOTS_PER_UPLOAD} screenshots at a time.`
            : err.message;
      return res.status(400).json({ success: false, data: null, error: message });
    }
    next();
  });
}

function serializeScreenshot(row) {
  return {
    id: row.id,
    bug_id: row.bug_id,
    filename: row.filename,
    mime_type: row.mime_type,
    size_bytes: row.size_bytes,
    uploaded_at: row.uploaded_at,
  };
}

function getBugScreenshots(bugId) {
  return db
    .prepare(
      'SELECT id, bug_id, filename, mime_type, size_bytes, uploaded_at FROM bug_screenshots WHERE bug_id = ? ORDER BY uploaded_at ASC'
    )
    .all(bugId)
    .map(serializeScreenshot);
}

const TRANSITIONS = {
  open: ['in-progress', 'closed'],
  'in-progress': ['resolved', 'closed'],
  resolved: ['closed', 'reopened'],
  closed: ['reopened'],
  reopened: ['in-progress', 'closed'],
};

function serializeBug(row) {
  return { ...row, steps_to_reproduce: JSON.parse(row.steps_to_reproduce) };
}

function getBugActivity(bugId) {
  return db
    .prepare('SELECT * FROM bug_activity WHERE bug_id = ? ORDER BY timestamp ASC, id ASC')
    .all(bugId);
}

function validateBug(body, { partial = false } = {}) {
  const errors = [];
  const requiredStrings = ['title', 'expected', 'actual'];
  const optionalStrings = ['description'];

  for (const field of [...requiredStrings, ...optionalStrings]) {
    const isRequired = requiredStrings.includes(field);
    const provided = Object.prototype.hasOwnProperty.call(body, field) && body[field] !== undefined;

    if (!provided) {
      if (!partial && isRequired) errors.push(`${field} is required.`);
      continue;
    }

    if (typeof body[field] !== 'string') {
      errors.push(`${field} must be a string.`);
      continue;
    }

    if (isRequired && body[field].trim() === '') {
      errors.push(`${field} cannot be blank.`);
    }
  }

  if (!partial && (body.severity === undefined || body.severity === null)) {
    errors.push('severity is required.');
  }
  if (!partial && (body.steps_to_reproduce === undefined || body.steps_to_reproduce === null)) {
    errors.push('steps_to_reproduce is required.');
  }
  if (!partial && (body.environment === undefined || body.environment === null)) {
    errors.push('environment is required.');
  }

  if (body.severity !== undefined && !SEVERITIES.includes(body.severity)) {
    errors.push(`severity must be one of: ${SEVERITIES.join(', ')}.`);
  }

  if (body.environment !== undefined && !ENVIRONMENTS.includes(body.environment)) {
    errors.push(`environment must be one of: ${ENVIRONMENTS.join(', ')}.`);
  }

  if (
    body.steps_to_reproduce !== undefined &&
    (!Array.isArray(body.steps_to_reproduce) ||
      body.steps_to_reproduce.length === 0 ||
      body.steps_to_reproduce.some((step) => typeof step !== 'string' || !step.trim()))
  ) {
    errors.push('steps_to_reproduce must be a non-empty array of non-empty strings.');
  }

  if (body.status !== undefined) {
    errors.push('status cannot be set here — use PATCH /:id/status to change it.');
  }

  return errors;
}

function handleListBugs(req, res) {
  const { status, severity, search } = req.query;
  const sortBy = req.query.sortBy === 'severity' ? 'severity' : 'updated_at';
  const sortDir = req.query.sortDir === 'asc' ? 'ASC' : 'DESC';

  const where = [];
  const params = {};

  if (status && STATUSES.includes(status)) {
    where.push('status = @status');
    params.status = status;
  }
  if (severity && SEVERITIES.includes(severity)) {
    where.push('severity = @severity');
    params.severity = severity;
  }
  if (search && search.trim()) {
    where.push('(title LIKE @search OR description LIKE @search)');
    params.search = `%${search.trim()}%`;
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const orderClause =
    sortBy === 'severity'
      ? `ORDER BY CASE severity WHEN 'critical' THEN 4 WHEN 'major' THEN 3 WHEN 'minor' THEN 2 WHEN 'trivial' THEN 1 END ${sortDir}`
      : `ORDER BY updated_at ${sortDir}`;

  const rows = db.prepare(`SELECT * FROM bugs ${whereClause} ${orderClause}`).all(params);
  res.json({ success: true, data: rows.map(serializeBug), error: null });
}

function handleGetBug(req, res) {
  const bug = db.prepare('SELECT * FROM bugs WHERE id = ?').get(req.params.id);
  if (!bug) {
    return res.status(404).json({ success: false, data: null, error: 'Bug not found.' });
  }
  res.json({
    success: true,
    data: {
      ...serializeBug(bug),
      activity: getBugActivity(bug.id),
      allowed_next_statuses: TRANSITIONS[bug.status] || [],
      screenshots: getBugScreenshots(bug.id),
    },
    error: null,
  });
}

function handleCreateBug(req, res) {
  const errors = validateBug(req.body);
  if (errors.length) {
    return res.status(400).json({ success: false, data: null, error: errors.join(' ') });
  }

  const now = new Date().toISOString();
  const result = db
    .prepare(
      `INSERT INTO bugs (title, description, severity, status, steps_to_reproduce, expected, actual, environment, created_at, updated_at)
       VALUES (@title, @description, @severity, 'open', @steps_to_reproduce, @expected, @actual, @environment, @created_at, @updated_at)`
    )
    .run({
      title: req.body.title.trim(),
      description: (req.body.description || '').trim(),
      severity: req.body.severity,
      steps_to_reproduce: JSON.stringify(req.body.steps_to_reproduce),
      expected: req.body.expected.trim(),
      actual: req.body.actual.trim(),
      environment: req.body.environment,
      created_at: now,
      updated_at: now,
    });

  const bug = db.prepare('SELECT * FROM bugs WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({
    success: true,
    data: { ...serializeBug(bug), activity: [], allowed_next_statuses: TRANSITIONS.open, screenshots: [] },
    error: null,
  });
}

function handleUpdateBug(req, res) {
  const existing = db.prepare('SELECT * FROM bugs WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ success: false, data: null, error: 'Bug not found.' });
  }

  const errors = validateBug(req.body, { partial: true });
  if (errors.length) {
    return res.status(400).json({ success: false, data: null, error: errors.join(' ') });
  }

  const updated = {
    id: req.params.id,
    title: req.body.title !== undefined ? req.body.title.trim() : existing.title,
    description: req.body.description !== undefined ? req.body.description.trim() : existing.description,
    severity: req.body.severity ?? existing.severity,
    steps_to_reproduce: req.body.steps_to_reproduce
      ? JSON.stringify(req.body.steps_to_reproduce)
      : existing.steps_to_reproduce,
    expected: req.body.expected !== undefined ? req.body.expected.trim() : existing.expected,
    actual: req.body.actual !== undefined ? req.body.actual.trim() : existing.actual,
    environment: req.body.environment ?? existing.environment,
    updated_at: new Date().toISOString(),
  };

  db.prepare(
    `UPDATE bugs SET title = @title, description = @description, severity = @severity,
       steps_to_reproduce = @steps_to_reproduce, expected = @expected, actual = @actual,
       environment = @environment, updated_at = @updated_at
     WHERE id = @id`
  ).run(updated);

  const bug = db.prepare('SELECT * FROM bugs WHERE id = ?').get(req.params.id);
  res.json({
    success: true,
    data: { ...serializeBug(bug), activity: getBugActivity(bug.id), allowed_next_statuses: TRANSITIONS[bug.status] },
    error: null,
  });
}

function handleDeleteBug(req, res) {
  const existing = db.prepare('SELECT * FROM bugs WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ success: false, data: null, error: 'Bug not found.' });
  }
  db.prepare('DELETE FROM bugs WHERE id = ?').run(req.params.id);
  res.json({ success: true, data: { id: Number(req.params.id) }, error: null });
}

function handleChangeBugStatus(req, res) {
  const bug = db.prepare('SELECT * FROM bugs WHERE id = ?').get(req.params.id);
  if (!bug) {
    return res.status(404).json({ success: false, data: null, error: 'Bug not found.' });
  }

  const nextStatus = req.body.status;
  if (!nextStatus || !STATUSES.includes(nextStatus)) {
    return res.status(400).json({ success: false, data: null, error: `status must be one of: ${STATUSES.join(', ')}.` });
  }

  const allowed = TRANSITIONS[bug.status] || [];
  if (!allowed.includes(nextStatus)) {
    return res.status(400).json({
      success: false,
      data: null,
      error: `Cannot move from "${bug.status}" to "${nextStatus}". Allowed next statuses: ${
        allowed.length ? allowed.join(', ') : 'none'
      }.`,
    });
  }

  const now = new Date().toISOString();
  const message = req.body.message ? String(req.body.message).trim() : null;

  const transition = db.transaction(() => {
    db.prepare('UPDATE bugs SET status = ?, updated_at = ? WHERE id = ?').run(nextStatus, now, bug.id);
    db.prepare(
      `INSERT INTO bug_activity (bug_id, action, old_value, new_value, message, timestamp)
       VALUES (?, 'status_change', ?, ?, ?, ?)`
    ).run(bug.id, bug.status, nextStatus, message, now);
  });
  transition();

  const updatedBug = db.prepare('SELECT * FROM bugs WHERE id = ?').get(bug.id);
  res.json({
    success: true,
    data: {
      ...serializeBug(updatedBug),
      activity: getBugActivity(bug.id),
      allowed_next_statuses: TRANSITIONS[nextStatus] || [],
    },
    error: null,
  });
}

function handleAddBugComment(req, res) {
  const bug = db.prepare('SELECT * FROM bugs WHERE id = ?').get(req.params.id);
  if (!bug) {
    return res.status(404).json({ success: false, data: null, error: 'Bug not found.' });
  }

  const message = req.body.message ? String(req.body.message).trim() : '';
  if (!message) {
    return res.status(400).json({ success: false, data: null, error: 'message is required.' });
  }

  const now = new Date().toISOString();
  const transaction = db.transaction(() => {
    db.prepare(
      `INSERT INTO bug_activity (bug_id, action, old_value, new_value, message, timestamp)
       VALUES (?, 'comment', NULL, NULL, ?, ?)`
    ).run(bug.id, message, now);
    db.prepare('UPDATE bugs SET updated_at = ? WHERE id = ?').run(now, bug.id);
  });
  transaction();

  res.status(201).json({ success: true, data: getBugActivity(bug.id), error: null });
}

function handleUploadScreenshots(req, res) {
  const bug = db.prepare('SELECT id FROM bugs WHERE id = ?').get(req.params.id);
  if (!bug) {
    return res.status(404).json({ success: false, data: null, error: 'Bug not found.' });
  }

  const files = req.files || [];
  if (files.length === 0) {
    return res.status(400).json({ success: false, data: null, error: 'No image files were uploaded.' });
  }

  const now = new Date().toISOString();
  const insertStmt = db.prepare(
    `INSERT INTO bug_screenshots (bug_id, filename, mime_type, size_bytes, data, uploaded_at)
     VALUES (@bug_id, @filename, @mime_type, @size_bytes, @data, @uploaded_at)`
  );

  const insertAll = db.transaction(() => {
    for (const file of files) {
      insertStmt.run({
        bug_id: bug.id,
        filename: file.originalname,
        mime_type: file.mimetype,
        size_bytes: file.size,
        data: file.buffer,
        uploaded_at: now,
      });
    }
  });
  insertAll();

  res.status(201).json({ success: true, data: getBugScreenshots(bug.id), error: null });
}

function handleGetScreenshotImage(req, res) {
  const screenshot = db
    .prepare('SELECT * FROM bug_screenshots WHERE id = ? AND bug_id = ?')
    .get(req.params.screenshotId, req.params.id);
  if (!screenshot) {
    return res.status(404).json({ success: false, data: null, error: 'Screenshot not found.' });
  }
  res.setHeader('Content-Type', screenshot.mime_type);
  res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
  res.send(screenshot.data);
}

function handleDeleteScreenshot(req, res) {
  const screenshot = db
    .prepare('SELECT id FROM bug_screenshots WHERE id = ? AND bug_id = ?')
    .get(req.params.screenshotId, req.params.id);
  if (!screenshot) {
    return res.status(404).json({ success: false, data: null, error: 'Screenshot not found.' });
  }
  db.prepare('DELETE FROM bug_screenshots WHERE id = ?').run(screenshot.id);
  res.json({ success: true, data: getBugScreenshots(req.params.id), error: null });
}

router.get('/', handleListBugs);
router.get('/:id', handleGetBug);
router.post('/', handleCreateBug);
router.put('/:id', handleUpdateBug);
router.delete('/:id', handleDeleteBug);
router.patch('/:id/status', handleChangeBugStatus);
router.post('/:id/comments', handleAddBugComment);
router.post('/:id/screenshots', handleScreenshotUpload, handleUploadScreenshots);
router.get('/:id/screenshots/:screenshotId', handleGetScreenshotImage);
router.delete('/:id/screenshots/:screenshotId', handleDeleteScreenshot);

export default router;
