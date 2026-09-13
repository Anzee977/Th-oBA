import { getSupplementHistory, getSupplementStatusToday, isHealthDbEnabled } from "@/lib/healthDb";
import SupplementTracker from "@/components/SupplementTracker";
import SupplementHistoryGrid from "@/components/SupplementHistoryGrid";

export const dynamic = "force-dynamic";

const HISTORY_DAYS = 30;

export default async function SuiviPage() {
  if (!isHealthDbEnabled()) {
    return (
      <div>
        <h1>Suivi</h1>
        <p className="muted">
          Le suivi des compléments nécessite la base de données santé (variables HEALTH_DB_* dans
          site/.env).
        </p>
      </div>
    );
  }

  const [today, history] = await Promise.all([
    getSupplementStatusToday(),
    getSupplementHistory(HISTORY_DAYS),
  ]);

  return (
    <div>
      <h1>Suivi</h1>
      <p className="muted">
        Note tes prises de compléments au fil de la journée (3 max par jour et par complément).
      </p>

      <div style={{ marginTop: 20 }}>
        <SupplementTracker initialToday={today} />
      </div>

      <div style={{ marginTop: 24 }}>
        <SupplementHistoryGrid history={history} days={HISTORY_DAYS} />
      </div>
    </div>
  );
}
