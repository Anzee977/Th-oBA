export type Recurrence = "none" | "daily" | "weekly" | "monthly";

export const RECURRENCE_OPTIONS: { id: Recurrence; label: string }[] = [
  { id: "none", label: "Une seule fois" },
  { id: "daily", label: "Tous les jours" },
  { id: "weekly", label: "Toutes les semaines" },
  { id: "monthly", label: "Tous les mois" },
];

export function isRecurrence(value: string): value is Recurrence {
  return RECURRENCE_OPTIONS.some((r) => r.id === value);
}

export type CalendarEvent = {
  id: number;
  title: string;
  startDate: string; // YYYY-MM-DD — date "ancre" (première occurrence)
  startTime: string | null; // HH:MM, null = journée entière
  recurrence: Recurrence;
  endDate: string | null; // YYYY-MM-DD inclus, null = récurrence sans fin
};

export type Occurrence = {
  eventId: number;
  title: string;
  date: string; // YYYY-MM-DD de cette occurrence précise
  time: string | null;
};

export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDateKey(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Développe les événements (dont les récurrents) en occurrences concrètes tombant
// dans [rangeStart, rangeEnd] (inclus). Pure fonction, utilisable côté client pour
// re-calculer à chaque navigation dans le calendrier sans aller-retour serveur.
export function expandEvents(
  events: CalendarEvent[],
  rangeStart: Date,
  rangeEnd: Date,
): Occurrence[] {
  const occurrences: Occurrence[] = [];
  const rs = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate());
  const re = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate());

  for (const event of events) {
    const start = parseDateKey(event.startDate);
    const end = event.endDate ? parseDateKey(event.endDate) : null;

    if (event.recurrence === "none") {
      if (start >= rs && start <= re) {
        occurrences.push({
          eventId: event.id,
          title: event.title,
          date: event.startDate,
          time: event.startTime,
        });
      }
      continue;
    }

    const cursor = new Date(Math.max(rs.getTime(), start.getTime()));
    for (; cursor <= re; cursor.setDate(cursor.getDate() + 1)) {
      if (end && cursor > end) break;

      let matches = false;
      if (event.recurrence === "daily") {
        matches = true;
      } else if (event.recurrence === "weekly") {
        matches = cursor.getDay() === start.getDay();
      } else if (event.recurrence === "monthly") {
        matches = cursor.getDate() === start.getDate();
      }

      if (matches) {
        occurrences.push({
          eventId: event.id,
          title: event.title,
          date: dateKey(cursor),
          time: event.startTime,
        });
      }
    }
  }

  return occurrences.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.time ?? "").localeCompare(b.time ?? "");
  });
}
