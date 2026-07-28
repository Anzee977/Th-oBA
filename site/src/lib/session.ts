import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type SessionData = {
  authenticated?: boolean;
};

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET manquant ou trop court (32 caractères min) dans les variables d'environnement.",
    );
  }
  return secret;
}

export function sessionOptions(): SessionOptions {
  return {
    password: getSecret(),
    cookieName: "anzee_session",
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
    },
  };
}

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions());
}
