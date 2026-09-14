import { NextRequest, NextResponse } from "next/server";
import { deleteNetworthContainer } from "@/lib/healthDb";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const containerId = Number(id);
  if (!Number.isInteger(containerId)) {
    return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  }

  try {
    await deleteNetworthContainer(containerId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Échec de la suppression." }, { status: 500 });
  }
}
