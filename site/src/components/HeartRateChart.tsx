type HeartRatePoint = { timestamp: number; bpm: number };

export default function HeartRateChart({
  points,
  min,
  max,
  resting,
}: {
  points: HeartRatePoint[];
  min: number | null;
  max: number | null;
  resting: number | null;
}) {
  if (points.length === 0) {
    return <p className="muted">Aucune donnée de fréquence cardiaque pour aujourd&apos;hui.</p>;
  }

  const width = 320;
  const height = 120;
  const minTs = points[0].timestamp;
  const maxTs = points[points.length - 1].timestamp;
  const spanTs = Math.max(1, maxTs - minTs);

  const bpmValues = points.map((p) => p.bpm);
  const rangeMin = Math.min(...bpmValues);
  const rangeMax = Math.max(...bpmValues);
  const rangeSpan = Math.max(1, rangeMax - rangeMin);
  const gradientId = "heart-rate-gradient";

  const coords = points.map((p) => {
    const x = ((p.timestamp - minTs) / spanTs) * width;
    const y = height - ((p.bpm - rangeMin) / rangeSpan) * height;
    return { x, y };
  });

  const linePath = `M ${coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" L ")}`;
  const areaPath = `${linePath} L ${width},${height} L 0,${height} Z`;
  const last = coords[coords.length - 1];
  const current = points[points.length - 1].bpm;

  return (
    <div>
      <div className="chart-stats">
        <span>
          <strong>{current}</strong> <span className="muted">bpm actuel</span>
        </span>
        <span className="muted">
          {resting != null && `repos ${resting} · `}max {max ?? rangeMax} · min {min ?? rangeMin}
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg" preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--danger)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--danger)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} style={{ fill: `url(#${gradientId})` }} />
        <path d={linePath} style={{ fill: "none", stroke: "var(--danger)", strokeWidth: 2 }} />
        <circle cx={last.x} cy={last.y} r={4} style={{ fill: "var(--danger)" }} />
      </svg>
    </div>
  );
}
