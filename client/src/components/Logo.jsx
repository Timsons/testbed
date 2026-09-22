function Logo({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="Testbed logo" style={{ flexShrink: 0 }}>
      <rect x="2" y="2" width="28" height="28" fill="var(--accent-bg)" stroke="#000" strokeWidth="3" />
      <text
        x="16"
        y="22"
        textAnchor="middle"
        fontFamily="Lato, sans-serif"
        fontWeight="900"
        fontSize="14"
        fill="var(--accent-text)"
      >
        TB
      </text>
    </svg>
  );
}

export default Logo;
