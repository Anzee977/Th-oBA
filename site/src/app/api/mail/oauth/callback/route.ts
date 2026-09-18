import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, SITE_BASE_URL, toMysqlDatetime } from "@/lib/gmail";
import { upsertMailTokens } from "@/lib/healthDb";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/mail?error=${encodeURIComponent(error)}`, SITE_BASE_URL));
  }
  if (!code) {
    return NextResponse.redirect(new URL("/mail?error=missing_code", SITE_BASE_URL));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.refreshToken) {
      // Arrive si ce compte avait déjà autorisé l'appli sans qu'on ait pu forcer un nouveau
      // refresh_token — se reconnecter depuis myaccount.google.com/permissions (révoquer
      // l'accès existant) puis refaire "Connecter Gmail" réglerait ça.
      return NextResponse.redirect(new URL("/mail?error=no_refresh_token", SITE_BASE_URL));
    }
    await upsertMailTokens({
      refreshToken: tokens.refreshToken,
      accessToken: tokens.accessToken,
      accessTokenExpiresAt: toMysqlDatetime(new Date(Date.now() + tokens.expiresIn * 1000)),
    });
    return NextResponse.redirect(new URL("/mail", SITE_BASE_URL));
  } catch (err) {
    console.error(err);
    return NextResponse.redirect(new URL("/mail?error=exchange_failed", SITE_BASE_URL));
  }
}
