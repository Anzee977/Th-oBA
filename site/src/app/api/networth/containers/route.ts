import { NextRequest, NextResponse } from "next/server";
import { createNetworthContainer, NetworthCategory } from "@/lib/healthDb";

const CATEGORIES: NetworthCategory[] = ["crypto", "tradfi", "cash"];

export async function POST(request: NextRequest) {
  try {
    const { category, name } = await request.json();

    if (!CATEGORIES.includes(category)) {
      return NextResponse.json({ error: "Catégorie invalide." }, { status: 400 });
    }
    if (typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Nom requis." }, { status: 400 });
    }

    const container = await createNetworthContainer({ category, name: name.trim() });
    return NextResponse.json({ container });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Impossible de créer la sous-catégorie." }, { status: 500 });
  }
}
