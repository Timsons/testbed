const COLORS = {
  critical: { bg: '#fde2e1', fg: '#a11d10' },
  major: { bg: '#ffe8cc', fg: '#a15c00' },
  minor: { bg: '#fff6cc', fg: '#8a6d00' },
  trivial: { bg: '#e6e6e6', fg: '#555555' },
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
