import { NextRequest, NextResponse } from "next/server";
import { isClaudeEnabled } from "@/lib/claude";
import { InvalidPathError } from "@/lib/nextcloud";
import { generateWeeklySynthesis, NoNotesError } from "@/lib/synthesis";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cours: string }> },
) {
  const { cours } = await params;

  if (!isClaudeEnabled()) {
    return NextResponse.json(
      { error: "Génération de synthèse désactivée (ANTHROPIC_API_KEY manquant)." },
      { status: 400 },
    );
  }

  try {
    const result = await generateWeeklySynthesis(decodeURIComponent(cours));
    return NextResponse.json({ ok: true, path: result.path, content: result.content });
  } catch (error) {
    if (error instanceof NoNotesError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof InvalidPathError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Échec de la génération de la synthèse." }, { status: 500 });
  }
}
