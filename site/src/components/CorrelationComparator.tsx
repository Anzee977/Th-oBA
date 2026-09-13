"use client";

import { useState } from "react";
import { FACTORS, FactorAverages, FactorStats } from "@/lib/correlation";

const ROWS: { key: keyof FactorAverages; label: string; format: (v: number | null) => string }[] = [
  {
    key: "sleepMinutes",
    label: "Sommeil",
    format: (v) => (v == null ? "—" : `${Math.floor(v / 60)}h${String(Math.round(v % 60)).padStart(2, "0")}`),
  },
  { key: "sleepScore", label: "Score sommeil", format: (v) => (v == null ? "—" : `${v}`) },
  { key: "bodyBatteryCharged", label: "Body Battery chargée", format: (v) => (v == null ? "—" : `${v}`) },
  { key: "bodyBatteryMin", label: "Body Battery min", format: (v) => (v == null ? "—" : `${v}`) },
  { key: "restingHr", label: "FC repos", format: (v) => (v == null ? "—" : `${v} bpm`) },
];

export default function CorrelationComparator({ stats }: { stats: Record<string, FactorStats> }) {
  const [factorId, setFactorId] = useState(FACTORS[0].id);
  const factor = FACTORS.find((f) => f.id === factorId)!;
  const s = stats[factorId];

  return (
    <div>
      <div className="card-header">
        <h2>Comparateur</h2>
      </div>
      <select value={factorId} onChange={(e) => setFactorId(e.target.value)} className="correlation-select">
        {FACTORS.map((f) => (
          <option key={f.id} value={f.id}>
            {f.label}
          </option>
        ))}
      </select>

      {s.withCount === 0 && s.withoutCount === 0 ? (
        <p className="muted" style={{ marginTop: 12 }}>
          Pas encore assez de données synchronisées pour comparer.
        </p>
      ) : (
        <div className="correlation-compare">
          <div className="correlation-col">
            <h4>
              Jours avec {factor.label.toLowerCase()} <span className="muted">({s.withCount}j)</span>
            </h4>
            <ul>
              {ROWS.map((r) => (
                <li key={r.key}>
                  <span className="muted">{r.label}</span>
                  <strong>{r.format(s.withAvg[r.key])}</strong>
                </li>
              ))}
            </ul>
          </div>
          <div className="correlation-col">
            <h4>
              Jours sans <span className="muted">({s.withoutCount}j)</span>
            </h4>
            <ul>
              {ROWS.map((r) => (
                <li key={r.key}>
                  <span className="muted">{r.label}</span>
                  <strong>{r.format(s.withoutAvg[r.key])}</strong>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
