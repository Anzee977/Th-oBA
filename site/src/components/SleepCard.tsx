type SleepSummary = {
  totalMinutes: number;
  deepMinutes: number;
  lightMinutes: number;
  remMinutes: number;
  awakeMinutes: number;
  score: number | null;
  restingHr: number | null;
  avgHrv: number | null;
};

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${m.toString().padStart(2, "0")}`;
}

export default function SleepCard({ sleep }: { sleep: SleepSummary | null }) {
  if (!sleep) {
    return <p className="muted">Aucune donnée de sommeil disponible pour cette nuit.</p>;
  }

  const stages = [
    { label: "Profond", minutes: sleep.deepMinutes, color: "var(--accent-2)" },
    { label: "Léger", minutes: sleep.lightMinutes, color: "var(--accent)" },
    { label: "Paradoxal", minutes: sleep.remMinutes, color: "var(--info)" },
    { label: "Éveil", minutes: sleep.awakeMinutes, color: "var(--danger)" },
  ].filter((s) => s.minutes > 0);

  const total = stages.reduce((sum, s) => sum + s.minutes, 0) || 1;

  return (
    <div>
      <div className="chart-stats">
        <span>
          <strong>{formatDuration(sleep.totalMinutes)}</strong> <span className="muted">de sommeil</span>
        </span>
        {sleep.score != null && <span className="badge">Score {sleep.score}</span>}
      </div>

      {stages.length > 0 && (
        <>
          <div className="sleep-bar">
            {stages.map((s) => (
              <div
                key={s.label}
                className="sleep-bar-segment"
                style={{ width: `${(s.minutes / total) * 100}%`, background: s.color }}
                title={`${s.label} : ${formatDuration(s.minutes)}`}
              />
            ))}
          </div>
          <div className="sleep-legend">
            {stages.map((s) => (
              <span key={s.label} className="muted">
                <span className="legend-dot" style={{ background: s.color }} />
                {s.label} {formatDuration(s.minutes)}
              </span>
            ))}
          </div>
        </>
      )}

      {(sleep.restingHr != null || sleep.avgHrv != null) && (
        <div className="sleep-legend" style={{ marginTop: 10 }}>
          {sleep.restingHr != null && (
            <span className="muted">FC repos : {sleep.restingHr} bpm</span>
          )}
          {sleep.avgHrv != null && <span className="muted">VFC : {sleep.avgHrv} ms</span>}
        </div>
      )}
    </div>
  );
}
