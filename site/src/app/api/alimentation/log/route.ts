import { NextRequest, NextResponse } from "next/server";
import {
  logAlcohol,
  logCoffee,
  logMeal,
  undoLastAlcohol,
  undoLastCoffee,
  undoLastMeal,
} from "@/lib/healthDb";
import { isAlcoholLevel, isMealSize } from "@/lib/nutrition";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, action } = body;

    if (category === "cafe") {
      const result = action === "undo" ? await undoLastCoffee() : await logCoffee();
      return NextResponse.json({ ok: true, ...result });
    }

    if (category === "repas") {
      if (action === "undo") {
        const result = await undoLastMeal();
        return NextResponse.json({ ok: true, ...result });
      }

      const { size } = body;
      if (typeof size !== "string" || !isMealSize(size)) {
        return NextResponse.json({ error: "Taille de repas invalide." }, { status: 400 });
      }

      const result = await logMeal(size);
      return NextResponse.json({ ok: true, ...result });
    }

    if (category === "alcool") {
      if (action === "undo") {
        const result = await undoLastAlcohol();
        return NextResponse.json({ ok: true, ...result });
      }

      const { level } = body;
      if (typeof level !== "string" || !isAlcoholLevel(level)) {
        return NextResponse.json({ error: "Niveau d'alcool invalide." }, { status: 400 });
      }

      const result = await logAlcohol(level);
      return NextResponse.json({ ok: true, ...result });
    }

    return NextResponse.json({ error: "Catégorie invalide." }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Échec de l'enregistrement." }, { status: 500 });
  }
}
