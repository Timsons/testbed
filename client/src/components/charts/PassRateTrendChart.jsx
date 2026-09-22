import { useState } from 'react';

const WIDTH = 560;
const HEIGHT = 220;
const MARGIN = { top: 16, right: 16, bottom: 28, left: 34 };
const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom;
const LINE_COLOR = '#1b7f37';

function shortDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
}

function PassRateTrendChart({ data }) {
  const [hoverIndex, setHoverIndex] = useState(null);

  if (!data || data.length === 0) {
    return <p className="chart-empty">Not enough run data yet.</p>;
  }

  const stepX = data.length > 1 ? PLOT_WIDTH / (data.length - 1) : 0;
  const points = data.map((point, index) => ({
    ...point,
    x: MARGIN.left + (data.length > 1 ? index * stepX : PLOT_WIDTH / 2),
    y: point.pass_rate === null ? null : MARGIN.top + PLOT_HEIGHT * (1 - point.pass_rate / 100),
  }));

  const knownPoints = points.filter((p) => p.y !== null);
  let linePath = '';
  points.forEach((p, index) => {
    if (p.y === null) return;
    const prevDrawn = index > 0 && points[index - 1].y !== null;
    linePath += `${linePath === '' || !prevDrawn ? 'M' : 'L'} ${p.x} ${p.y} `;
  });

  const lastPoint = knownPoints[knownPoints.length - 1];
  const gridLines = [0, 50, 100];

  return (
    <div className="chart-wrap">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label="Pass rate trend over the last test runs"
        className="chart-svg"
      >
        {gridLines.map((value) => {
          const y = MARGIN.top + PLOT_HEIGHT * (1 - value / 100);
          return (
            <g key={value}>
              <line x1={MARGIN.left} y1={y} x2={WIDTH - MARGIN.right} y2={y} className="chart-gridline" />
              <text x={MARGIN.left - 8} y={y} className="chart-axis-label" textAnchor="end" dominantBaseline="middle">
                {value}%
              </text>
            </g>
          );
        })}

        {linePath && <path d={linePath.trim()} fill="none" stroke={LINE_COLOR} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}

        {points.map((p, index) => {
          if (p.y === null) return null;
          const isLast = p === lastPoint;
          const isHovered = hoverIndex === index;
          return (
            <g key={p.run_id}>
              {isLast && (
                <circle cx={p.x} cy={p.y} r="6" fill={LINE_COLOR} stroke="#fff" strokeWidth="2" />
              )}
              {isHovered && !isLast && (
                <circle cx={p.x} cy={p.y} r="6" fill={LINE_COLOR} stroke="#fff" strokeWidth="2" />
              )}
              {isLast && (
                <text x={p.x} y={p.y - 12} textAnchor="middle" className="chart-direct-label">
                  {p.pass_rate}%
                </text>
              )}
              <circle
                cx={p.x}
                cy={p.y}
                r="12"
                fill="transparent"
                tabIndex={0}
                role="img"
                aria-label={`${shortDate(p.date)}: ${p.pass_rate}% pass rate`}
                onMouseEnter={() => setHoverIndex(index)}
                onMouseLeave={() => setHoverIndex(null)}
                onFocus={() => setHoverIndex(index)}
                onBlur={() => setHoverIndex(null)}
                style={{ cursor: 'pointer' }}
              />
            </g>
          );
        })}

        {points.map((p, index) => (
          <text key={`label-${p.run_id}`} x={p.x} y={HEIGHT - 8} textAnchor="middle" className="chart-axis-label">
            {shortDate(p.date)}
          </text>
        ))}
      </svg>

      {hoverIndex !== null && points[hoverIndex].y !== null && (
        <div
          className="chart-tooltip"
          style={{
            left: `${(points[hoverIndex].x / WIDTH) * 100}%`,
            top: `${(points[hoverIndex].y / HEIGHT) * 100}%`,
          }}
        >
          <strong>{points[hoverIndex].pass_rate}%</strong>
          <span>{shortDate(points[hoverIndex].date)}</span>
        </div>
      )}
    </div>
  );
}

export default PassRateTrendChart;
