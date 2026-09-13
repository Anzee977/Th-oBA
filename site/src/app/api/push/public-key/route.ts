import { NextResponse } from "next/server";
import { isPushEnabled } from "@/lib/push";

export async function GET() {
  if (!isPushEnabled()) {
    return NextResponse.json({ error: "Notifications désactivées." }, { status: 400 });
  }
  return NextResponse.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
}
