"use client";

import { useState } from "react";
import { ChevronRightIcon, PlusIcon } from "./icons";
import ConfirmDeleteButton from "./ConfirmDeleteButton";
import NetWorthHoldingCard, {
  formatEur,
  HoldingView,
  NetworthCategory,
  TransactionView,
} from "./NetWorthHoldingCard";

export type ContainerView = {
  id: number;
  category: NetworthCategory;
  name: string;
};

const CATEGORY_SYMBOL_META: Record<
  NetworthCategory,
  { symbolLabel: string | null; symbolPlaceholder: string; symbolHint: string }
> = {
  crypto: {
    symbolLabel: "Identifiant CoinGecko (optionnel)",
    symbolPlaceholder: "ex : solana, bitcoin",
    symbolHint: "Cherche la crypto sur coingecko.com — l'identifiant est dans l'URL de sa page.",
  },
  tradfi: {
    symbolLabel: "Ticker (optionnel)",
    symbolPlaceholder: "ex : KO, AAPL, MC.PA",
    symbolHint: "Symbole boursier Yahoo Finance (ajoute le suffixe d'échange hors USA, ex. .PA pour Paris).",
  },
  cash: {
    symbolLabel: null,
    symbolPlaceholder: "",
    symbolHint: "",
  },
};

const CURRENCIES = ["EUR", "USD", "GBP", "CHF"];

function NewHoldingForm({
  containerId,
  category,
  onCreated,
}: {
  containerId: number;
  category: NetworthCategory;
  onCreated: (holding: HoldingView) => void;
}) {
  const meta = CATEGORY_SYMBOL_META[category];
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
      const res = await fetch("/api/networth/holdings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          containerId,
          category,
          name,
          symbol: meta.symbolLabel ? symbol : null,
          currency: meta.symbolLabel ? undefined : currency,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Échec.");
      onCreated({ ...data.holding, quantity: 0, unitPriceEur: null, valueEur: null, priced: false });
      setName("");
      setSymbol("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 10 }}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-start" }}>
        <input
          type="text"
          placeholder="Nom de la possession"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ width: 170 }}
        />
        {meta.symbolLabel ? (
          <input
            type="text"
            placeholder={meta.symbolPlaceholder}
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            style={{ width: 170 }}
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
          <PlusIcon size={13} /> Ajouter
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

export default function NetWorthContainerCard({
  container,
  holdings,
  transactions,
  onAddHolding,
  onDeleteHolding,
  onAddTransaction,
  onDeleteTransaction,
  onDeleteContainer,
}: {
  container: ContainerView;
  holdings: HoldingView[];
  transactions: TransactionView[];
  onAddHolding: (holding: HoldingView) => void;
  onDeleteHolding: (holdingId: number) => void;
  onAddTransaction: (tx: TransactionView) => void;
  onDeleteTransaction: (txId: number) => void;
  onDeleteContainer: () => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);

  const subtotal = holdings.reduce((sum, h) => sum + (h.priced && h.valueEur != null ? h.valueEur : 0), 0);

  return (
    <li className="activity-row" style={{ flexDirection: "column", alignItems: "stretch" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          width: "100%",
          cursor: "pointer",
        }}
        onClick={() => setExpanded((v) => !v)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span style={{ transform: expanded ? "rotate(90deg)" : undefined, transition: "transform 0.15s", flexShrink: 0 }}>
            <ChevronRightIcon size={14} />
          </span>
          <div style={{ fontWeight: 500 }}>{container.name}</div>
        </div>
        <div style={{ flexShrink: 0 }}>{formatEur(subtotal)}</div>
      </div>

      {expanded && (
        <div style={{ marginTop: 12, paddingLeft: 22 }} onClick={(e) => e.stopPropagation()}>
          {holdings.length > 0 ? (
            <ul className="activity-list">
              {holdings.map((holding) => (
                <NetWorthHoldingCard
                  key={holding.id}
                  holding={holding}
                  category={container.category}
                  transactions={transactions.filter((t) => t.holdingId === holding.id)}
                  onAddTransaction={onAddTransaction}
                  onDeleteTransaction={onDeleteTransaction}
                  onDeleteHolding={async () => {
                    onDeleteHolding(holding.id);
                    await fetch(`/api/networth/holdings/${holding.id}`, { method: "DELETE" });
                  }}
                />
              ))}
            </ul>
          ) : (
            <p className="muted" style={{ fontSize: 13 }}>
              Rien dedans pour l&apos;instant.
            </p>
          )}

          <NewHoldingForm containerId={container.id} category={container.category} onCreated={onAddHolding} />

          <div style={{ marginTop: 10 }}>
            <ConfirmDeleteButton
              onConfirm={onDeleteContainer}
              label="Supprimer la sous-catégorie"
              confirmText="Supprimer cette sous-catégorie, ses possessions et tout leur historique ?"
            />
          </div>
        </div>
      )}
    </li>
  );
}
