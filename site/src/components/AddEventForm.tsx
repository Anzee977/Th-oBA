"use client";

import { useState } from "react";
import { CalendarEvent, Recurrence, RECURRENCE_OPTIONS } from "@/lib/calendarEvents";
import { PlusIcon } from "./icons";

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function AddEventForm({
  defaultDate,
  onCreated,
}: {
  defaultDate: string;
  onCreated: (event: CalendarEvent) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate || todayKey());
  const [time, setTime] = useState("");
  const [recurrence, setRecurrence] = useState<Recurrence>("none");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !date) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/calendrier/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          startDate: date,
          startTime: time || null,
          recurrence,
          endDate: recurrence !== "none" && endDate ? endDate : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Échec de la création.");

      onCreated(data.event);
      setTitle("");
      setTime("");
      setRecurrence("none");
      setEndDate("");
      setOpen(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="btn-secondary" onClick={() => setOpen(true)}>
        <PlusIcon size={14} /> Ajouter un événement
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card event-form">
      <div className="event-form-row">
        <input
          type="text"
          placeholder="Titre de l'événement"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
          className="event-form-title"
        />
      </div>
      <div className="event-form-row">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        <select value={recurrence} onChange={(e) => setRecurrence(e.target.value as Recurrence)}>
          {RECURRENCE_OPTIONS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
      {recurrence !== "none" && (
        <div className="event-form-row">
          <label className="muted" style={{ fontSize: 12.5 }}>
            Fin de la récurrence (optionnel)
          </label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      )}
      <div className="event-form-row">
        <button type="submit" className="btn" disabled={loading || !title.trim()}>
          {loading ? "Création..." : "Créer"}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
        >
          Annuler
        </button>
      </div>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
