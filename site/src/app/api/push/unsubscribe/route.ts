import { NextRequest, NextResponse } from "next/server";
import { deletePushSubscription } from "@/lib/healthDb";

export async function POST(request: NextRequest) {
  try {
    const { endpoint } = await request.json();
    if (typeof endpoint !== "string") {
      return NextResponse.json({ error: "Endpoint requis." }, { status: 400 });
    }
    await deletePushSubscription(endpoint);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Échec de la désinscription." }, { status: 500 });
  }
}
