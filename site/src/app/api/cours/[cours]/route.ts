import { NextRequest, NextResponse } from "next/server";
import { deleteCourse, InvalidPathError } from "@/lib/nextcloud";
import { deleteCourseDocuments } from "@/lib/search";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ cours: string }> },
) {
  const { cours } = await params;

  try {
    await deleteCourse(cours);
    await deleteCourseDocuments(cours).catch((error) => console.error(error));
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof InvalidPathError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Échec de la suppression du cours." }, { status: 500 });
  }
}
