export type NetworthHistoryPoint = { date: string; totalEur: number };

export default function NetWorthHistoryChart({ points }: { points: NetworthHistoryPoint[] }) {
  if (points.length < 2) {
    return (
      <p className="muted">
        {points.length === 0
          ? "Pas encore d'historique — reviens dans quelques jours pour voir la courbe."
          : "Encore un seul point pour l'instant — la courbe apparaîtra dès demain."}
      </p>
    );
  }

  const width = 320;
  const height = 120;
  const values = points.map((p) => p.totalEur);
  const rangeMin = Math.min(...values);
  const rangeMax = Math.max(...values);
  const pad = Math.max(1, (rangeMax - rangeMin) * 0.15);
  const paddedMin = rangeMin - pad;
  const rangeSpan = Math.max(1, rangeMax - paddedMin + pad);
  const gradientId = "networth-history-gradient";

  const coords = points.map((p, i) => ({
    x: (i / (points.length - 1)) * width,
    y: height - ((p.totalEur - paddedMin) / rangeSpan) * height,
  }));

  const linePath = `M ${coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" L ")}`;
  const areaPath = `${linePath} L ${width},${height} L 0,${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} style={{ fill: `url(#${gradientId})` }} />
      <path d={linePath} style={{ fill: "none", stroke: "var(--accent)", strokeWidth: 2 }} />
      {coords.map((c, i) => (
        <circle key={points[i].date} cx={c.x} cy={c.y} r={3} style={{ fill: "var(--accent)" }} />
      ))}
    </svg>
  );
}
