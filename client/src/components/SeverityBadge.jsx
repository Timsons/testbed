const COLORS = {
  critical: { bg: 'var(--severity-critical)', fg: 'var(--severity-ink)' },
  major: { bg: 'var(--severity-major)', fg: 'var(--severity-ink)' },
  minor: { bg: 'var(--severity-minor)', fg: 'var(--severity-ink)' },
  trivial: { bg: 'var(--severity-trivial)', fg: 'var(--severity-ink)' },
};

function SeverityBadge({ severity }) {
  const colors = COLORS[severity] || COLORS.trivial;
  return (
    <span
      className="badge"
      style={{ backgroundColor: colors.bg, color: colors.fg }}
    >
      {severity}
    </span>
  );
}

export default SeverityBadge;
