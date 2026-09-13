type BodyBatteryPoint = { timestamp: number; level: number };

export default function BodyBatteryChart({ points }: { points: BodyBatteryPoint[] }) {
  if (points.length === 0) {
    return <p className="muted">Aucune donnée Body Battery pour aujourd&apos;hui.</p>;
  }

  const width = 320;
  const height = 120;
  const minTs = points[0].timestamp;
  const maxTs = points[points.length - 1].timestamp;
  const spanTs = Math.max(1, maxTs - minTs);
  const gradientId = "body-battery-gradient";

  const coords = points.map((p) => {
    const x = ((p.timestamp - minTs) / spanTs) * width;
    const y = height - (p.level / 100) * height;
    return { x, y };
  });

  const linePath = `M ${coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" L ")}`;
  const areaPath = `${linePath} L ${width},${height} L 0,${height} Z`;
  const last = coords[coords.length - 1];

  const current = points[points.length - 1].level;
  const max = Math.max(...points.map((p) => p.level));
  const min = Math.min(...points.map((p) => p.level));

  return (
    <div>
      <div className="chart-stats">
        <span>
          <strong>{current}</strong> <span className="muted">actuel</span>
        </span>
        <span className="muted">
          max {max} · min {min}
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg" preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--success)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--success)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} style={{ fill: `url(#${gradientId})` }} />
        <path d={linePath} style={{ fill: "none", stroke: "var(--success)", strokeWidth: 2 }} />
        <circle cx={last.x} cy={last.y} r={4} style={{ fill: "var(--success)" }} />
      </svg>
    </div>
  );
}
