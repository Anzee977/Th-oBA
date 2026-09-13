type WeightPoint = { date: string; weightKg: number };

export default function WeightChart({ points }: { points: WeightPoint[] }) {
  if (points.length < 2) {
    return (
      <p className="muted">
        {points.length === 0
          ? "Aucune pesée enregistrée."
          : "Encore une seule pesée — la courbe apparaîtra avec la prochaine."}
      </p>
    );
  }

  const width = 320;
  const height = 120;
  const weights = points.map((p) => p.weightKg);
  const rangeMin = Math.min(...weights);
  const rangeMax = Math.max(...weights);
  const pad = Math.max(0.3, (rangeMax - rangeMin) * 0.2);
  const paddedMin = rangeMin - pad;
  const rangeSpan = Math.max(0.1, rangeMax - paddedMin + pad);
  const gradientId = "weight-gradient";

  const coords = points.map((p, i) => ({
    x: (i / (points.length - 1)) * width,
    y: height - ((p.weightKg - paddedMin) / rangeSpan) * height,
  }));

  const linePath = `M ${coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" L ")}`;
  const areaPath = `${linePath} L ${width},${height} L 0,${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--info)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--info)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} style={{ fill: `url(#${gradientId})` }} />
      <path d={linePath} style={{ fill: "none", stroke: "var(--info)", strokeWidth: 2 }} />
      {coords.map((c, i) => (
        <circle key={points[i].date + i} cx={c.x} cy={c.y} r={3} style={{ fill: "var(--info)" }} />
      ))}
    </svg>
  );
}
