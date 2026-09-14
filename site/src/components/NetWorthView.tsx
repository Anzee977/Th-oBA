"use client";

import { useState } from "react";
import { BanknoteIcon, PlusIcon, TrendingUpIcon, WalletIcon, ZapIcon } from "./icons";
import NetWorthAssetCard, { AssetView, NetworthCategory, TransactionView } from "./NetWorthAssetCard";

const CATEGORY_META: Record<
  NetworthCategory,
  { label: string; icon: React.ReactNode; statClass: string; symbolLabel: string | null; symbolPlaceholder: string; symbolHint: string }
> = {
  crypto: {
    label: "Crypto",
    icon: <ZapIcon size={16} />,
    statClass: "warning",
    symbolLabel: "Identifiant CoinGecko (optionnel)",
    symbolPlaceholder: "ex : solana, bitcoin",
    symbolHint: "Cherche la crypto sur coingecko.com — l'identifiant est dans l'URL de sa page.",
  },
  tradfi: {
    label: "Trade Fi",
    icon: <TrendingUpIcon size={16} />,
    statClass: "info",
    symbolLabel: "Ticker (optionnel)",
    symbolPlaceholder: "ex : KO, AAPL, MC.PA",
    symbolHint: "Symbole boursier Yahoo Finance (ajoute le suffixe d'échange hors USA, ex. .PA pour Paris).",
  },
  cash: {
    label: "Cash",
    icon: <BanknoteIcon size={16} />,
    statClass: "success",
    symbolLabel: null,
    symbolPlaceholder: "",
    symbolHint: "",
  },
};

const CURRENCIES = ["EUR", "USD", "GBP", "CHF"];

function formatEur(value: number): string {
  return value.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
}

function NewAssetForm({
  category,
  onCreated,
}: {
  category: NetworthCategory;
  onCreated: (asset: AssetView) => void;
}) {
  const meta = CATEGORY_META[category];
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/networth/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          name,
          symbol: category === "cash" ? null : symbol,
          currency: category === "cash" ? currency : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Échec.");
      onCreated({ ...data.asset, quantity: 0, unitPriceEur: null, valueEur: null, priced: false });
      setName("");
      setSymbol("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 14 }}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-start" }}>
        <input
          type="text"
          placeholder="Nom de la sous-catégorie"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ width: 180 }}
        />
        {meta.symbolLabel ? (
          <input
            type="text"
            placeholder={meta.symbolPlaceholder}
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            style={{ width: 180 }}
          />
        ) : (
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
        <button type="submit" className="btn-secondary" disabled={loading || !name.trim()}>
          <PlusIcon size={14} /> Ajouter
        </button>
      </form>
      {meta.symbolHint && (
        <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
          {meta.symbolHint}
        </p>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}

export default function NetWorthView({
  initialAssets,
  initialTransactions,
}: {
  initialAssets: AssetView[];
  initialTransactions: TransactionView[];
}) {
  const [assets, setAssets] = useState<AssetView[]>(initialAssets);
  const [transactions, setTransactions] = useState<TransactionView[]>(initialTransactions);

  function addAsset(asset: AssetView) {
    setAssets((prev) => [...prev, asset]);
  }

  function removeAsset(id: number) {
    setAssets((prev) => prev.filter((a) => a.id !== id));
    setTransactions((prev) => prev.filter((t) => t.assetId !== id));
  }

  function addTransaction(tx: TransactionView) {
    setTransactions((prev) => [tx, ...prev]);
    setAssets((prev) =>
      prev.map((a) => (a.id === tx.assetId ? { ...a, quantity: a.quantity + tx.quantity } : a)),
    );
  }

  function removeTransaction(txId: number) {
    const tx = transactions.find((t) => t.id === txId);
    setTransactions((prev) => prev.filter((t) => t.id !== txId));
    if (tx) {
      setAssets((prev) =>
        prev.map((a) => (a.id === tx.assetId ? { ...a, quantity: a.quantity - tx.quantity } : a)),
      );
    }
  }

  const grandTotal = assets.reduce((sum, a) => sum + (a.priced && a.valueEur != null ? a.valueEur : 0), 0);
  const hasUnpriced = assets.some((a) => !a.priced);

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <span className="stat-icon accent">
            <WalletIcon size={16} />
          </span>
          <h2>Total</h2>
        </div>
        <p className="chart-highlight">{formatEur(grandTotal)}</p>
        {hasUnpriced && (
          <p className="muted" style={{ marginTop: -10 }}>
            Certaines sous-catégories sans prix en direct ne sont pas comptées dans ce total.
          </p>
        )}
      </div>

      {(Object.keys(CATEGORY_META) as NetworthCategory[]).map((category) => {
        const meta = CATEGORY_META[category];
        const categoryAssets = assets.filter((a) => a.category === category);
        const categoryTotal = categoryAssets.reduce(
          (sum, a) => sum + (a.priced && a.valueEur != null ? a.valueEur : 0),
          0,
        );

        return (
          <div key={category} className="card" style={{ marginTop: 16 }}>
            <div className="card-header">
              <span className={`stat-icon ${meta.statClass}`}>{meta.icon}</span>
              <h2>{meta.label}</h2>
              <span className="badge" style={{ marginLeft: "auto" }}>
                {formatEur(categoryTotal)}
              </span>
            </div>

            {categoryAssets.length === 0 ? (
              <p className="muted">Aucune sous-catégorie pour l&apos;instant.</p>
            ) : (
              <ul className="activity-list">
                {categoryAssets.map((asset) => (
                  <NetWorthAssetCard
                    key={asset.id}
                    asset={asset}
                    transactions={transactions.filter((t) => t.assetId === asset.id)}
                    onAddTransaction={addTransaction}
                    onDeleteTransaction={removeTransaction}
                    onDeleteAsset={async () => {
                      removeAsset(asset.id);
                      await fetch(`/api/networth/assets/${asset.id}`, { method: "DELETE" });
                    }}
                  />
                ))}
              </ul>
            )}

            <NewAssetForm category={category} onCreated={addAsset} />
          </div>
        );
      })}
    </div>
  );
}
