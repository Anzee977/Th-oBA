import { NextRequest, NextResponse } from "next/server";
import { createManualActivity, isHealthDbEnabled } from "@/lib/healthDb";
import { isSport } from "@/lib/manualActivities";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: NextRequest) {
  if (!isHealthDbEnabled()) {
    return NextResponse.json({ error: "Base de données santé non configurée." }, { status: 400 });
  }

  try {
    const { sport, durationMinutes, date } = await request.json();

    if (typeof sport !== "string" || !isSport(sport)) {
      return NextResponse.json({ error: "Sport invalide." }, { status: 400 });
    }
    if (typeof durationMinutes !== "number" || durationMinutes <= 0 || durationMinutes > 1440) {
      return NextResponse.json({ error: "Durée invalide." }, { status: 400 });
    }
    if (typeof date !== "string" || !DATE_PATTERN.test(date)) {
      return NextResponse.json({ error: "Date invalide." }, { status: 400 });
    }

    const activity = await createManualActivity({
      sport,
      durationMinutes: Math.round(durationMinutes),
      date,
    });

    return NextResponse.json({ ok: true, activity });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Échec de la création." }, { status: 500 });
  }
}
