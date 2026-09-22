import { useState } from 'react';

const SIZE = 200;
const CENTER = SIZE / 2;
const OUTER_R = 84;
const INNER_R = 52;
const GAP_DEG = 2.5;

// Fixed order and colors so a status never repaints when data changes.
// Ordered so red (failed) and green (passed) never sit adjacent in the ring.
const STATUS_META = {
  draft: { label: 'Draft', color: '#c9c2b4' },
  ready: { label: 'Ready', color: '#f2a541' },
  passed: { label: 'Passed', color: '#1b7f37' },
  skipped: { label: 'Skipped', color: '#f5d547' },
  failed: { label: 'Failed', color: '#e4572e' },
};
const STATUS_ORDER = ['draft', 'ready', 'passed', 'skipped', 'failed'];

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutArcPath(cx, cy, innerR, outerR, startAngle, endAngle) {
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  const outerStart = polarToCartesian(cx, cy, outerR, startAngle);
  const outerEnd = polarToCartesian(cx, cy, outerR, endAngle);
  const innerEnd = polarToCartesian(cx, cy, innerR, endAngle);
  const innerStart = polarToCartesian(cx, cy, innerR, startAngle);
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
}

function StatusDonutChart({ data }) {
  const [hovered, setHovered] = useState(null);

  const counts = Object.fromEntries((data || []).map((row) => [row.status, row.count]));
  const total = STATUS_ORDER.reduce((sum, status) => sum + (counts[status] || 0), 0);

  if (total === 0) {
    return <p className="chart-empty">No test cases yet.</p>;
  }

  let cursor = 0;
  const segments = STATUS_ORDER.map((status) => {
    const count = counts[status] || 0;
    const span = (count / total) * 360;
    const startAngle = cursor;
    const endAngle = cursor + span;
    cursor = endAngle;
    return { status, count, startAngle, endAngle, span };
  });

  return (
    <div className="chart-wrap chart-wrap-donut">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="Test case coverage by status" className="chart-svg chart-svg-donut">
        {segments.map((segment) => {
          if (segment.count === 0) return null;
          const gap = Math.min(GAP_DEG / 2, segment.span / 4);
          const isHovered = hovered === segment.status;
          const meta = STATUS_META[segment.status];
          return (
            <path
              key={segment.status}
              d={donutArcPath(CENTER, CENTER, INNER_R, isHovered ? OUTER_R + 4 : OUTER_R, segment.startAngle + gap, segment.endAngle - gap)}
              fill={meta.color}
              tabIndex={0}
              role="img"
              aria-label={`${meta.label}: ${segment.count} test case${segment.count === 1 ? '' : 's'}`}
              onMouseEnter={() => setHovered(segment.status)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(segment.status)}
              onBlur={() => setHovered(null)}
              style={{ cursor: 'pointer', transition: 'd 0.1s ease' }}
            />
          );
        })}
        <text x={CENTER} y={CENTER - 4} textAnchor="middle" className="chart-donut-total">
          {total}
        </text>
        <text x={CENTER} y={CENTER + 14} textAnchor="middle" className="chart-donut-total-label">
          test cases
        </text>
      </svg>

      <ul className="chart-legend chart-legend-list">
        {STATUS_ORDER.map((status) => {
          const meta = STATUS_META[status];
          const count = counts[status] || 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <li
              key={status}
              className={`chart-legend-item${hovered === status ? ' chart-legend-item-active' : ''}`}
              onMouseEnter={() => setHovered(status)}
              onMouseLeave={() => setHovered(null)}
            >
              <span className="chart-legend-swatch" style={{ background: meta.color }} />
              {meta.label}
              <span className="chart-legend-count">
                {count} ({pct}%)
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default StatusDonutChart;
