import { NextRequest, NextResponse } from "next/server";
import { isHealthDbEnabled, logWeight } from "@/lib/healthDb";

export async function POST(request: NextRequest) {
  if (!isHealthDbEnabled()) {
    return NextResponse.json({ error: "Base de données santé non configurée." }, { status: 400 });
  }

  try {
    const { weightKg } = await request.json();

    if (typeof weightKg !== "number" || !Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 500) {
      return NextResponse.json({ error: "Poids invalide." }, { status: 400 });
    }

    const log = await logWeight(Math.round(weightKg * 10) / 10);

    return NextResponse.json({ ok: true, log });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Échec de l'enregistrement." }, { status: 500 });
  }
}
