"use client";

import { useState } from "react";
import { BanknoteIcon, PlusIcon, TrendingUpIcon, ZapIcon } from "./icons";
import NetWorthContainerCard, { ContainerView } from "./NetWorthContainerCard";
import { formatEur, HoldingView, NetworthCategory, TransactionView } from "./NetWorthHoldingCard";
import { NETWORTH_CATEGORY_LABELS, NETWORTH_CATEGORY_STAT_CLASS } from "@/lib/networthCategoryMeta";

const CATEGORY_ICON: Record<NetworthCategory, React.ReactNode> = {
  crypto: <ZapIcon size={16} />,
  tradfi: <TrendingUpIcon size={16} />,
  cash: <BanknoteIcon size={16} />,
};

function NewContainerForm({
  category,
  onCreated,
}: {
  category: NetworthCategory;
  onCreated: (container: ContainerView) => void;
}) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/networth/containers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Échec.");
      onCreated(data.container);
      setName("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 14 }}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <input
          type="text"
          placeholder="Nouvelle sous-catégorie (ex : Ledger, Trade Republic, BNP)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ width: 280 }}
        />
        <button type="submit" className="btn-secondary" disabled={loading || !name.trim()}>
          <PlusIcon size={14} /> Ajouter
        </button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

export default function NetWorthCategoryView({
  category,
  initialContainers,
  initialHoldings,
  initialTransactions,
}: {
  category: NetworthCategory;
  initialContainers: ContainerView[];
  initialHoldings: HoldingView[];
  initialTransactions: TransactionView[];
}) {
  const [containers, setContainers] = useState<ContainerView[]>(initialContainers);
  const [holdings, setHoldings] = useState<HoldingView[]>(initialHoldings);
  const [transactions, setTransactions] = useState<TransactionView[]>(initialTransactions);

  function addContainer(container: ContainerView) {
    setContainers((prev) => [...prev, container]);
  }

  function removeContainer(id: number) {
    const holdingIds = new Set(holdings.filter((h) => h.containerId === id).map((h) => h.id));
    setContainers((prev) => prev.filter((c) => c.id !== id));
    setHoldings((prev) => prev.filter((h) => h.containerId !== id));
    setTransactions((prev) => prev.filter((t) => !holdingIds.has(t.holdingId)));
  }

  function addHolding(holding: HoldingView) {
    setHoldings((prev) => [...prev, holding]);
  }

  function removeHolding(id: number) {
    setHoldings((prev) => prev.filter((h) => h.id !== id));
    setTransactions((prev) => prev.filter((t) => t.holdingId !== id));
  }

  function addTransaction(tx: TransactionView) {
    setTransactions((prev) => [tx, ...prev]);
    setHoldings((prev) =>
      prev.map((h) => (h.id === tx.holdingId ? { ...h, quantity: h.quantity + tx.quantity } : h)),
    );
  }

  function removeTransaction(txId: number) {
    const tx = transactions.find((t) => t.id === txId);
    setTransactions((prev) => prev.filter((t) => t.id !== txId));
    if (tx) {
      setHoldings((prev) =>
        prev.map((h) => (h.id === tx.holdingId ? { ...h, quantity: h.quantity - tx.quantity } : h)),
      );
    }
  }

  const total = holdings.reduce((sum, h) => sum + (h.priced && h.valueEur != null ? h.valueEur : 0), 0);
  const hasUnpriced = holdings.some((h) => !h.priced);

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <span className={`stat-icon ${NETWORTH_CATEGORY_STAT_CLASS[category]}`}>
            {CATEGORY_ICON[category]}
          </span>
          <h2>{NETWORTH_CATEGORY_LABELS[category]}</h2>
        </div>
        <p className="chart-highlight">{formatEur(total)}</p>
        {hasUnpriced && (
          <p className="muted" style={{ marginTop: -10 }}>
            Certaines possessions sans prix en direct ne sont pas comptées dans ce total.
          </p>
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <h2>Sous-catégories</h2>
        </div>

        {containers.length === 0 ? (
          <p className="muted">Aucune sous-catégorie pour l&apos;instant.</p>
        ) : (
          <ul className="activity-list">
            {containers.map((container) => (
              <NetWorthContainerCard
                key={container.id}
                container={container}
                holdings={holdings.filter((h) => h.containerId === container.id)}
                transactions={transactions}
                onAddHolding={addHolding}
                onDeleteHolding={removeHolding}
                onAddTransaction={addTransaction}
                onDeleteTransaction={removeTransaction}
                onDeleteContainer={async () => {
                  removeContainer(container.id);
                  await fetch(`/api/networth/containers/${container.id}`, { method: "DELETE" });
                }}
              />
            ))}
          </ul>
        )}

        <NewContainerForm category={category} onCreated={addContainer} />
      </div>
    </div>
  );
}
