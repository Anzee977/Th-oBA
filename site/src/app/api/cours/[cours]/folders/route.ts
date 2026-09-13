import { NextRequest, NextResponse } from "next/server";
import { createFolder, InvalidPathError } from "@/lib/nextcloud";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cours: string }> },
) {
  const { cours } = await params;

  try {
    const { path } = await request.json();
    if (typeof path !== "string" || path.trim().length === 0) {
      return NextResponse.json({ error: "Nom de dossier requis." }, { status: 400 });
    }

    await createFolder(cours, path.trim());
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof InvalidPathError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Échec de la création du dossier." }, { status: 500 });
  }
}
