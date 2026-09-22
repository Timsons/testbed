import express from 'express';
import db from '../db.js';

const router = express.Router();

const THEMES = ['light', 'dark', 'system', 'polish'];
const SEVERITIES = ['critical', 'major', 'minor', 'trivial'];
const PAGE_SIZES = [10, 20, 50, 100];

function serializeSettings(row) {
  return {
    theme: row.theme,
    default_severity_for_new_bugs: row.default_severity_for_new_bugs,
    default_page_size: row.default_page_size,
    timezone: row.timezone,
    auto_generate_report_after_run: Boolean(row.auto_generate_report_after_run),
    updated_at: row.updated_at,
  };
}

// The settings row is a singleton (id = 1). Self-healing: if it's ever
// missing (fresh DB, or someone deleted it by hand), create it with defaults
// rather than erroring — there's no real "not found" state for global
// settings from a UX standpoint.
function getOrCreateSettingsRow() {
  let row = db.prepare('SELECT * FROM user_preferences WHERE id = 1').get();
  if (!row) {
    db.prepare(
      `INSERT INTO user_preferences (id, updated_at) VALUES (1, ?)`
    ).run(new Date().toISOString());
    row = db.prepare('SELECT * FROM user_preferences WHERE id = 1').get();
  }
  return row;
}

function validateSettings(body) {
  const errors = [];

  if (body.theme !== undefined && !THEMES.includes(body.theme)) {
    errors.push(`theme must be one of: ${THEMES.join(', ')}.`);
  }
  if (
    body.default_severity_for_new_bugs !== undefined &&
    !SEVERITIES.includes(body.default_severity_for_new_bugs)
  ) {
    errors.push(`default_severity_for_new_bugs must be one of: ${SEVERITIES.join(', ')}.`);
  }
  if (body.default_page_size !== undefined && !PAGE_SIZES.includes(Number(body.default_page_size))) {
    errors.push(`default_page_size must be one of: ${PAGE_SIZES.join(', ')}.`);
  }
  if (body.timezone !== undefined && body.timezone !== null && typeof body.timezone !== 'string') {
    errors.push('timezone must be a string.');
  }
  if (
    body.auto_generate_report_after_run !== undefined &&
    typeof body.auto_generate_report_after_run !== 'boolean'
  ) {
    errors.push('auto_generate_report_after_run must be a boolean.');
  }

  return errors;
}

function handleGetSettings(req, res) {
  const row = getOrCreateSettingsRow();
  res.json({ success: true, data: serializeSettings(row), error: null });
}

function handleUpdateSettings(req, res) {
  const errors = validateSettings(req.body);
  if (errors.length) {
    return res.status(400).json({ success: false, data: null, error: errors.join(' ') });
  }

  const existing = getOrCreateSettingsRow();

  const updated = {
    theme: req.body.theme ?? existing.theme,
    default_severity_for_new_bugs: req.body.default_severity_for_new_bugs ?? existing.default_severity_for_new_bugs,
    default_page_size:
      req.body.default_page_size !== undefined ? Number(req.body.default_page_size) : existing.default_page_size,
    timezone: req.body.timezone !== undefined ? req.body.timezone : existing.timezone,
    auto_generate_report_after_run:
      req.body.auto_generate_report_after_run !== undefined
        ? req.body.auto_generate_report_after_run
          ? 1
          : 0
        : existing.auto_generate_report_after_run,
    updated_at: new Date().toISOString(),
  };

  db.prepare(
    `UPDATE user_preferences
     SET theme = @theme, default_severity_for_new_bugs = @default_severity_for_new_bugs,
         default_page_size = @default_page_size, timezone = @timezone,
         auto_generate_report_after_run = @auto_generate_report_after_run, updated_at = @updated_at
     WHERE id = 1`
  ).run(updated);

  const row = db.prepare('SELECT * FROM user_preferences WHERE id = 1').get();
  res.json({ success: true, data: serializeSettings(row), error: null });
}

router.get('/', handleGetSettings);
router.put('/', handleUpdateSettings);

export default router;
