import { NextRequest, NextResponse } from "next/server";
import { addNetworthTransaction } from "@/lib/healthDb";

export async function POST(request: NextRequest) {
  try {
    const { assetId, quantity, date, note } = await request.json();

    const cleanAssetId = Number(assetId);
    if (!Number.isInteger(cleanAssetId)) {
      return NextResponse.json({ error: "Sous-catégorie invalide." }, { status: 400 });
    }
    const cleanQuantity = Number(quantity);
    if (!Number.isFinite(cleanQuantity) || cleanQuantity === 0) {
      return NextResponse.json({ error: "Quantité invalide." }, { status: 400 });
    }
    if (typeof date !== "string" || !date) {
      return NextResponse.json({ error: "Date requise." }, { status: 400 });
    }

    const transaction = await addNetworthTransaction({
      assetId: cleanAssetId,
      quantity: cleanQuantity,
      date,
      note: typeof note === "string" && note.trim() ? note.trim() : null,
    });
    return NextResponse.json({ transaction });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Impossible d'enregistrer le mouvement." }, { status: 500 });
  }
}
