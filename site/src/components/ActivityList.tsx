type ActivitySummary = {
  id: number;
  name: string;
  type: string;
  startTime: string;
  durationMinutes: number;
  distanceKm: number | null;
  calories: number | null;
};

const TYPE_LABELS: Record<string, string> = {
  running: "Course à pied",
  street_running: "Course à pied",
  trail_running: "Trail",
  indoor_running: "Course (tapis)",
  cycling: "Vélo",
  indoor_cycling: "Vélo (home trainer)",
  strength_training: "Musculation",
  walking: "Marche",
  hiking: "Randonnée",
  fitness_equipment: "Fitness",
  swimming: "Natation",
  other: "Autre",
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${m} min`;
}

export default function ActivityList({ activities }: { activities: ActivitySummary[] }) {
  if (activities.length === 0) {
    return <p className="muted">Aucune activité récente.</p>;
  }

  return (
    <ul className="activity-list">
      {activities.map((a) => (
        <li key={a.id} className="activity-row">
          <div className="entry-main">
            <div className="entry-name">{a.name}</div>
            <span className="muted">
              {TYPE_LABELS[a.type] ?? a.type} · {formatDate(a.startTime)}
            </span>
          </div>
          <div className="entry-meta">
            <span className="muted">{formatDuration(a.durationMinutes)}</span>
            {a.distanceKm != null && <span className="muted">{a.distanceKm} km</span>}
            {a.calories != null && <span className="muted">{a.calories} kcal</span>}
          </div>
        </li>
      ))}
    </ul>
  );
}
