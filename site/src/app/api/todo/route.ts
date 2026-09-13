import { NextRequest, NextResponse } from "next/server";
import { createTodo, listTodos } from "@/lib/healthDb";

export async function GET() {
  try {
    const todos = await listTodos();
    return NextResponse.json({ todos });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Impossible de lister les tâches." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { text, category, dueDate } = await request.json();
    if (typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ error: "Texte requis." }, { status: 400 });
    }
    await createTodo({
      text: text.trim(),
      category: typeof category === "string" && category.trim() ? category.trim() : null,
      dueDate: typeof dueDate === "string" && dueDate ? dueDate : null,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Impossible de créer la tâche." }, { status: 500 });
  }
}
