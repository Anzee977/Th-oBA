import { NextRequest, NextResponse } from "next/server";
import { createCalendarEvent, isHealthDbEnabled } from "@/lib/healthDb";
import { isRecurrence } from "@/lib/calendarEvents";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

export async function POST(request: NextRequest) {
  if (!isHealthDbEnabled()) {
    return NextResponse.json({ error: "Calendrier désactivé (base de données non configurée)." }, { status: 400 });
  }

  try {
    const { title, startDate, startTime, recurrence, endDate } = await request.json();

    if (typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json({ error: "Titre requis." }, { status: 400 });
    }
    if (typeof startDate !== "string" || !DATE_PATTERN.test(startDate)) {
      return NextResponse.json({ error: "Date de départ invalide." }, { status: 400 });
    }
    if (startTime != null && (typeof startTime !== "string" || !TIME_PATTERN.test(startTime))) {
      return NextResponse.json({ error: "Heure invalide." }, { status: 400 });
    }
    const recurrenceValue = typeof recurrence === "string" ? recurrence : "none";
    if (!isRecurrence(recurrenceValue)) {
      return NextResponse.json({ error: "Récurrence invalide." }, { status: 400 });
    }
    if (endDate != null && (typeof endDate !== "string" || !DATE_PATTERN.test(endDate))) {
      return NextResponse.json({ error: "Date de fin invalide." }, { status: 400 });
    }

    const event = await createCalendarEvent({
      title: title.trim(),
      startDate,
      startTime: startTime || null,
      recurrence: recurrenceValue,
      endDate: endDate || null,
    });

    return NextResponse.json({ ok: true, event });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Échec de la création de l'événement." }, { status: 500 });
  }
}
