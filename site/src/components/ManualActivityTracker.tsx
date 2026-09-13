"use client";

import { useState } from "react";
import { SPORTS, Sport, sportLabel } from "@/lib/manualActivities";
import { ActivityIcon, PlusIcon, TrashIcon } from "./icons";

type ManualActivity = {
  id: number;
  sport: string;
  durationMinutes: number;
  date: string;
  estimatedCalories: number | null;
  linkedActivityId: number | null;
  linkedName: string | null;
  linkedCalories: number | null;
  linkedDistanceKm: number | null;
  linkedAvgHr: number | null;
};

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDate(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export default function ManualActivityTracker({
  initialActivities,
}: {
  initialActivities: ManualActivity[];
}) {
  const [activities, setActivities] = useState<ManualActivity[]>(initialActivities);
  const [sport, setSport] = useState<Sport>("running");
  const [duration, setDuration] = useState("");
  const [date, setDate] = useState(todayKey());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const durationMinutes = Number(duration);
    if (!durationMinutes || durationMinutes <= 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sante/activites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sport, durationMinutes, date }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Échec.");
      setActivities((prev) => [data.activity, ...prev]);
      setDuration("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: number) {
    setActivities((prev) => prev.filter((a) => a.id !== id));
    try {
      await fetch(`/api/sante/activites/${id}`, { method: "DELETE" });
    } catch {
      // best-effort ; un rechargement de page corrigera l'état si l'appel a échoué
    }
  }

  return (
    <section className="card health-activities">
      <div className="card-header">
        <span className="stat-icon info">
          <ActivityIcon size={16} />
        </span>
        <h2>Activité sportive (manuel)</h2>
      </div>
      <p className="muted" style={{ marginTop: -6, marginBottom: 12 }}>
        Pour les fois sans montre — automatiquement liée à l&apos;activité Garmin du jour si elle
        arrive, sinon calories estimées.
      </p>

      <form onSubmit={handleSubmit} className="manual-activity-form">
        <select value={sport} onChange={(e) => setSport(e.target.value as Sport)}>
          {SPORTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={1}
          max={1440}
          placeholder="Durée (min)"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="manual-activity-duration"
        />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <button type="submit" className="btn" disabled={loading || !duration}>
          <PlusIcon size={14} /> Ajouter
        </button>
      </form>
      {error && <p className="error">{error}</p>}

      {activities.length === 0 ? (
        <p className="muted" style={{ marginTop: 12 }}>
          Aucune activité manuelle notée.
        </p>
      ) : (
        <ul className="activity-list" style={{ marginTop: 12 }}>
          {activities.map((a) => (
            <li key={a.id} className="activity-row">
              <div className="entry-main">
                <div className="entry-name">
                  {sportLabel(a.sport)}
                  {a.linkedActivityId != null && (
                    <span className="badge" style={{ marginLeft: 8 }}>
                      Lié à Garmin
                    </span>
                  )}
                </div>
                <span className="muted">
                  {formatDate(a.date)} · {a.durationMinutes} min
                </span>
              </div>
              <div className="entry-meta">
                {a.linkedActivityId != null ? (
                  <>
                    {a.linkedDistanceKm != null && <span className="muted">{a.linkedDistanceKm} km</span>}
                    {a.linkedCalories != null && <span className="muted">{a.linkedCalories} kcal</span>}
                  </>
                ) : (
                  a.estimatedCalories != null && (
                    <span className="muted">~{a.estimatedCalories} kcal (estimé)</span>
                  )
                )}
                <button
                  type="button"
                  className="icon-btn danger"
                  onClick={() => remove(a.id)}
                  aria-label="Supprimer"
                >
                  <TrashIcon size={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
