import { NextRequest, NextResponse } from "next/server";
import { markMessageRead } from "@/lib/gmail";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { read } = await request.json();
    await markMessageRead(id, Boolean(read));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Échec de la mise à jour." }, { status: 500 });
  }
}
