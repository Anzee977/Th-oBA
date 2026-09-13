import Link from "next/link";
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

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 24 }}>
        <Link href={`/horaire?offset=${offset - 1}`} className="btn btn-secondary">
          ← Semaine précédente
        </Link>
        {offset !== 0 && (
          <Link href="/horaire" className="muted">
            Revenir à cette semaine
          </Link>
        )}
        <Link href={`/horaire?offset=${offset + 1}`} className="btn btn-secondary">
          Semaine suivante →
        </Link>
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

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {days.map((day, index) => (
          <div key={day.date.toISOString()}>
            <h2 style={{ fontSize: 15, marginBottom: 8 }}>{formatDayHeader(day.date, index)}</h2>
            {day.entries.length === 0 ? (
              <p className="muted" style={{ fontSize: 14 }}>
                —
              </p>
            ) : (
              <ul className="file-list">
                {day.entries.map((entry) => (
                  <li key={entry.id}>
                    <span>
                      {formatTime(entry.start)}–{formatTime(entry.end)} · {entry.title}
                      {entry.location && ` (${entry.location})`}
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
  );
}
