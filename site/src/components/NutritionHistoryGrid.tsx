type HistoryRow = { date: string; category: "cafe" | "repas" | "alcool"; count: number };

const ROWS = [
  { id: "cafe" as const, label: "Café" },
  { id: "alcool" as const, label: "Alcool" },
  { id: "repas" as const, label: "Repas" },
];

function buildDateList(days: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const y = day.getFullYear();
    const m = String(day.getMonth() + 1).padStart(2, "0");
    const d = String(day.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${d}`);
  }
  return out;
}

export default function NutritionHistoryGrid({
  history,
  days,
}: {
  history: HistoryRow[];
  days: number;
}) {
  const dates = buildDateList(days);
  const counts = new Map<string, number>();
  for (const row of history) {
    counts.set(`${row.category}|${row.date}`, row.count);
  }

  return (
    <div className="card nutrition-history-card">
      <div className="card-header">
        <h3>Historique ({days} derniers jours)</h3>
      </div>
      <div className="nutrition-history">
        {ROWS.map((r) => (
          <div key={r.id} className="nutrition-history-row">
            <span className="nutrition-history-label">{r.label}</span>
            <div className="nutrition-history-cells">
              {dates.map((date) => {
                const count = counts.get(`${r.id}|${date}`) ?? 0;
                const level = Math.min(count, 3);
                return (
                  <span
                    key={date}
                    className={`nutrition-cell level-${level}`}
                    title={`${date} — ${count}`}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
