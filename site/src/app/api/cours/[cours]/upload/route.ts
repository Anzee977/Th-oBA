import { NextRequest, NextResponse } from "next/server";
import { InvalidPathError, uploadCourseFile } from "@/lib/nextcloud";

const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200 Mo

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cours: string }> },
) {
  const { cours } = await params;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const relativePath = formData.get("path");

    if (!(file instanceof File) || typeof relativePath !== "string") {
      return NextResponse.json({ error: "Fichier ou chemin manquant." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Fichier trop volumineux (max 200 Mo)." }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadCourseFile(cours, relativePath, buffer);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof InvalidPathError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Échec de l'upload." }, { status: 500 });
  }
}
