import type { CorrelationDayRow } from "@/lib/healthDb";
import { alcoholLevelLabel, AlcoholLevel, mealSizeLabel, MealSize } from "@/lib/nutrition";

const SUPPLEMENT_LABELS: Record<string, string> = {
  whey: "Whey",
  creatine: "Créatine",
  melatonine: "Mélatonine",
};

function formatSleep(minutes: number | null): string {
  if (minutes == null) return "—";
  return `${Math.floor(minutes / 60)}h${String(Math.round(minutes % 60)).padStart(2, "0")}`;
}

function formatDate(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export default function CorrelationTable({ data }: { data: CorrelationDayRow[] }) {
  const sorted = [...data].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div>
      <div className="card-header">
        <h2>Vue chronologique</h2>
      </div>
      <div className="correlation-table-wrap">
        <table className="correlation-table">
          <thead>
            <tr>
              <th>Jour</th>
              <th>Compléments</th>
              <th>Café</th>
              <th>Repas</th>
              <th>Alcool</th>
              <th>Sommeil</th>
              <th>BB chargée</th>
              <th>FC repos</th>
              <th>Pas</th>
              <th>Kcal</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((d) => (
              <tr key={d.date}>
                <td>{formatDate(d.date)}</td>
                <td>
                  {d.supplements.length
                    ? d.supplements.map((s) => SUPPLEMENT_LABELS[s] ?? s).join(", ")
                    : "—"}
                </td>
                <td>{d.coffeeCount || "—"}</td>
                <td>
                  {d.mealSizes.length
                    ? d.mealSizes.map((s) => mealSizeLabel(s as MealSize)).join(", ")
                    : "—"}
                </td>
                <td>
                  {d.alcoholLevels.length
                    ? d.alcoholLevels.map((a) => alcoholLevelLabel(a as AlcoholLevel)).join(", ")
                    : "—"}
                </td>
                <td>{formatSleep(d.sleepTotalMinutes)}</td>
                <td>{d.bodyBatteryCharged ?? "—"}</td>
                <td>{d.restingHr ?? "—"}</td>
                <td>{d.steps ?? "—"}</td>
                <td>{d.caloriesTotal ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
