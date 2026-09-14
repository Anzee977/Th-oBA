import { WalletIcon } from "@/components/icons";
import NetWorthBreakdownChart from "@/components/NetWorthBreakdownChart";
import NetWorthHistoryChart from "@/components/NetWorthHistoryChart";
import { getNetworthHistory, getRecentNetworthTransactions, isHealthDbEnabled } from "@/lib/healthDb";
import { getCurrentNetworthBreakdown } from "@/lib/networth";
import { NETWORTH_CATEGORY_LABELS } from "@/lib/networthCategoryMeta";

export const dynamic = "force-dynamic";

function formatEur(value: number): string {
  return value.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
}

function formatQuantity(qty: number): string {
  return qty.toLocaleString("fr-FR", { maximumFractionDigits: 8 });
}

function formatDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export default async function NetWorthDashboardPage() {
  if (!isHealthDbEnabled()) {
    return (
      <div>
        <h1>Net Worth</h1>
        <p className="muted">
          Nécessite la base de données santé (variables <code>HEALTH_DB_*</code> dans{" "}
          <code>site/.env</code>).
        </p>
      </div>
    );
  }

  const [breakdown, history, recentTransactions] = await Promise.all([
    getCurrentNetworthBreakdown(),
    getNetworthHistory(30),
    getRecentNetworthTransactions(15),
  ]);

  return (
    <div>
      <h1>Net Worth</h1>
      <p className="muted">
        Vue d&apos;ensemble de ton patrimoine. Pour ajouter ou retirer des possessions, va dans
        Crypto, Trade Fi ou Cash.
      </p>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <span className="stat-icon accent">
            <WalletIcon size={16} />
          </span>
          <h2>Total</h2>
        </div>
        <p className="chart-highlight">{formatEur(breakdown.total)}</p>
        {breakdown.hasUnpriced && (
          <p className="muted" style={{ marginTop: -10 }}>
            Certaines possessions sans prix en direct ne sont pas comptées dans ce total.
          </p>
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <h2>Répartition</h2>
        </div>
        <NetWorthBreakdownChart
          breakdown={{ crypto: breakdown.crypto, tradfi: breakdown.tradfi, cash: breakdown.cash }}
        />
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <h2>Évolution (30 derniers jours)</h2>
        </div>
        <NetWorthHistoryChart points={history.map((h) => ({ date: h.date, totalEur: h.totalEur }))} />
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <h2>Derniers mouvements</h2>
        </div>
        {recentTransactions.length === 0 ? (
          <p className="muted">Aucun mouvement pour l&apos;instant.</p>
        ) : (
          <ul className="activity-list">
            {recentTransactions.map((tx) => (
              <li key={tx.id} className="activity-row">
                <span>
                  <span className="badge" style={{ marginRight: 8 }}>
                    {NETWORTH_CATEGORY_LABELS[tx.category]}
                  </span>
                  {tx.container} · {tx.holding}
                </span>
                <span className="entry-meta">
                  <span>
                    {tx.quantity > 0 ? "+" : ""}
                    {formatQuantity(tx.quantity)}
                  </span>
                  <span className="muted">{formatDate(tx.date)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
