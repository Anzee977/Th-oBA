import { NextRequest, NextResponse } from "next/server";
import { savePushSubscription } from "@/lib/healthDb";

export async function POST(request: NextRequest) {
  try {
    const { endpoint, keys } = await request.json();
    if (typeof endpoint !== "string" || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: "Abonnement invalide." }, { status: 400 });
    }
    await savePushSubscription({ endpoint, p256dh: keys.p256dh, auth: keys.auth });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Échec de l'enregistrement." }, { status: 500 });
  }
}
