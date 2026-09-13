import { getCorrelationData, isHealthDbEnabled } from "@/lib/healthDb";
import { computeFactorStats, FACTORS } from "@/lib/correlation";
import CorrelationComparator from "@/components/CorrelationComparator";
import CorrelationTable from "@/components/CorrelationTable";

export const dynamic = "force-dynamic";

const DAYS = 30;

export default async function AnalysePage() {
  if (!isHealthDbEnabled()) {
    return (
      <div>
        <h1>Analyse</h1>
        <p className="muted">
          L&apos;analyse nécessite la base de données santé (variables HEALTH_DB_* dans site/.env).
        </p>
      </div>
    );
  }

  const data = await getCorrelationData(DAYS);
  const stats = Object.fromEntries(FACTORS.map((f) => [f.id, computeFactorStats(data, f.test)]));

  return (
    <div>
      <h1>Analyse</h1>
      <p className="muted">
        Compare tes compléments/café/repas avec tes données de santé, sur les {DAYS} derniers
        jours.
      </p>

      <div className="card" style={{ marginTop: 20 }}>
        <CorrelationComparator stats={stats} />
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <CorrelationTable data={data} />
      </div>
    </div>
  );
}
