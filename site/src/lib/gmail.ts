import { getMailTokens, upsertMailTokens } from "@/lib/healthDb";

// Base absolue en dur (pas dérivée de request.url) : en mode standalone derrière Caddy,
// request.url dans un Route Handler reflète parfois le HOSTNAME interne du conteneur Docker
// plutôt que le domaine public — vu en prod (redirection vers "https://<container-id>:3000/...").
export const SITE_BASE_URL = "https://anzee.xyz";
const REDIRECT_URI = `${SITE_BASE_URL}/api/mail/oauth/callback`;
const SCOPE = "https://www.googleapis.com/auth/gmail.modify";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

export function isGmailConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

// Convertit en format DATETIME MySQL/MariaDB ("YYYY-MM-DD HH:MM:SS") — MariaDB rejette le
// format ISO 8601 natif de Date.toISOString() ("...THH:MM:SS.sssZ").
export function toMysqlDatetime(date: Date): string {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

export function getAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    // Force Google à réémettre un refresh_token même si ce compte a déjà autorisé l'appli
    // auparavant (sinon un 2e passage par l'écran de consentement peut n'en renvoyer aucun).
    prompt: "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string,
): Promise<{ refreshToken: string | null; accessToken: string; expiresIn: number }> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      code,
      grant_type: "authorization_code",
      redirect_uri: REDIRECT_URI,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Échec de l'échange du code Google (HTTP ${res.status}) : ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return { refreshToken: data.refresh_token ?? null, accessToken: data.access_token, expiresIn: data.expires_in };
}

async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Échec du rafraîchissement du jeton Google (HTTP ${res.status}) : ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return { accessToken: data.access_token, expiresIn: data.expires_in };
}

// Renvoie un access token valide, en le rafraîchissant (et en mettant à jour le cache en base)
// si celui stocké a expiré ou va expirer dans moins d'une minute. `null` si Gmail n'est pas
// connecté (aucun refresh_token enregistré).
async function getValidAccessToken(): Promise<string | null> {
  const tokens = await getMailTokens();
  if (!tokens) return null;

  const now = Date.now();
  if (
    tokens.accessToken &&
    tokens.accessTokenExpiresAt &&
    new Date(tokens.accessTokenExpiresAt).getTime() - 60_000 > now
  ) {
    return tokens.accessToken;
  }

  const refreshed = await refreshAccessToken(tokens.refreshToken);
  await upsertMailTokens({
    refreshToken: tokens.refreshToken,
    accessToken: refreshed.accessToken,
    accessTokenExpiresAt: toMysqlDatetime(new Date(now + refreshed.expiresIn * 1000)),
  });
  return refreshed.accessToken;
}

async function gmailFetch(path: string, init?: RequestInit): Promise<any> {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Gmail n'est pas connecté.");

  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me${path}`, {
    ...init,
    headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gmail API HTTP ${res.status} : ${body.slice(0, 200)}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export type MailSummary = {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  unread: boolean;
};

function headerValue(headers: { name: string; value: string }[], name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

// Les N derniers mails de la boîte de réception (INBOX), métadonnées seulement (pas le corps
// complet — plus rapide, et on n'en a pas besoin pour une liste/tri).
export async function listInboxMessages(limit: number): Promise<MailSummary[]> {
  const list = await gmailFetch(`/messages?maxResults=${limit}&labelIds=INBOX`);
  const ids: string[] = (list.messages ?? []).map((m: { id: string }) => m.id);

  const details = await Promise.all(
    ids.map((id) =>
      gmailFetch(
        `/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
      ),
    ),
  );

  return details.map((d) => ({
    id: d.id,
    threadId: d.threadId,
    subject: headerValue(d.payload.headers, "Subject") || "(sans objet)",
    from: headerValue(d.payload.headers, "From"),
    date: headerValue(d.payload.headers, "Date"),
    snippet: d.snippet,
    unread: (d.labelIds ?? []).includes("UNREAD"),
  }));
}

export async function markMessageRead(id: string, read: boolean): Promise<void> {
  await gmailFetch(`/messages/${id}/modify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(read ? { removeLabelIds: ["UNREAD"] } : { addLabelIds: ["UNREAD"] }),
  });
}

export async function archiveMessage(id: string): Promise<void> {
  await gmailFetch(`/messages/${id}/modify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ removeLabelIds: ["INBOX"] }),
  });
}

export async function trashMessage(id: string): Promise<void> {
  await gmailFetch(`/messages/${id}/trash`, { method: "POST" });
}
