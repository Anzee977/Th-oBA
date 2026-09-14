import { NextRequest, NextResponse } from "next/server";
import { deleteNetworthTransaction } from "@/lib/healthDb";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const txId = Number(id);
  if (!Number.isInteger(txId)) {
    return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  }

  try {
    await deleteNetworthTransaction(txId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Échec de la suppression." }, { status: 500 });
  }
}
