import NetWorthCategoryView from "@/components/NetWorthCategoryView";
import { isHealthDbEnabled } from "@/lib/healthDb";
import { getNetworthCategoryData } from "@/lib/networth";

export const dynamic = "force-dynamic";

export default async function NetWorthTradFiPage() {
  if (!isHealthDbEnabled()) {
    return (
      <div>
        <h1>Trade Fi</h1>
        <p className="muted">
          Nécessite la base de données santé (variables <code>HEALTH_DB_*</code> dans{" "}
          <code>site/.env</code>).
        </p>
      </div>
    );
  }

  const { containers, holdings, transactions } = await getNetworthCategoryData("tradfi");

  return (
    <div>
      <h1>Trade Fi</h1>
      <p className="muted">
        Une sous-catégorie par courtier/broker (ex. Trade Republic, DEGIRO), puis les actions/ETF
        détenus dedans. Prix en direct via Yahoo Finance quand un ticker est renseigné.
      </p>
      <div style={{ marginTop: 20 }}>
        <NetWorthCategoryView
          category="tradfi"
          initialContainers={containers}
          initialHoldings={holdings}
          initialTransactions={transactions}
        />
      </div>
    </div>
  );
}
