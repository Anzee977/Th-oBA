import NetWorthCategoryView from "@/components/NetWorthCategoryView";
import { isHealthDbEnabled } from "@/lib/healthDb";
import { getNetworthCategoryData } from "@/lib/networth";

export const dynamic = "force-dynamic";

export default async function NetWorthCryptoPage() {
  if (!isHealthDbEnabled()) {
    return (
      <div>
        <h1>Crypto</h1>
        <p className="muted">
          Nécessite la base de données santé (variables <code>HEALTH_DB_*</code> dans{" "}
          <code>site/.env</code>).
        </p>
      </div>
    );
  }

  const { containers, holdings, transactions } = await getNetworthCategoryData("crypto");

  return (
    <div>
      <h1>Crypto</h1>
      <p className="muted">
        Une sous-catégorie par endroit où tu détiens de la crypto (ex. Ledger, Binance), puis les
        possessions dedans. Prix en direct via CoinGecko quand un identifiant est renseigné.
      </p>
      <div style={{ marginTop: 20 }}>
        <NetWorthCategoryView
          category="crypto"
          initialContainers={containers}
          initialHoldings={holdings}
          initialTransactions={transactions}
        />
      </div>
    </div>
  );
}
