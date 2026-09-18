import { NextResponse } from "next/server";
import { getAuthUrl, isGmailConfigured } from "@/lib/gmail";

export async function GET() {
  if (!isGmailConfigured()) {
    return NextResponse.json(
      { error: "Gmail non configuré (GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET manquants)." },
      { status: 500 },
    );
  }
  return NextResponse.redirect(getAuthUrl());
}
