import { NextResponse } from "next/server";
import { listCourses } from "@/lib/nextcloud";
import { isSearchEnabled } from "@/lib/search";
import { reindexCourse } from "@/lib/indexer";

export async function POST() {
  if (!isSearchEnabled()) {
    return NextResponse.json({ error: "Recherche non configurée." }, { status: 400 });
  }

  try {
    const courses = await listCourses();
    for (const course of courses) {
      await reindexCourse(course.name);
    }
    return NextResponse.json({ ok: true, courses: courses.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Échec de la réindexation." }, { status: 500 });
  }
}
