import { useState } from 'react';

const WIDTH = 560;
const HEIGHT = 240;
const MARGIN = { top: 16, right: 12, bottom: 32, left: 30 };
const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom;
const BAR_MAX_WIDTH = 20;
const BAR_GAP = 3;
const RADIUS = 4;

const SERIES = [
  { key: 'opened', label: 'Opened', color: '#2a78d6' },
  { key: 'closed', label: 'Closed', color: '#eb6834' },
];

function shortDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
}

function niceMax(value) {
  if (value <= 5) return Math.max(1, Math.ceil(value));
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude) * magnitude;
}

function roundedTopRectPath(x, y, width, height, radius) {
  if (height <= 0) return '';
  const r = Math.min(radius, width / 2, height);
  return [
    `M ${x} ${y + height}`,
    `L ${x} ${y + r}`,
    `Q ${x} ${y} ${x + r} ${y}`,
    `L ${x + width - r} ${y}`,
    `Q ${x + width} ${y} ${x + width} ${y + r}`,
    `L ${x + width} ${y + height}`,
    'Z',
  ].join(' ');
}

function BugsWeeklyChart({ data }) {
  const [hovered, setHovered] = useState(null);

  const hasActivity = data && data.some((week) => week.opened > 0 || week.closed > 0);
  const maxValue = niceMax(Math.max(1, ...(data || []).flatMap((w) => [w.opened, w.closed])));
  const bandWidth = data && data.length ? PLOT_WIDTH / data.length : 0;
  const groupWidth = Math.min(bandWidth - 12, BAR_MAX_WIDTH * 2 + BAR_GAP);
  const barWidth = Math.min(BAR_MAX_WIDTH, (groupWidth - BAR_GAP) / 2);
  const baselineY = MARGIN.top + PLOT_HEIGHT;

  const gridLines = [0, Math.round(maxValue / 2), maxValue];

  return (
    <div className="chart-wrap">
      <div className="chart-legend">
        {SERIES.map((series) => (
          <span key={series.key} className="chart-legend-item">
            <span className="chart-legend-swatch" style={{ background: series.color }} />
            {series.label}
          </span>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label="Bugs opened versus closed per week"
        className="chart-svg"
      >
        {gridLines.map((value) => {
          const y = MARGIN.top + PLOT_HEIGHT * (1 - value / maxValue);
          return (
            <g key={value}>
              <line x1={MARGIN.left} y1={y} x2={WIDTH - MARGIN.right} y2={y} className="chart-gridline" />
              <text x={MARGIN.left - 8} y={y} className="chart-axis-label" textAnchor="end" dominantBaseline="middle">
                {value}
              </text>
            </g>
          );
        })}

        {!hasActivity && (
          <text x={WIDTH / 2} y={MARGIN.top + PLOT_HEIGHT / 2} textAnchor="middle" className="chart-empty-overlay">
            No bug activity in the last 8 weeks.
          </text>
        )}

        {(data || []).map((week, weekIndex) => {
          const bandCenter = MARGIN.left + bandWidth * weekIndex + bandWidth / 2;
          const groupStart = bandCenter - groupWidth / 2;

          return (
            <g key={week.week_start}>
              {SERIES.map((series, seriesIndex) => {
                const value = week[series.key];
                const height = (value / maxValue) * PLOT_HEIGHT;
                const x = groupStart + seriesIndex * (barWidth + BAR_GAP);
                const y = baselineY - height;
                const key = `${weekIndex}-${series.key}`;
                const isHovered = hovered === key;

                return (
                  <path
                    key={series.key}
                    d={roundedTopRectPath(x, y, barWidth, height, RADIUS)}
                    fill={series.color}
                    opacity={isHovered ? 1 : 0.9}
                    stroke={isHovered ? series.color : 'none'}
                    strokeWidth={isHovered ? 1 : 0}
                    tabIndex={0}
                    role="img"
                    aria-label={`Week of ${shortDate(week.week_start)}, ${series.label}: ${value}`}
                    onMouseEnter={() => setHovered(key)}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setHovered(key)}
                    onBlur={() => setHovered(null)}
                    style={{ cursor: 'pointer' }}
                  />
                );
              })}
              <text x={bandCenter} y={HEIGHT - 8} textAnchor="middle" className="chart-axis-label">
                {shortDate(week.week_start)}
              </text>
            </g>
          );
        })}
      </svg>

      {hovered !== null &&
        (() => {
          const [weekIndexStr, seriesKey] = hovered.split('-');
          const weekIndex = Number(weekIndexStr);
          const week = data[weekIndex];
          const series = SERIES.find((s) => s.key === seriesKey);
          const bandCenter = MARGIN.left + bandWidth * weekIndex + bandWidth / 2;
          const value = week[series.key];
          const height = (value / maxValue) * PLOT_HEIGHT;
          const y = baselineY - height;
          return (
            <div
              className="chart-tooltip"
              style={{ left: `${(bandCenter / WIDTH) * 100}%`, top: `${(y / HEIGHT) * 100}%` }}
            >
              <strong>
                {value} {series.label.toLowerCase()}
              </strong>
              <span>Week of {shortDate(week.week_start)}</span>
            </div>
          );
        })()}
    </div>
  );
}

export default BugsWeeklyChart;
