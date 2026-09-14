import NetWorthView from "@/components/NetWorthView";
import { isHealthDbEnabled, listAllNetworthTransactions, listNetworthAssets } from "@/lib/healthDb";
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

  const [assets, transactions] = await Promise.all([
    listNetworthAssets(),
    listAllNetworthTransactions(),
  ]);
  const valuations = await computeValuations(assets);
  const assetsView = assets.map((a) => ({
    ...a,
    ...(valuations.get(a.id) ?? { unitPriceEur: null, valueEur: null, priced: false }),
  }));

  return (
    <div>
      <h1>Net Worth</h1>
      <p className="muted">
        Crypto, actions/ETF (Trade Fi) et liquidités. Prix en direct quand un identifiant est
        configuré — CoinGecko pour les cryptos, Yahoo Finance pour les actions — converti en EUR
        automatiquement.
      </p>

      <div style={{ marginTop: 20 }}>
        <NetWorthView initialAssets={assetsView} initialTransactions={transactions} />
      </div>
    </div>
  );
}
