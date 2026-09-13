import { MAX_DOSES_PER_DAY, SUPPLEMENTS } from "@/lib/supplements";

type HistoryRow = { date: string; supplement: string; count: number };

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

export default function SupplementHistoryGrid({
  history,
  days,
}: {
  history: HistoryRow[];
  days: number;
}) {
  const dates = buildDateList(days);
  const counts = new Map<string, number>();
  for (const row of history) {
    counts.set(`${row.supplement}|${row.date}`, row.count);
  }

  return (
    <div className="card supplement-history-card">
      <div className="card-header">
        <h3>Historique ({days} derniers jours)</h3>
      </div>
      <div className="supplement-history">
        {SUPPLEMENTS.map((s) => (
          <div key={s.id} className="supplement-history-row">
            <span className="supplement-history-label">{s.label}</span>
            <div className="supplement-history-cells">
              {dates.map((date) => {
                const count = counts.get(`${s.id}|${date}`) ?? 0;
                const level = Math.min(count, MAX_DOSES_PER_DAY);
                return (
                  <span
                    key={date}
                    className={`supplement-cell level-${level}`}
                    title={`${date} — ${count}/${MAX_DOSES_PER_DAY}`}
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
