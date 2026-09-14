import ical, { VEvent } from "node-ical";

export type ScheduleEntry = {
  id: string;
  title: string;
  location: string;
  start: Date;
  end: Date;
  source: string;
};

function textValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && "val" in (value as Record<string, unknown>)) {
    return String((value as { val: unknown }).val ?? "");
  }
  return String(value);
}

async function fetchEvents(url: string): Promise<VEvent[]> {
  const data = await ical.async.fromURL(url);
  return Object.values(data).filter(
    (item): item is VEvent => item != null && (item as { type?: string }).type === "VEVENT",
  );
}

// Récupère les occurrences (y compris répétitions hebdomadaires) d'un flux ICS
// qui tombent dans l'intervalle [weekStart, weekEnd).
export async function getWeekSchedule(
  url: string,
  weekStart: Date,
  weekEnd: Date,
  source: string,
): Promise<ScheduleEntry[]> {
  const events = await fetchEvents(url);
  const entries: ScheduleEntry[] = [];

  for (const event of events) {
    if (event.rrule) {
      const instances = ical.expandRecurringEvent(event, {
        from: weekStart,
        to: weekEnd,
      });
      for (const instance of instances) {
        entries.push({
          id: `${event.uid}-${instance.start.toISOString()}`,
          title: textValue(instance.summary),
          location: textValue(instance.event.location),
          start: instance.start,
          end: instance.end,
          source,
        });
      }
    } else if (event.start && event.start >= weekStart && event.start < weekEnd) {
      entries.push({
        id: event.uid,
        title: textValue(event.summary),
        location: textValue(event.location),
        start: event.start,
        end: event.end ?? event.start,
        source,
      });
    }
  }

  entries.sort((a, b) => a.start.getTime() - b.start.getTime());
  return entries;
}

export type ScheduleSource = {
  label: string;
  envVar: string;
};

// Enregistre ici chaque université dont tu as le lien ICS (variable d'environnement
// correspondante côté serveur). En ajouter une ne demande aucun autre changement de code.
export const SCHEDULE_SOURCES: ScheduleSource[] = [
  { label: "ICHEC", envVar: "ICHEC_ICS_URL" },
  { label: "ECAM", envVar: "UNIV2_ICS_URL" },
];

const CACHE_TTL_MS = 60 * 60 * 1000; // 1h
const weekCache = new Map<string, { fetchedAt: number; entries: ScheduleEntry[] }>();

async function getCachedWeekSchedule(
  url: string,
  weekStart: Date,
  weekEnd: Date,
  source: string,
): Promise<ScheduleEntry[]> {
  const cacheKey = `${source}:${weekStart.toISOString()}`;
  const cached = weekCache.get(cacheKey);

  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.entries;
  }

  const entries = await getWeekSchedule(url, weekStart, weekEnd, source);
  weekCache.set(cacheKey, { fetchedAt: Date.now(), entries });
  return entries;
}

export async function getCombinedWeekSchedule(
  weekStart: Date,
  weekEnd: Date,
): Promise<{ entries: ScheduleEntry[]; errors: string[] }> {
  const entries: ScheduleEntry[] = [];
  const errors: string[] = [];

  const activeSources = SCHEDULE_SOURCES.filter((s) => process.env[s.envVar]);

  await Promise.all(
    activeSources.map(async (source) => {
      try {
        const url = process.env[source.envVar]!;
        const result = await getCachedWeekSchedule(url, weekStart, weekEnd, source.label);
        entries.push(...result);
      } catch (error) {
        console.error(`Échec du chargement de l'horaire (${source.label})`, error);
        errors.push(source.label);
      }
    }),
  );

  entries.sort((a, b) => a.start.getTime() - b.start.getTime());
  return { entries, errors };
}

// Lundi 00:00 -> lundi suivant 00:00, pour la semaine décalée de `offsetWeeks`
// par rapport à la semaine en cours (0 = cette semaine, -1 = précédente, 1 = suivante).
export function getWeekRange(offsetWeeks: number): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getDay(); // 0 = dimanche
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday + offsetWeeks * 7);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  return { start, end };
}

export type DaySchedule = {
  date: Date;
  entries: ScheduleEntry[];
};

export function groupByDay(entries: ScheduleEntry[], weekStart: Date): DaySchedule[] {
  const days: DaySchedule[] = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    return { date, entries: [] as ScheduleEntry[] };
  });

  for (const entry of entries) {
    const dayIndex = Math.floor(
      (entry.start.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000),
    );
    if (dayIndex >= 0 && dayIndex < 7) {
      days[dayIndex].entries.push(entry);
    }
  }

  return days;
}
