import { NextResponse } from "next/server";
import { deleteMailTokens } from "@/lib/healthDb";

export async function DELETE() {
  try {
    await deleteMailTokens();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Échec de la déconnexion." }, { status: 500 });
  }
}
