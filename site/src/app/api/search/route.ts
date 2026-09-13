import { NextRequest, NextResponse } from "next/server";
import { isSearchEnabled, searchDocuments } from "@/lib/search";

function parseDate(value: string | null, endOfDay: boolean): number | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T${endOfDay ? "23:59:59" : "00:00:00"}`);
  if (Number.isNaN(date.getTime())) return undefined;
  return Math.floor(date.getTime() / 1000);
}

export async function GET(request: NextRequest) {
  if (!isSearchEnabled()) {
    return NextResponse.json({ available: false, hits: [] });
  }

  const { searchParams } = request.nextUrl;
  const query = searchParams.get("q") ?? "";
  const course = searchParams.get("course") ?? undefined;
  const fromTs = parseDate(searchParams.get("from"), false);
  const toTs = parseDate(searchParams.get("to"), true);

  try {
    const result = await searchDocuments({ query, course, fromTs, toTs });
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Recherche impossible." }, { status: 500 });
  }
}
