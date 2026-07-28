import { NextRequest, NextResponse } from "next/server";
import { createCourse, InvalidPathError, listCourses } from "@/lib/nextcloud";

export async function GET() {
  try {
    const courses = await listCourses();
    return NextResponse.json({ courses });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Impossible de lister les cours." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();
    if (typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Nom de cours requis." }, { status: 400 });
    }

    await createCourse(name.trim());
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof InvalidPathError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Impossible de créer le cours." }, { status: 500 });
  }
}
