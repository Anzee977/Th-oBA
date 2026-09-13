import { NextRequest, NextResponse } from "next/server";
import { logSupplementDose, undoLastSupplementDose } from "@/lib/healthDb";
import { isSupplementId } from "@/lib/supplements";

export async function POST(request: NextRequest) {
  try {
    const { supplement, action } = await request.json();

    if (typeof supplement !== "string" || !isSupplementId(supplement)) {
      return NextResponse.json({ error: "Complément invalide." }, { status: 400 });
    }

    if (action === "undo") {
      const times = await undoLastSupplementDose(supplement);
      return NextResponse.json({ ok: true, times });
    }

    const result = await logSupplementDose(supplement);
    if (!result.ok) {
      return NextResponse.json(
        { error: "Limite de 3 prises par jour atteinte.", times: result.times },
        { status: 409 },
      );
    }

    return NextResponse.json({ ok: true, times: result.times });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Échec de l'enregistrement." }, { status: 500 });
  }
}
