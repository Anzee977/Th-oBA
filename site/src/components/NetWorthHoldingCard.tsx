"use client";

import { useState } from "react";
import { ChevronRightIcon, TrashIcon } from "./icons";
import ConfirmDeleteButton from "./ConfirmDeleteButton";

export type NetworthCategory = "crypto" | "tradfi" | "cash";

export type HoldingView = {
  id: number;
  containerId: number;
  name: string;
  symbol: string | null;
  currency: string;
  quantity: number;
  unitPriceEur: number | null;
  valueEur: number | null;
  priced: boolean;
};

export type TransactionView = {
  id: number;
  holdingId: number;
  quantity: number;
  date: string;
  note: string | null;
};

const MOVE_LABELS: Record<NetworthCategory, { in: string; out: string }> = {
  crypto: { in: "Achat", out: "Vente" },
  tradfi: { in: "Achat", out: "Vente" },
  cash: { in: "Dépôt", out: "Retrait" },
};

export function formatQuantity(qty: number): string {
  return qty.toLocaleString("fr-FR", { maximumFractionDigits: 8 });
}

export function formatEur(value: number): string {
  return value.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
}

function formatDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function NetWorthHoldingCard({
  holding,
  category,
  transactions,
  onAddTransaction,
  onDeleteTransaction,
  onDeleteHolding,
}: {
  holding: HoldingView;
  category: NetworthCategory;
  transactions: TransactionView[];
  onAddTransaction: (tx: TransactionView) => void;
  onDeleteTransaction: (txId: number) => void;
  onDeleteHolding: () => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [sign, setSign] = useState<"in" | "out">("in");
  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState(todayIso());
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const labels = MOVE_LABELS[category];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const qty = Number(quantity);
    if (!qty || qty <= 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/networth/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holdingId: holding.id,
          quantity: sign === "in" ? qty : -qty,
          date,
          note: note.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Échec.");
      onAddTransaction(data.transaction);
      setQuantity("");
      setNote("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function remove(txId: number) {
    onDeleteTransaction(txId);
    try {
      await fetch(`/api/networth/transactions/${txId}`, { method: "DELETE" });
    } catch {
      // best-effort ; un rechargement de page corrigera l'état si l'appel a échoué
    }
  }

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
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 500 }}>{holding.name}</div>
            <div className="muted" style={{ fontSize: 12.5 }}>
              {formatQuantity(holding.quantity)}
              {holding.symbol ? ` ${holding.symbol}` : ""}
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          {holding.priced && holding.valueEur != null ? (
            <div>{formatEur(holding.valueEur)}</div>
          ) : (
            <div className="muted" style={{ fontSize: 13 }}>Pas de prix en direct</div>
          )}
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 12, paddingLeft: 22 }} onClick={(e) => e.stopPropagation()}>
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}
          >
            <select value={sign} onChange={(e) => setSign(e.target.value as "in" | "out")}>
              <option value="in">{labels.in}</option>
              <option value="out">{labels.out}</option>
            </select>
            <input
              type="number"
              step="any"
              min="0"
              placeholder="Quantité"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              style={{ width: 110 }}
            />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <input
              type="text"
              placeholder="Note (optionnel)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{ width: 160 }}
            />
            <button type="submit" className="btn-secondary" disabled={loading || !quantity}>
              Ajouter
            </button>
          </form>
          {error && <p className="error">{error}</p>}

          {transactions.length > 0 ? (
            <ul className="activity-list" style={{ marginTop: 10 }}>
              {transactions.map((tx) => (
                <li key={tx.id} className="activity-row">
                  <span className="muted">
                    {formatDate(tx.date)} · {tx.quantity > 0 ? "+" : ""}
                    {formatQuantity(tx.quantity)}
                    {tx.note ? ` · ${tx.note}` : ""}
                  </span>
                  <button
                    type="button"
                    className="icon-btn danger"
                    aria-label="Supprimer"
                    onClick={() => remove(tx.id)}
                  >
                    <TrashIcon size={14} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>
              Aucun mouvement pour l&apos;instant.
            </p>
          )}

          <div style={{ marginTop: 10 }}>
            <ConfirmDeleteButton
              onConfirm={onDeleteHolding}
              label="Supprimer la possession"
              confirmText="Supprimer cette possession et tout son historique ?"
            />
          </div>
        </div>
      )}
    </li>
  );
}
