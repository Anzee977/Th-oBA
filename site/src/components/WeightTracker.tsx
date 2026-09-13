"use client";

import { useState } from "react";
import WeightChart from "./WeightChart";
import { ScaleIcon, TrashIcon } from "./icons";

type WeightLog = { id: number; weightKg: number; date: string; loggedAt: string };

function formatDateTime(date: string, loggedAt: string): string {
  const d = new Date(`${date}T12:00:00`);
  const time = String(loggedAt).slice(11, 16);
  return `${d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} · ${time}`;
}

export default function WeightTracker({ initialLogs }: { initialLogs: WeightLog[] }) {
  const [logs, setLogs] = useState<WeightLog[]>(initialLogs);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const latest = logs[logs.length - 1];
  const previous = logs[logs.length - 2];
  const trend = latest && previous ? Math.round((latest.weightKg - previous.weightKg) * 10) / 10 : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const weightKg = Number(value);
    if (!weightKg || weightKg <= 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sante/poids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weightKg }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Échec.");
      setLogs((prev) => [...prev, data.log]);
      setValue("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: number) {
    setLogs((prev) => prev.filter((l) => l.id !== id));
    try {
      await fetch(`/api/sante/poids/${id}`, { method: "DELETE" });
    } catch {
      // best-effort ; un rechargement de page corrigera l'état si l'appel a échoué
    }
  }

  const recent = [...logs].reverse().slice(0, 6);

  return (
    <section className="card">
      <div className="card-header">
        <span className="stat-icon info">
          <ScaleIcon size={16} />
        </span>
        <h2>Poids</h2>
      </div>

      {latest ? (
        <p className="chart-highlight">
          {latest.weightKg} <span className="muted">kg</span>
          {trend != null && trend !== 0 && (
            <span className={`muted`} style={{ fontSize: 14, marginLeft: 8 }}>
              {trend > 0 ? "+" : ""}
              {trend} kg
            </span>
          )}
        </p>
      ) : (
        <p className="muted" style={{ marginTop: -6, marginBottom: 12 }}>
          Note ton poids dès que tu te pèses pour suivre l&apos;évolution.
        </p>
      )}

      <form onSubmit={handleSubmit} className="weight-form">
        <input
          type="number"
          step="0.1"
          min="1"
          max="500"
          placeholder="Poids (kg)"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button type="submit" className="btn" disabled={loading || !value}>
          Enregistrer
        </button>
      </form>
      {error && <p className="error">{error}</p>}

      <div style={{ marginTop: 12 }}>
        <WeightChart points={logs.map((l) => ({ date: l.date, weightKg: l.weightKg }))} />
      </div>

      {recent.length > 0 && (
        <ul className="activity-list" style={{ marginTop: 12 }}>
          {recent.map((l) => (
            <li key={l.id} className="activity-row">
              <span className="muted">{formatDateTime(l.date, l.loggedAt)}</span>
              <div className="entry-meta">
                <span>{l.weightKg} kg</span>
                <button
                  type="button"
                  className="icon-btn danger"
                  onClick={() => remove(l.id)}
                  aria-label="Supprimer"
                >
                  <TrashIcon size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
