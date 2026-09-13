import {
  dateKey,
  fetchActivities,
  fetchBodyBatteryForDate,
  fetchCaloriesForDate,
  fetchHeartRateForDate,
  fetchSleepForDate,
  fetchStepsForDate,
  isGarminEnabled,
} from "./garmin";
import {
  findMatchingGarminActivity,
  getLatestWeightKg,
  getUnlinkedManualActivities,
  isHealthDbEnabled,
  linkManualActivity,
  setManualActivityEstimate,
  upsertActivities,
  upsertBodyBatteryPoints,
  upsertDailyMetrics,
  upsertHeartRatePoints,
} from "./healthDb";
import { defaultBodyWeightKg, estimateCalories, garminTypesFor } from "./manualActivities";

async function syncDay(date: Date): Promise<void> {
  const [steps, sleep, bodyBattery, heartRate, calories] = await Promise.all([
    fetchStepsForDate(date),
    fetchSleepForDate(date),
    fetchBodyBatteryForDate(date),
    fetchHeartRateForDate(date),
    fetchCaloriesForDate(date),
  ]);

  const levels = bodyBattery.points.map((p) => p.level);
  const dateStr = dateKey(date);

  await upsertDailyMetrics({
    date: dateStr,
    steps,
    sleepTotalMinutes: sleep?.totalMinutes ?? null,
    sleepDeepMinutes: sleep?.deepMinutes ?? null,
    sleepLightMinutes: sleep?.lightMinutes ?? null,
    sleepRemMinutes: sleep?.remMinutes ?? null,
    sleepAwakeMinutes: sleep?.awakeMinutes ?? null,
    sleepScore: sleep?.score ?? null,
    restingHr: sleep?.restingHr ?? heartRate.resting ?? null,
    avgHrv: sleep?.avgHrv ?? null,
    hrMin: heartRate.min,
    hrMax: heartRate.max,
    bodyBatteryMin: levels.length ? Math.min(...levels) : null,
    bodyBatteryMax: levels.length ? Math.max(...levels) : null,
    bodyBatteryCharged: bodyBattery.charged,
    bodyBatteryDrained: bodyBattery.drained,
    caloriesTotal: calories.totalKcal,
    caloriesActive: calories.activeKcal,
    caloriesBmr: calories.bmrKcal,
  });

  // Courbes complètes, pour l'analyse fine a posteriori (ex: comparaison de compléments).
  await upsertBodyBatteryPoints(dateStr, bodyBattery.points);
  await upsertHeartRatePoints(dateStr, heartRate.points);
}

// Pour chaque activité sportive saisie manuellement pas encore liée : cherche une
// activité Garmin du même jour et du même type de sport. Si trouvée, les lie (les
// vraies données Garmin — calories/distance/FC — priment alors sur l'estimation).
// Sinon, estime les calories par la formule MET tant qu'aucun lien n'est trouvé —
// utile si l'app Garmin Connect n'a pas encore synchronisé au moment de la saisie.
async function matchManualActivities(): Promise<void> {
  const unlinked = await getUnlinkedManualActivities();
  if (unlinked.length === 0) return;
  const weightKg = (await getLatestWeightKg()) ?? defaultBodyWeightKg();
  for (const m of unlinked) {
    const garminTypes = garminTypesFor(m.sport);
    const matchId = await findMatchingGarminActivity(m.date, garminTypes);
    if (matchId) {
      await linkManualActivity(m.id, matchId);
    } else {
      await setManualActivityEstimate(m.id, estimateCalories(m.sport, m.durationMinutes, weightKg));
    }
  }
}

// Synchronise aujourd'hui + hier (les données Garmin, notamment le sommeil,
// arrivent parfois avec du retard) et journalise les activités récentes.
// Conçue pour tourner en tâche de fond au démarrage puis toutes les heures
// (voir instrumentation.ts) — jamais appelée depuis une requête HTTP.
export async function runHealthSync(): Promise<void> {
  if (!isGarminEnabled() || !isHealthDbEnabled()) return;

  try {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await syncDay(today);
    await syncDay(yesterday);

    const activities = await fetchActivities(20);
    await upsertActivities(
      activities.map((a) => ({
        activityId: a.id,
        name: a.name,
        type: a.type,
        startTime: a.startTime,
        durationMinutes: a.durationMinutes,
        distanceKm: a.distanceKm,
        calories: a.calories,
        avgHr: a.avgHr,
      })),
    );

    await matchManualActivities();

    console.log(`[health-sync] OK — ${new Date().toISOString()}`);
  } catch (error) {
    console.error("[health-sync] échec :", error);
  }
}
