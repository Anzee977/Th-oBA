import webpush from "web-push";
import { deletePushSubscription, listPushSubscriptions } from "./healthDb";

export function isPushEnabled(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

let configured = false;
function ensureConfigured() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@example.com",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configured = true;
}

export type PushPayload = { title: string; body: string; url?: string };

// Envoie à tous les appareils abonnés. Retire automatiquement les abonnements
// expirés/révoqués (404/410 renvoyé par le navigateur/service push).
export async function sendPushToAll(payload: PushPayload): Promise<void> {
  if (!isPushEnabled()) return;
  ensureConfigured();

  const subscriptions = await listPushSubscriptions();
  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
        );
      } catch (error: any) {
        const status = error?.statusCode;
        if (status === 404 || status === 410) {
          await deletePushSubscription(sub.endpoint);
        } else {
          console.error("Échec d'envoi push :", error?.message || error);
        }
      }
    }),
  );
}
