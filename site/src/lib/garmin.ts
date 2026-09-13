import fs from "fs";
import { GarminConnect } from "garmin-connect";
import {
  getCaloriesHistoryFromDb,
  getLatestSleepFromDb,
  getRecentActivitiesFromDb,
  getStepsHistoryFromDb,
} from "./healthDb";

const TOKEN_DIR = "/app/.garmin-tokens";
const CACHE_TTL_MS = 15 * 60 * 1000;
const CONNECT_API = "https://connectapi.garmin.com";

export function isGarminEnabled(): boolean {
  return Boolean(process.env.GARMIN_EMAIL && process.env.GARMIN_PASSWORD);
}

let client: GarminConnect | null = null;
let loginPromise: Promise<void> | null = null;

function getClient(): GarminConnect {
  if (client) return client;
  const username = process.env.GARMIN_EMAIL;
  const password = process.env.GARMIN_PASSWORD;
  if (!username || !password) {
    throw new Error("Variables GARMIN_EMAIL / GARMIN_PASSWORD manquantes.");
  }
  client = new GarminConnect({ username, password });
  return client;
}

async function ensureLoggedIn(): Promise<GarminConnect> {
  const c = getClient();

  if (!loginPromise) {
    loginPromise = (async () => {
      if (fs.existsSync(`${TOKEN_DIR}/oauth2_token.json`)) {
        try {
          c.loadTokenByFile(TOKEN_DIR);
          await c.getUserProfile();
          return;
        } catch {
          // Token invalide/expiré : on retente un login complet ci-dessous.
        }
      }
      await c.login();
      fs.mkdirSync(TOKEN_DIR, { recursive: true });
      c.exportTokenToFile(TOKEN_DIR);
    })();
  }

  try {
    await loginPromise;
  } catch (error) {
    loginPromise = null;
    throw error;
  }

  return c;
}

// Réessaie une fois après un nouveau login si la session semble invalide (token expiré côté Garmin).
async function withGarmin<T>(fn: (c: GarminConnect) => Promise<T>): Promise<T> {
  const c = await ensureLoggedIn();
  try {
    return await fn(c);
  } catch (error: any) {
    const status = error?.response?.status;
    if (status === 401 || status === 403) {
      client = null;
      loginPromise = null;
      const retried = await ensureLoggedIn();
      return await fn(retried);
    }
    throw error;
  }
}

const cache = new Map<string, { data: unknown; expiresAt: number }>();

async function cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.data as T;
  const data = await fetcher();
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  return data;
}

