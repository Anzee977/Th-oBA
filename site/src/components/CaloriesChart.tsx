type CaloriesDay = { date: string; totalKcal: number };

const DAY_LABELS = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];

export default function CaloriesChart({ days }: { days: CaloriesDay[] }) {
  if (days.length === 0 || days.every((d) => d.totalKcal === 0)) {
    return <p className="muted">Aucune donnée de calories disponible.</p>;
  }

  const max = Math.max(1, ...days.map((d) => d.totalKcal));
  const width = 320;
  const height = 120;
  const barGap = 8;
  const barWidth = (width - barGap * (days.length - 1)) / days.length;
  const gradientId = "calories-bar-gradient";

  return (
    <svg
      viewBox={`0 0 ${width} ${height + 20}`}
      className="chart-svg"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--warning)" stopOpacity="0.7" />
          <stop offset="100%" stopColor="var(--warning)" />
        </linearGradient>
      </defs>
      {days.map((d, i) => {
        const isLast = i === days.length - 1;
        const barHeight = Math.max(3, (d.totalKcal / max) * height);
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
              style={{ fill: isLast ? "var(--warning)" : "var(--text-faint)" }}
            >
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
