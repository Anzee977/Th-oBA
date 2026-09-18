import Link from "next/link";
import { CalendarIcon, ChecklistIcon, MailIcon } from "@/components/icons";
import { isHealthDbEnabled, isMailConnected, listTodos } from "@/lib/healthDb";
import { isGmailConfigured, listInboxMessages } from "@/lib/gmail";
import { getCombinedWeekSchedule } from "@/lib/schedule";

export const dynamic = "force-dynamic";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function todayKey(): string {
  return startOfToday().toISOString().slice(0, 10);
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Brussels" });
}

function formatDueDate(dueDate: string): string {
  return new Date(`${dueDate}T12:00:00`).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export default async function AujourdhuiPage() {
  const todayStart = startOfToday();
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const today = todayKey();

  const [{ entries: scheduleEntries, errors: scheduleErrors }, todos, mailConnected] = await Promise.all([
    getCombinedWeekSchedule(todayStart, todayEnd),
    isHealthDbEnabled() ? listTodos() : Promise.resolve([]),
    isHealthDbEnabled() ? isMailConnected() : Promise.resolve(false),
  ]);

  const pendingTodos = todos.filter((t) => !t.done);
  const overdueTodos = pendingTodos.filter((t) => t.dueDate && t.dueDate < today);
  const todayTodos = pendingTodos.filter((t) => t.dueDate === today);

  let unreadMail: Awaited<ReturnType<typeof listInboxMessages>> = [];
  let mailError = false;
  if (mailConnected && isGmailConfigured()) {
    try {
      const messages = await listInboxMessages(15);
      unreadMail = messages.filter((m) => m.unread);
    } catch {
      mailError = true;
    }
  }

  const todayLabel = todayStart.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div>
      <h1>Aujourd&apos;hui</h1>
      <p className="muted" style={{ textTransform: "capitalize" }}>
        {todayLabel}
      </p>

      <div
        className="grid"
        style={{ marginTop: 20, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}
      >
        <div className="card">
          <div className="card-header">
            <span className="stat-icon info">
              <CalendarIcon size={16} />
            </span>
            <h2>Cours du jour</h2>
          </div>
          {scheduleErrors.length > 0 && (
            <p className="error" style={{ fontSize: 13 }}>
              Échec du chargement pour : {scheduleErrors.join(", ")}.
            </p>
          )}
          {scheduleEntries.length === 0 ? (
            <p className="muted">Aucun cours aujourd&apos;hui.</p>
          ) : (
            <ul className="activity-list">
              {scheduleEntries.map((e) => (
                <li key={e.id} className="activity-row">
                  <span>
                    {formatTime(e.start)}–{formatTime(e.end)} · {e.title}
                    {e.location && ` (${e.location})`}
                  </span>
                  <span className="muted">{e.source}</span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/horaire" className="link-btn" style={{ marginTop: 10, display: "inline-block" }}>
            Voir l&apos;horaire complet
          </Link>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="stat-icon warning">
              <ChecklistIcon size={16} />
            </span>
            <h2>Todo</h2>
          </div>
          {overdueTodos.length === 0 && todayTodos.length === 0 ? (
            <p className="muted">Rien d&apos;urgent.</p>
          ) : (
            <ul className="activity-list">
              {overdueTodos.map((t) => (
                <li key={t.id} className="activity-row">
                  <span>{t.text}</span>
                  <span className="error">{formatDueDate(t.dueDate!)}</span>
                </li>
              ))}
              {todayTodos.map((t) => (
                <li key={t.id} className="activity-row">
                  <span>{t.text}</span>
                  <span className="muted">Aujourd&apos;hui</span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/todo" className="link-btn" style={{ marginTop: 10, display: "inline-block" }}>
            Voir toutes les tâches
          </Link>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="stat-icon accent">
              <MailIcon size={16} />
            </span>
            <h2>Mail</h2>
          </div>
          {!mailConnected ? (
            <p className="muted">
              Gmail non connecté. <Link href="/mail">Connecter</Link>
            </p>
          ) : mailError ? (
            <p className="error" style={{ fontSize: 13 }}>
              Échec du chargement des mails.
            </p>
          ) : unreadMail.length === 0 ? (
            <p className="muted">Boîte de réception à jour.</p>
          ) : (
            <ul className="activity-list">
              {unreadMail.slice(0, 5).map((m) => (
                <li key={m.id} className="activity-row">
                  <span style={{ fontWeight: 600 }}>{m.subject}</span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/mail" className="link-btn" style={{ marginTop: 10, display: "inline-block" }}>
            Voir la boîte de réception
          </Link>
        </div>
      </div>
    </div>
  );
}
