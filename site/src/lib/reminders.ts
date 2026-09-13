import { isGarminEnabled } from "./garmin";
import {
  getTodayMetricsUpdatedAt,
  hasMealLogToday,
  hasSupplementLogToday,
  isHealthDbEnabled,
} from "./healthDb";
import { isPushEnabled, sendPushToAll } from "./push";

const STALE_HOURS = 3;

// Vérifie 3 conditions et envoie une notification push pour chacune non remplie.
// Appelée une fois par soir (voir instrumentation.ts) — jamais depuis une requête HTTP.
export async function runEveningReminders(): Promise<void> {
  if (!isPushEnabled() || !isHealthDbEnabled()) return;

  try {
    if (isGarminEnabled()) {
      const updatedAt = await getTodayMetricsUpdatedAt();
      const staleMs = STALE_HOURS * 60 * 60 * 1000;
      const isStale =
        !updatedAt || Date.now() - new Date(updatedAt.replace(" ", "T")).getTime() > staleMs;
      if (isStale) {
        await sendPushToAll({
          title: "Garmin pas synchronisé",
          body: "Aucune donnée récente de ta montre — pense à ouvrir l'app Garmin Connect.",
          url: "/sante",
        });
      }
    }

    if (!(await hasSupplementLogToday())) {
      await sendPushToAll({
        title: "Complément pas noté",
        body: "Tu n'as noté aucune prise de complément aujourd'hui.",
        url: "/suivi",
      });
    }

    if (!(await hasMealLogToday())) {
      await sendPushToAll({
        title: "Repas pas noté",
        body: "Tu n'as noté aucun repas aujourd'hui.",
        url: "/alimentation",
      });
    }

    console.log(`[reminders] vérifiés/envoyés — ${new Date().toISOString()}`);
  } catch (error) {
    console.error("[reminders] échec :", error);
  }
}
