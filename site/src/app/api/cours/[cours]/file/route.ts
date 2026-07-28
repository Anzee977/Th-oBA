import { NextRequest, NextResponse } from "next/server";
import { deleteCourseFile, getCourseFile, InvalidPathError } from "@/lib/nextcloud";

const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  txt: "text/plain; charset=utf-8",
  md: "text/plain; charset=utf-8",
  csv: "text/csv; charset=utf-8",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  doc: "application/msword",
  ppt: "application/vnd.ms-powerpoint",
  xls: "application/vnd.ms-excel",
};

function contentTypeFor(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return CONTENT_TYPES[ext] ?? "application/octet-stream";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cours: string }> },
) {
  const { cours } = await params;
  const relativePath = request.nextUrl.searchParams.get("path");

  if (!relativePath) {
    return NextResponse.json({ error: "Paramètre 'path' manquant." }, { status: 400 });
  }

  try {
    const content = await getCourseFile(cours, relativePath);
    const fileName = relativePath.split("/").pop() ?? "fichier";

    return new NextResponse(content, {
      headers: {
        "Content-Type": contentTypeFor(fileName),
        "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}"`,
        "Cache-Control": "private, max-age=0, no-cache",
      },
    });
  } catch (error) {
    if (error instanceof InvalidPathError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ cours: string }> },
) {
  const { cours } = await params;
  const relativePath = request.nextUrl.searchParams.get("path");

  if (!relativePath) {
    return NextResponse.json({ error: "Paramètre 'path' manquant." }, { status: 400 });
  }

  try {
    await deleteCourseFile(cours, relativePath);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof InvalidPathError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Échec de la suppression." }, { status: 500 });
  }
}
