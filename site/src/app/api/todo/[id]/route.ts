import { NextRequest, NextResponse } from "next/server";
import { deleteTodo, setTodoDone } from "@/lib/healthDb";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const todoId = Number(id);
  if (!Number.isInteger(todoId)) {
    return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  }

  try {
    const { done } = await request.json();
    await setTodoDone(todoId, Boolean(done));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Impossible de mettre à jour la tâche." }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const todoId = Number(id);
  if (!Number.isInteger(todoId)) {
    return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  }

  try {
    await deleteTodo(todoId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Impossible de supprimer la tâche." }, { status: 500 });
  }
}
