import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

function passwordsMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function POST(request: NextRequest) {
  const sitePassword = process.env.SITE_PASSWORD;
  if (!sitePassword) {
    return NextResponse.json(
      { error: "SITE_PASSWORD non configuré côté serveur." },
      { status: 500 },
    );
  }

  const { password } = await request.json();

  if (typeof password !== "string" || !passwordsMatch(password, sitePassword)) {
    return NextResponse.json({ error: "Mot de passe incorrect." }, { status: 401 });
  }

  const session = await getSession();
  session.authenticated = true;
  await session.save();

  return NextResponse.json({ ok: true });
}
