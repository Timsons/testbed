import { useEffect, useState } from 'react';
import { useSettings } from '../context/SettingsContext.jsx';

const THEMES = ['light', 'dark', 'system'];
const SEVERITIES = ['critical', 'major', 'minor', 'trivial'];
const PAGE_SIZES = [10, 20, 50, 100];

function getTimezoneOptions() {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch {
    return ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Riga', 'Asia/Tokyo'];
  }
}

function browserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

function SettingsPage() {
  const { settings, loading, error, updateSettings } = useSettings();

  const [theme, setTheme] = useState('system');
  const [defaultSeverity, setDefaultSeverity] = useState('minor');
  const [defaultPageSize, setDefaultPageSize] = useState(20);
  const [timezone, setTimezone] = useState(browserTimezone());
  const [autoGenerateReport, setAutoGenerateReport] = useState(true);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setTheme(settings.theme);
    setDefaultSeverity(settings.default_severity_for_new_bugs);
    setDefaultPageSize(settings.default_page_size);
    setTimezone(settings.timezone || browserTimezone());
    setAutoGenerateReport(settings.auto_generate_report_after_run);
  }, [settings]);

  function markDirty(setter) {
    return (value) => {
      setter(value);
      setSaved(false);
    };
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      await updateSettings({
        theme,
        default_severity_for_new_bugs: defaultSeverity,
        default_page_size: Number(defaultPageSize),
        timezone,
        auto_generate_report_after_run: autoGenerateReport,
      });
      setSaved(true);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="page">Loading...</div>;

  if (error && !settings) {
    return (
      <div className="page">
        <p className="form-error" role="alert">
          Could not load settings: {error}
        </p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Settings</h1>
      </div>

      <form onSubmit={handleSave} className="settings-form">
        <section className="settings-section">
          <h2>Appearance</h2>
          <label>
            Theme
            <select value={theme} onChange={(event) => markDirty(setTheme)(event.target.value)}>
              {THEMES.map((option) => (
                <option key={option} value={option}>
                  {option === 'system' ? 'Match system' : option.charAt(0).toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="settings-section">
          <h2>Bugs</h2>
          <label>
            Default severity for new bugs
            <select
              value={defaultSeverity}
              onChange={(event) => markDirty(setDefaultSeverity)(event.target.value)}
            >
              {SEVERITIES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="settings-section">
          <h2>Lists</h2>
          <label>
            Default page size
            <select
              value={defaultPageSize}
              onChange={(event) => markDirty(setDefaultPageSize)(Number(event.target.value))}
            >
              {PAGE_SIZES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="settings-section">
          <h2>Localization</h2>
          <label>
            Timezone
            <select value={timezone} onChange={(event) => markDirty(setTimezone)(event.target.value)}>
              {getTimezoneOptions().map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="settings-section">
          <h2>Automation</h2>
          <label className="settings-checkbox-label">
            <input
              type="checkbox"
              checked={autoGenerateReport}
              onChange={(event) => markDirty(setAutoGenerateReport)(event.target.checked)}
            />
            Automatically generate a report after a test run finishes
          </label>
        </section>

        {saveError && (
          <p className="form-error" role="alert">
            {saveError}
          </p>
        )}

        <div className="settings-actions">
          <button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          {saved && (
            <span className="settings-saved" role="status">
              &#10003; Saved
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

export default SettingsPage;
