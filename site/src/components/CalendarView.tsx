"use client";

import { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";
import { CalendarEvent, dateKey, expandEvents, Occurrence } from "@/lib/calendarEvents";
import AddEventForm from "./AddEventForm";

const MONTH_LABELS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

const MONTH_ABBR = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

const DAY_LABELS_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const DAY_LABELS_LONG = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];

type ViewMode = "day" | "week" | "month";
type Cell = { date: Date; inCurrentMonth: boolean };

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

function addDays(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + delta);
}

function startOfWeek(date: Date): Date {
  const weekday = (date.getDay() + 6) % 7; // 0 = lundi
  return addDays(date, -weekday);
}

function buildMonthGrid(anchor: Date): Cell[] {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: Cell[] = [];
  for (let i = firstWeekday; i > 0; i--) {
    cells.push({ date: new Date(year, month, 1 - i), inCurrentMonth: false });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ date: new Date(year, month, day), inCurrentMonth: true });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ date: addDays(cells[cells.length - 1].date, 1), inCurrentMonth: false });
  }
  return cells;
}

function formatTime(time: string | null): string {
  return time ? `${time} ` : "";
}

export default function CalendarView({ initialEvents }: { initialEvents: CalendarEvent[] }) {
  const [mode, setMode] = useState<ViewMode>("month");
  const [anchor, setAnchor] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const today = new Date();

  function navigate(delta: number) {
    if (mode === "day") setAnchor((d) => addDays(d, delta));
    else if (mode === "week") setAnchor((d) => addDays(d, delta * 7));
    else setAnchor((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));
  }

  async function deleteEvent(id: number) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    try {
      await fetch(`/api/calendrier/events/${id}`, { method: "DELETE" });
    } catch {
      // best-effort ; un rechargement de page corrigera l'état si l'appel a échoué
    }
  }

  let headerLabel: string;
  let cells: Cell[] = [];

  if (mode === "day") {
    headerLabel = `${DAY_LABELS_LONG[(anchor.getDay() + 6) % 7]} ${anchor.getDate()} ${MONTH_LABELS[
      anchor.getMonth()
    ].toLowerCase()} ${anchor.getFullYear()}`;
  } else if (mode === "week") {
    const start = startOfWeek(anchor);
    const end = addDays(start, 6);
    headerLabel =
      start.getMonth() === end.getMonth()
        ? `${start.getDate()} – ${end.getDate()} ${MONTH_LABELS[start.getMonth()]} ${start.getFullYear()}`
        : `${start.getDate()} ${MONTH_ABBR[start.getMonth()]} – ${end.getDate()} ${MONTH_ABBR[
            end.getMonth()
          ]} ${end.getFullYear()}`;
    cells = Array.from({ length: 7 }, (_, i) => ({ date: addDays(start, i), inCurrentMonth: true }));
  } else {
    headerLabel = `${MONTH_LABELS[anchor.getMonth()]} ${anchor.getFullYear()}`;
    cells = buildMonthGrid(anchor);
  }

  const rangeStart = mode === "day" ? anchor : cells[0].date;
  const rangeEnd = mode === "day" ? anchor : cells[cells.length - 1].date;
  const occurrences = expandEvents(events, rangeStart, rangeEnd);
  const occurrencesByDate = new Map<string, Occurrence[]>();
  for (const occ of occurrences) {
    (occurrencesByDate.get(occ.date) ?? occurrencesByDate.set(occ.date, []).get(occ.date)!).push(occ);
  }

  const dayOccurrences = mode === "day" ? occurrencesByDate.get(dateKey(anchor)) ?? [] : [];

  return (
    <div className="card">
      <div className="calendar-header">
        <div className="calendar-title">{headerLabel}</div>
        <div className="calendar-nav">
          <div className="calendar-view-switch">
            {(["day", "week", "month"] as ViewMode[]).map((m) => (
              <button
                key={m}
                type="button"
                className={`calendar-view-btn${mode === m ? " active" : ""}`}
                onClick={() => setMode(m)}
              >
                {m === "day" ? "Jour" : m === "week" ? "Semaine" : "Mois"}
              </button>
            ))}
          </div>
          <button type="button" className="btn-secondary" onClick={() => setAnchor(new Date())}>
            Aujourd&apos;hui
          </button>
          <button type="button" className="icon-btn" onClick={() => navigate(-1)} aria-label="Précédent">
            <ChevronLeftIcon />
          </button>
          <button type="button" className="icon-btn" onClick={() => navigate(1)} aria-label="Suivant">
            <ChevronRightIcon />
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <AddEventForm
          defaultDate={dateKey(anchor)}
          onCreated={(event) => setEvents((prev) => [...prev, event])}
        />
      </div>

      {mode === "day" ? (
        <div className="calendar-day-view">
          {dayOccurrences.length === 0 ? (
            <p className="muted">Aucun événement pour ce jour.</p>
          ) : (
            <ul className="calendar-event-list">
              {dayOccurrences.map((occ, i) => (
                <li key={`${occ.eventId}-${i}`} className="calendar-event-list-item">
                  <span className="calendar-event-time">{formatTime(occ.time) || "Journée"}</span>
                  <span className="calendar-event-title">{occ.title}</span>
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => deleteEvent(occ.eventId)}
                  >
                    Supprimer
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className={`calendar-grid${mode === "week" ? " week-mode" : ""}`}>
          {DAY_LABELS_SHORT.map((label) => (
            <div key={label} className="calendar-day-label">
              {label}
            </div>
          ))}
          {cells.map((cell) => {
            const key = dateKey(cell.date);
            const dayEvents = occurrencesByDate.get(key) ?? [];
            return (
              <button
                type="button"
                key={key}
                className={`calendar-cell${cell.inCurrentMonth ? "" : " outside"}${
                  isSameDay(cell.date, today) ? " today" : ""
                }`}
                onClick={() => {
                  setAnchor(cell.date);
                  setMode("day");
                }}
              >
                <span className="calendar-cell-number">{cell.date.getDate()}</span>
                {dayEvents.length > 0 && (
                  <div className="calendar-cell-events">
                    {dayEvents.slice(0, mode === "week" ? 6 : 2).map((occ, i) => (
                      <span
                        key={`${occ.eventId}-${i}`}
                        className="calendar-event-chip"
                        title={`${formatTime(occ.time)}${occ.title}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteEvent(occ.eventId);
                        }}
                      >
                        {formatTime(occ.time)}
                        {occ.title}
                      </span>
                    ))}
                    {dayEvents.length > (mode === "week" ? 6 : 2) && (
                      <span className="calendar-event-more">
                        +{dayEvents.length - (mode === "week" ? 6 : 2)}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
