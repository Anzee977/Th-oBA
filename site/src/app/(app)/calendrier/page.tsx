import CalendarView from "@/components/CalendarView";
import { listCalendarEvents } from "@/lib/healthDb";
import { CalendarEvent, Recurrence } from "@/lib/calendarEvents";

export const dynamic = "force-dynamic";

export default async function CalendrierPage() {
  const rows = await listCalendarEvents();
  const events: CalendarEvent[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    startDate: r.startDate,
    startTime: r.startTime,
    recurrence: r.recurrence as Recurrence,
    endDate: r.endDate,
  }));

  return (
    <div>
      <h1>Calendrier</h1>
      <p className="muted">
        Ajoute tes événements ponctuels ou récurrents (tous les jours, toutes les semaines, tous
        les mois). Tes calendriers de cours (Nextcloud Calendar / CalDAV) pourront être connectés
        plus tard en plus de ceux-ci.
      </p>

      <div style={{ marginTop: 24 }}>
        <CalendarView initialEvents={events} />
      </div>
    </div>
  );
}
