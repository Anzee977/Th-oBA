import NetWorthView from "@/components/NetWorthView";
import {
  isHealthDbEnabled,
  listAllNetworthTransactions,
  listNetworthContainers,
  listNetworthHoldings,
} from "@/lib/healthDb";
import { computeValuations } from "@/lib/networth";

export const dynamic = "force-dynamic";

export default async function NetWorthPage() {
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

  const [containers, holdings, transactions] = await Promise.all([
    listNetworthContainers(),
    listNetworthHoldings(),
    listAllNetworthTransactions(),
  ]);

  const containerCategory = new Map(containers.map((c) => [c.id, c.category]));
  const valuations = await computeValuations(
    holdings.map((h) => ({
      id: h.id,
      category: containerCategory.get(h.containerId) ?? "cash",
      symbol: h.symbol,
      currency: h.currency,
      quantity: h.quantity,
    })),
  );
  const holdingsView = holdings.map((h) => ({
    ...h,
    ...(valuations.get(h.id) ?? { unitPriceEur: null, valueEur: null, priced: false }),
  }));

  return (
    <div>
      <h1>Net Worth</h1>
      <p className="muted">
        Crypto, actions/ETF (Trade Fi) et liquidités. Dans chaque catégorie, crée une
        sous-catégorie (ex. Ledger, Trade Republic, BNP) puis ajoute ce que tu possèdes dedans.
        Prix en direct quand un identifiant est configuré — CoinGecko pour les cryptos, Yahoo
        Finance pour les actions — converti en EUR automatiquement.
      </p>

      <div style={{ marginTop: 20 }}>
        <NetWorthView
          initialContainers={containers}
          initialHoldings={holdingsView}
          initialTransactions={transactions}
        />
      </div>
    </div>
  );
}
