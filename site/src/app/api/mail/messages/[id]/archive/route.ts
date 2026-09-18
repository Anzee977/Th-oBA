import { NextRequest, NextResponse } from "next/server";
import { archiveMessage } from "@/lib/gmail";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await archiveMessage(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Échec de l'archivage." }, { status: 500 });
  }
}
