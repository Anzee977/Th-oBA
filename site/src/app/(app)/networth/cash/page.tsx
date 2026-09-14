import NetWorthCategoryView from "@/components/NetWorthCategoryView";
import { isHealthDbEnabled } from "@/lib/healthDb";
import { getNetworthCategoryData } from "@/lib/networth";

export const dynamic = "force-dynamic";

export default async function NetWorthCashPage() {
  if (!isHealthDbEnabled()) {
    return (
      <div>
        <h1>Cash</h1>
        <p className="muted">
          Nécessite la base de données santé (variables <code>HEALTH_DB_*</code> dans{" "}
          <code>site/.env</code>).
        </p>
      </div>
    );
  }

  const { containers, holdings, transactions } = await getNetworthCategoryData("cash");

  return (
    <div>
      <h1>Cash</h1>
      <p className="muted">
        Une sous-catégorie par compte/banque (ex. BNP, Revolut), puis les montants détenus dedans
        (une possession par devise si besoin).
      </p>
      <div style={{ marginTop: 20 }}>
        <NetWorthCategoryView
          category="cash"
          initialContainers={containers}
          initialHoldings={holdings}
          initialTransactions={transactions}
        />
      </div>
    </div>
  );
}
