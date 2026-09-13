import { getNutritionHistory, getNutritionStatusToday, isHealthDbEnabled } from "@/lib/healthDb";
import NutritionTracker from "@/components/NutritionTracker";
import NutritionHistoryGrid from "@/components/NutritionHistoryGrid";

export const dynamic = "force-dynamic";

const HISTORY_DAYS = 30;

export default async function AlimentationPage() {
  if (!isHealthDbEnabled()) {
    return (
      <div>
        <h1>Alimentation</h1>
        <p className="muted">
          Le suivi café/alcool/repas nécessite la base de données santé (variables HEALTH_DB_*
          dans site/.env).
        </p>
      </div>
    );
  }

  const [status, history] = await Promise.all([
    getNutritionStatusToday(),
    getNutritionHistory(HISTORY_DAYS),
  ]);

  return (
    <div>
      <h1>Alimentation</h1>
      <p className="muted">Note tes cafés, ton alcool et tes repas au fil de la journée.</p>

      <div style={{ marginTop: 20 }}>
        <NutritionTracker
          initialCoffeeTimes={status.coffeeTimes}
          initialMeals={status.meals}
          initialAlcohol={status.alcohol}
        />
      </div>

      <div style={{ marginTop: 24 }}>
        <NutritionHistoryGrid history={history} days={HISTORY_DAYS} />
      </div>
    </div>
  );
}
