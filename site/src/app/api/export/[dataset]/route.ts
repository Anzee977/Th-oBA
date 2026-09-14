import { NextRequest, NextResponse } from "next/server";
import {
  getAllActivitiesForExport,
  getAllDailyMetrics,
  getAllNetworthTransactionsForExport,
  getAllNutritionLogsForExport,
  getAllSupplementLogsForExport,
} from "@/lib/healthDb";
import { toCsv } from "@/lib/csv";

const DATASETS: Record<
  string,
  { filename: string; headers: string[]; fetch: () => Promise<Record<string, unknown>[]> }
> = {
  sante: {
    filename: "sante.csv",
    headers: [
      "date",
      "steps",
      "sleep_total_minutes",
      "sleep_deep_minutes",
      "sleep_light_minutes",
      "sleep_rem_minutes",
      "sleep_awake_minutes",
      "sleep_score",
      "resting_hr",
      "avg_hrv",
      "hr_min",
      "hr_max",
      "body_battery_min",
      "body_battery_max",
      "body_battery_charged",
      "body_battery_drained",
      "calories_total",
      "calories_active",
      "calories_bmr",
    ],
    fetch: getAllDailyMetrics,
  },
  complements: {
    filename: "complements.csv",
    headers: ["supplement", "date", "logged_at"],
    fetch: getAllSupplementLogsForExport,
  },
  alimentation: {
    filename: "alimentation.csv",
    headers: ["category", "size", "date", "logged_at"],
    fetch: getAllNutritionLogsForExport,
  },
  activites: {
    filename: "activites.csv",
    headers: ["activity_id", "name", "type", "start_time", "duration_minutes", "distance_km", "calories", "avg_hr"],
    fetch: getAllActivitiesForExport,
  },
  networth: {
    filename: "networth.csv",
    headers: ["category", "name", "symbol", "currency", "quantity", "date", "note"],
    fetch: getAllNetworthTransactionsForExport,
  },
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ dataset: string }> },
) {
  const { dataset } = await params;
  const entry = DATASETS[dataset];
  if (!entry) {
    return NextResponse.json({ error: "Jeu de données inconnu." }, { status: 404 });
  }

  try {
    const rows = await entry.fetch();
    const csv = toCsv(rows, entry.headers);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${entry.filename}"`,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Échec de l'export." }, { status: 500 });
  }
}
