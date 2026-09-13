import { NextRequest, NextResponse } from "next/server";
import {
  deleteCourseEntry,
  InvalidPathError,
  getCourseFileContents,
  moveCourseEntry,
  statCourseEntry,
} from "@/lib/nextcloud";
import { indexFile, reindexCourse, removeFromIndex } from "@/lib/indexer";

const MIME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  txt: "text/plain; charset=utf-8",
  md: "text/markdown; charset=utf-8",
  csv: "text/csv; charset=utf-8",
  mp4: "video/mp4",
  mp3: "audio/mpeg",
  zip: "application/zip",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

function mimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return MIME_TYPES[ext] ?? "application/octet-stream";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cours: string; path: string[] }> },
) {
  const { cours, path } = await params;
  const relativePath = path.join("/");
  const filename = path[path.length - 1] ?? "fichier";

  try {
    const content = await getCourseFileContents(cours, relativePath);
    return new NextResponse(content, {
      headers: {
        "Content-Type": mimeType(filename),
        "Content-Disposition": `inline; filename="${filename.replace(/"/g, "")}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "private, no-store",
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
  { params }: { params: Promise<{ cours: string; path: string[] }> },
) {
  const { cours, path } = await params;
  const relativePath = path.join("/");

  try {
    const stat = await statCourseEntry(cours, relativePath);
    await deleteCourseEntry(cours, relativePath);

    if (stat?.isDirectory) {
      await reindexCourse(cours);
    } else {
      await removeFromIndex(cours, relativePath);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof InvalidPathError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Échec de la suppression." }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ cours: string; path: string[] }> },
) {
  const { cours, path } = await params;
  const fromPath = path.join("/");

  try {
    const { to } = await request.json();
    if (typeof to !== "string" || to.trim().length === 0) {
      return NextResponse.json({ error: "Chemin de destination requis." }, { status: 400 });
    }
    const toPath = to.trim().replace(/^\/+/, "");

    const stat = await statCourseEntry(cours, fromPath);
    await moveCourseEntry(cours, fromPath, toPath);

    if (stat?.isDirectory) {
      await reindexCourse(cours);
    } else {
      await removeFromIndex(cours, fromPath);
      await indexFile(cours, toPath);
    }

    return NextResponse.json({ ok: true, path: toPath });
  } catch (error) {
    if (error instanceof InvalidPathError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Échec du renommage/déplacement." }, { status: 500 });
  }
}
