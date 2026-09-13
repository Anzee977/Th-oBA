function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Hook Next.js exécuté une fois au démarrage du serveur. Sert ici à programmer :
// 1) la synchronisation périodique des données Garmin (voir lib/healthSync.ts) :
//    une fois immédiatement, puis toutes les 15 minutes. Le cloud Garmin ne contient
//    des données fraîches que si l'app Garmin Connect Mobile a synchronisé la montre
//    (Bluetooth local, non déclenchable à distance) — cet intervalle réduit juste le
//    délai résiduel entre "l'app a synchronisé" et "la donnée apparaît sur le site".
// 2) les rappels du soir (voir lib/reminders.ts), vérifiés toutes les 5 min et
//    déclenchés une seule fois par jour à 22h heure locale (TZ=Europe/Brussels,
//    voir docker/docker-compose.yml).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runHealthSync } = await import("./lib/healthSync");
    runHealthSync();
    setInterval(runHealthSync, 15 * 60 * 1000);

    const { runEveningReminders } = await import("./lib/reminders");
    let lastReminderDate: string | null = null;
    setInterval(
      () => {
        const now = new Date();
        const todayKey = localDateKey(now);
        if (now.getHours() === 22 && lastReminderDate !== todayKey) {
          lastReminderDate = todayKey;
          runEveningReminders();
        }
      },
      5 * 60 * 1000,
    );
  }
}
