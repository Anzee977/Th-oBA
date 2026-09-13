type StepsDay = { date: string; steps: number };

const DAY_LABELS = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];

export default function StepsChart({ days }: { days: StepsDay[] }) {
  if (days.length === 0) {
    return <p className="muted">Aucune donnée de pas disponible.</p>;
  }

  const max = Math.max(1, ...days.map((d) => d.steps));
  const width = 320;
  const height = 120;
  const barGap = 8;
  const barWidth = (width - barGap * (days.length - 1)) / days.length;
  const gradientId = "steps-bar-gradient";

  return (
    <svg
      viewBox={`0 0 ${width} ${height + 20}`}
      className="chart-svg"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent-2)" />
          <stop offset="100%" stopColor="var(--accent)" />
        </linearGradient>
      </defs>
      {days.map((d, i) => {
        const isLast = i === days.length - 1;
        const barHeight = Math.max(3, (d.steps / max) * height);
        const x = i * (barWidth + barGap);
        const y = height - barHeight;
        const label = DAY_LABELS[new Date(`${d.date}T12:00:00`).getDay()];
        return (
          <g key={d.date}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={5}
              style={{ fill: isLast ? `url(#${gradientId})` : "var(--bg-hover)" }}
            />
            <text
              x={x + barWidth / 2}
              y={height + 14}
              textAnchor="middle"
              className="chart-label"
              style={{ fill: isLast ? "var(--accent-strong)" : "var(--text-faint)" }}
            >
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
