import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { getCombinedWeekSchedule, getWeekRange, groupByDay } from "@/lib/schedule";

export const dynamic = "force-dynamic";

const DAY_LABELS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

function formatTime(date: Date): string {
  return date.toLocaleTimeString("fr-BE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Brussels",
  });
}

function formatDayHeader(date: Date, index: number): string {
  const label = date.toLocaleDateString("fr-BE", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Brussels",
  });
  return `${DAY_LABELS[index]} ${label}`;
}

// end est exclusif (lundi suivant) : on affiche le dimanche, dernier jour réel de la semaine.
function formatWeekRange(start: Date, end: Date): string {
  const last = new Date(end);
  last.setDate(last.getDate() - 1);
  const sameMonth = start.getMonth() === last.getMonth();
  const startLabel = start.toLocaleDateString("fr-BE", {
    day: "numeric",
    month: sameMonth ? undefined : "short",
    timeZone: "Europe/Brussels",
  });
  const endLabel = last.toLocaleDateString("fr-BE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Brussels",
  });
  return `${startLabel} – ${endLabel}`;
}

export default async function HorairePage({
  searchParams,
}: {
  searchParams: Promise<{ offset?: string }>;
}) {
  const { offset: offsetParam } = await searchParams;
  const offset = Number.parseInt(offsetParam ?? "0", 10) || 0;

  const { start, end } = getWeekRange(offset);
  const { entries, errors } = await getCombinedWeekSchedule(start, end);
  const days = groupByDay(entries, start);

  const hasNoSourceConfigured = !process.env.ICHEC_ICS_URL && !process.env.UNIV2_ICS_URL;

  return (
    <div>
      <h1>Horaire</h1>

      <div className="card">
        <div className="calendar-header">
          <div className="calendar-title">{formatWeekRange(start, end)}</div>
          <div className="calendar-nav">
            {offset !== 0 && (
              <Link href="/horaire" className="btn-secondary">
                Aujourd&apos;hui
              </Link>
            )}
            <Link
              href={`/horaire?offset=${offset - 1}`}
              className="icon-btn"
              aria-label="Semaine précédente"
            >
              <ChevronLeftIcon />
            </Link>
            <Link
              href={`/horaire?offset=${offset + 1}`}
              className="icon-btn"
              aria-label="Semaine suivante"
            >
              <ChevronRightIcon />
            </Link>
          </div>
        </div>

        {hasNoSourceConfigured && (
          <p className="muted">
            Aucun lien de calendrier configuré. Ajoute <code>ICHEC_ICS_URL</code> dans
            <code> site/.env</code> sur le VPS.
          </p>
        )}

        {errors.length > 0 && (
          <p className="error">
            Échec du chargement pour : {errors.join(", ")}. Le lien a peut-être expiré ou changé.
          </p>
        )}

        {!hasNoSourceConfigured && entries.length === 0 && errors.length === 0 && (
          <p className="muted">Aucun cours cette semaine-là.</p>
        )}

        <div style={{ display: "flex", flexDirection: "column" }}>
          {days.map((day, index) => (
            <div key={day.date.toISOString()}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                  color: "var(--text-faint)",
                  marginTop: 18,
                  marginBottom: 4,
                }}
              >
                {formatDayHeader(day.date, index)}
              </div>
              {day.entries.length === 0 ? (
                <p className="muted" style={{ fontSize: 13, padding: "4px 0 0" }}>
                  —
                </p>
              ) : (
                <ul className="calendar-event-list">
                  {day.entries.map((entry) => (
                    <li key={entry.id} className="calendar-event-list-item">
                      <span className="calendar-event-time">
                        {formatTime(entry.start)}–{formatTime(entry.end)}
                      </span>
                      <span className="calendar-event-title">
                        {entry.title}
                        {entry.location && <span className="muted"> · {entry.location}</span>}
                      </span>
                      <span className="muted">{entry.source}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