export function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Récupération brute depuis Garmin (utilisée uniquement par la synchro horaire,
// voir lib/healthSync.ts). L'affichage de la page Santé lit depuis la base de
// données (lib/healthDb.ts) pour conserver un historique, sauf le Body Battery
// intrajournalier qui n'est pas persisté finement et reste lu en direct.
// ---------------------------------------------------------------------------

export async function fetchStepsForDate(date: Date): Promise<number | null> {
  try {
    return await withGarmin((c) => c.getSteps(date));
  } catch (error) {
    console.error(`Impossible de récupérer les pas du ${dateKey(date)} :`, error);
    return null;
  }
}

export type SleepDetail = {
  totalMinutes: number;
  deepMinutes: number;
  lightMinutes: number;
  remMinutes: number;
  awakeMinutes: number;
  score: number | null;
  restingHr: number | null;
  avgHrv: number | null;
};

export async function fetchSleepForDate(date: Date): Promise<SleepDetail | null> {
  try {
    return await withGarmin(async (c) => {
      const data: any = await c.getSleepData(date);
      const dto = data?.dailySleepDTO;
      if (!dto || dto.sleepTimeSeconds == null) return null;

      return {
        totalMinutes: Math.round(dto.sleepTimeSeconds / 60),
        deepMinutes: Math.round((dto.deepSleepSeconds ?? 0) / 60),
        lightMinutes: Math.round((dto.lightSleepSeconds ?? 0) / 60),
        remMinutes: Math.round((dto.remSleepSeconds ?? 0) / 60),
        awakeMinutes: Math.round((dto.awakeSleepSeconds ?? 0) / 60),
        score: dto.sleepScores?.overall?.value ?? null,
        restingHr: data?.restingHeartRate ?? null,
        avgHrv: data?.avgOvernightHrv ?? null,
      };
    });
  } catch (error) {
    console.error(`Impossible de récupérer le sommeil du ${dateKey(date)} :`, error);
    return null;
  }
}

export type BodyBatteryPoint = { timestamp: number; level: number };

export type BodyBatteryDay = {
  points: BodyBatteryPoint[];
  charged: number | null;
  drained: number | null;
};

export async function fetchBodyBatteryForDate(date: Date): Promise<BodyBatteryDay> {
  try {
    return await withGarmin(async (c) => {
      const dateStr = dateKey(date);
      const url = `${CONNECT_API}/wellness-service/wellness/bodyBattery/reports/daily`;
      const data: any = await c.client.get(url, {
        params: { startDate: dateStr, endDate: dateStr },
      });
      const day = Array.isArray(data) ? data[0] : data;
      const values: [number, number | null][] = day?.bodyBatteryValuesArray ?? [];
      const points = values
        .filter(([, level]) => level != null)
        .map(([timestamp, level]) => ({ timestamp, level: level as number }));
      return { points, charged: day?.charged ?? null, drained: day?.drained ?? null };
    });
  } catch (error) {
    console.error(`Impossible de récupérer le Body Battery du ${dateKey(date)} :`, error);
    return { points: [], charged: null, drained: null };
  }
}

export type HeartRatePoint = { timestamp: number; bpm: number };

export type HeartRateDay = {
  points: HeartRatePoint[];
  min: number | null;
  max: number | null;
  resting: number | null;
};

export async function fetchHeartRateForDate(date: Date): Promise<HeartRateDay> {
  try {
    return await withGarmin(async (c) => {
      const data: any = await c.getHeartRate(date);
      const values: [number, number | null][] = data?.heartRateValues ?? [];
      const points = values
        .filter(([, bpm]) => bpm != null)
        .map(([timestamp, bpm]) => ({ timestamp, bpm: bpm as number }));
      return {
        points,
        min: data?.minHeartRate ?? null,
        max: data?.maxHeartRate ?? null,
        resting: data?.restingHeartRate ?? null,
      };
    });
  } catch (error) {
    console.error(`Impossible de récupérer la fréquence cardiaque du ${dateKey(date)} :`, error);
    return { points: [], min: null, max: null, resting: null };
  }
}

let cachedDisplayName: string | null = null;

async function getDisplayName(c: GarminConnect): Promise<string> {
  if (cachedDisplayName) return cachedDisplayName;
  const profile: any = await c.getUserProfile();
  cachedDisplayName = profile.displayName;
  return cachedDisplayName!;
}

export type CaloriesDay = {
  totalKcal: number | null;
  activeKcal: number | null;
  bmrKcal: number | null;
};

// Pas exposé par la lib garmin-connect : appel direct à l'endpoint résumé quotidien
// (même client HTTP authentifié que pour le Body Battery).
export async function fetchCaloriesForDate(date: Date): Promise<CaloriesDay> {
  try {
    return await withGarmin(async (c) => {
      const displayName = await getDisplayName(c);
      const dateStr = dateKey(date);
      const url = `${CONNECT_API}/usersummary-service/usersummary/daily/${displayName}`;
      const data: any = await c.client.get(url, { params: { calendarDate: dateStr } });
      return {
        totalKcal: data?.totalKilocalories ?? null,
        activeKcal: data?.activeKilocalories ?? null,
        bmrKcal: data?.bmrKilocalories ?? null,
      };
    });
  } catch (error) {
    console.error(`Impossible de récupérer les calories du ${dateKey(date)} :`, error);
    return { totalKcal: null, activeKcal: null, bmrKcal: null };
  }
}

export type ActivitySummary = {
  id: number;
  name: string;
  type: string;
  startTime: string;
  durationMinutes: number;
  distanceKm: number | null;
  calories: number | null;
  avgHr: number | null;
};

export async function fetchActivities(limit = 20): Promise<ActivitySummary[]> {
  try {
    return await withGarmin(async (c) => {
      const activities = await c.getActivities(0, limit);
      return activities.map((a: any) => ({
        id: a.activityId,
        name: a.activityName || "Activité",
        type: a.activityType?.typeKey ?? "autre",
        startTime: a.startTimeLocal,
        durationMinutes: Math.round((a.duration ?? 0) / 60),
        distanceKm: a.distance ? Math.round((a.distance / 1000) * 100) / 100 : null,
        calories: a.calories ?? null,
        avgHr: a.averageHR ?? null,
      }));
    });
  } catch (error) {
    console.error("Impossible de récupérer les activités :", error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Fonctions utilisées par la page Santé : lisent l'historique en base (alimenté
// par la synchro horaire) plutôt que d'interroger Garmin à chaque affichage.
// ---------------------------------------------------------------------------

export type StepsDay = { date: string; steps: number };

export async function getStepsHistory(days = 7): Promise<StepsDay[]> {
  const rows = await getStepsHistoryFromDb(days);
  const byDate = new Map(rows.map((r) => [r.date, r.steps]));

  const result: StepsDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = dateKey(d);
    result.push({ date: key, steps: byDate.get(key) ?? 0 });
  }
  return result;
}

export type SleepSummary = {
  totalMinutes: number;
  deepMinutes: number;
  lightMinutes: number;
  remMinutes: number;
  awakeMinutes: number;
  score: number | null;
  restingHr: number | null;
  avgHrv: number | null;
};

export async function getLastNightSleep(): Promise<SleepSummary | null> {
  const row = await getLatestSleepFromDb();
  if (!row) return null;
  return {
    totalMinutes: row.totalMinutes,
    deepMinutes: row.deepMinutes,
    lightMinutes: row.lightMinutes,
    remMinutes: row.remMinutes,
    awakeMinutes: row.awakeMinutes,
    score: row.score,
    restingHr: row.restingHr,
    avgHrv: row.avgHrv,
  };
}

// Le Body Battery intrajournalier n'est pas stocké finement en base (juste le
// résumé du jour) : la courbe "aujourd'hui" reste lue en direct, avec cache court.
export async function getBodyBatteryToday(): Promise<BodyBatteryPoint[]> {
  return cached("body-battery", async () => {
    const day = await fetchBodyBatteryForDate(new Date());
    return day.points;
  });
}

// Comme le Body Battery, la courbe intrajournalière n'est pas persistée finement :
// lue en direct avec cache court. Le résumé du jour (min/max/repos) est stocké en base.
export async function getHeartRateToday(): Promise<HeartRateDay> {
  return cached("heart-rate", () => fetchHeartRateForDate(new Date()));
}

export type CaloriesDayHistory = { date: string; totalKcal: number; activeKcal: number };

export async function getCaloriesHistory(days = 7): Promise<CaloriesDayHistory[]> {
  const rows = await getCaloriesHistoryFromDb(days);
  const byDate = new Map(rows.map((r) => [r.date, r]));

  const result: CaloriesDayHistory[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = dateKey(d);
    const row = byDate.get(key);
    result.push({ date: key, totalKcal: row?.totalKcal ?? 0, activeKcal: row?.activeKcal ?? 0 });
  }
  return result;
}

export async function getRecentActivities(limit = 8): Promise<ActivitySummary[]> {
  const rows = await getRecentActivitiesFromDb(limit);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    startTime: r.startTime,
    durationMinutes: r.durationMinutes,
    distanceKm: r.distanceKm,
    calories: r.calories,
    avgHr: null,
  }));
}
