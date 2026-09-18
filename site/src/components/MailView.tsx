"use client";

import { useState } from "react";
import { ArchiveIcon, CheckIcon, TrashIcon } from "./icons";

export type MailSummary = {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  unread: boolean;
};

function formatFrom(from: string): string {
  const match = from.match(/^"?([^"<]+)"?\s*<.+>$/);
  return match ? match[1].trim() : from;
}

function formatDate(date: string): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MailView({ initialMessages }: { initialMessages: MailSummary[] }) {
  const [messages, setMessages] = useState<MailSummary[]>(initialMessages);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggleRead(id: string, unread: boolean) {
    setBusyId(id);
    setError(null);
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, unread: !unread } : m)));
    try {
      const res = await fetch(`/api/mail/messages/${id}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: unread }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setError("Échec de la mise à jour.");
    } finally {
      setBusyId(null);
    }
  }

  async function archive(id: string) {
    setBusyId(id);
    setError(null);
    setMessages((prev) => prev.filter((m) => m.id !== id));
    try {
      const res = await fetch(`/api/mail/messages/${id}/archive`, { method: "POST" });
      if (!res.ok) throw new Error();
    } catch {
      setError("Échec de l'archivage.");
    } finally {
      setBusyId(null);
    }
  }

  async function trash(id: string) {
    setBusyId(id);
    setError(null);
    setMessages((prev) => prev.filter((m) => m.id !== id));
    try {
      const res = await fetch(`/api/mail/messages/${id}/trash`, { method: "POST" });
      if (!res.ok) throw new Error();
    } catch {
      setError("Échec de la suppression.");
    } finally {
      setBusyId(null);
    }
  }

  if (messages.length === 0) {
    return <p className="muted">Boîte de réception vide (ou tout est déjà traité).</p>;
  }

  return (
    <div>
      {error && <p className="error">{error}</p>}
      <ul className="activity-list">
        {messages.map((m) => (
          <li key={m.id} className="activity-row" style={{ alignItems: "flex-start" }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {m.unread && (
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "var(--accent)",
                      flexShrink: 0,
                    }}
                  />
                )}
                <span style={{ fontWeight: m.unread ? 600 : 400 }}>{m.subject}</span>
              </div>
              <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                {formatFrom(m.from)} · {formatDate(m.date)}
              </div>
              <div
                className="muted"
                style={{
                  fontSize: 12.5,
                  marginTop: 4,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {m.snippet}
              </div>
            </div>
            <div className="entry-meta">
              <button
                type="button"
                className="icon-btn"
                aria-label={m.unread ? "Marquer comme lu" : "Marquer comme non lu"}
                disabled={busyId === m.id}
                onClick={() => toggleRead(m.id, m.unread)}
              >
                <CheckIcon size={14} />
              </button>
              <button
                type="button"
                className="icon-btn"
                aria-label="Archiver"
                disabled={busyId === m.id}
                onClick={() => archive(m.id)}
              >
                <ArchiveIcon size={14} />
              </button>
              <button
                type="button"
                className="icon-btn danger"
                aria-label="Supprimer"
                disabled={busyId === m.id}
                onClick={() => trash(m.id)}
              >
                <TrashIcon size={14} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
