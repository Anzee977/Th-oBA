import mysql from "mysql2/promise";

export function isHealthDbEnabled(): boolean {
  return Boolean(process.env.HEALTH_DB_USER && process.env.HEALTH_DB_PASSWORD);
}

let pool: mysql.Pool | null = null;
let schemaReady: Promise<void> | null = null;

function getPool(): mysql.Pool {
  if (pool) return pool;
  pool = mysql.createPool({
    host: process.env.HEALTH_DB_HOST || "db",
    user: process.env.HEALTH_DB_USER,
    password: process.env.HEALTH_DB_PASSWORD,
    database: process.env.HEALTH_DB_NAME || "health",
    waitForConnections: true,
    connectionLimit: 5,
    dateStrings: true,
  });
  return pool;
}

async function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const p = getPool();
      await p.query(`
        CREATE TABLE IF NOT EXISTS daily_metrics (
          date DATE PRIMARY KEY,
          steps INT NULL,
          sleep_total_minutes INT NULL,
          sleep_deep_minutes INT NULL,
          sleep_light_minutes INT NULL,
          sleep_rem_minutes INT NULL,
          sleep_awake_minutes INT NULL,
          sleep_score INT NULL,
          resting_hr INT NULL,
          avg_hrv INT NULL,
          hr_min INT NULL,
          hr_max INT NULL,
          body_battery_min INT NULL,
          body_battery_max INT NULL,
          body_battery_charged INT NULL,
          body_battery_drained INT NULL,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      // Migration pour les bases déjà déployées avant l'ajout de ces colonnes.
      await p.query(`ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS hr_min INT NULL`);
      await p.query(`ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS hr_max INT NULL`);
      await p.query(`ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS calories_total INT NULL`);
      await p.query(`ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS calories_active INT NULL`);
      await p.query(`ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS calories_bmr INT NULL`);
      await p.query(`
        CREATE TABLE IF NOT EXISTS activities (
          activity_id BIGINT PRIMARY KEY,
          name VARCHAR(255),
          type VARCHAR(100),
          start_time DATETIME,
          duration_minutes INT,
          distance_km DECIMAL(6, 2) NULL,
          calories INT NULL,
          avg_hr INT NULL,
          synced_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      // Courbes intrajournalières complètes (un point toutes les quelques minutes),
      // pour permettre des analyses fines a posteriori (ex: impact de compléments).
      await p.query(`
        CREATE TABLE IF NOT EXISTS body_battery_points (
          date DATE NOT NULL,
          ts BIGINT NOT NULL,
          level INT NOT NULL,
          PRIMARY KEY (date, ts)
        )
      `);
      await p.query(`
        CREATE TABLE IF NOT EXISTS heart_rate_points (
          date DATE NOT NULL,
          ts BIGINT NOT NULL,
          bpm INT NOT NULL,
          PRIMARY KEY (date, ts)
        )
      `);
      // Suivi des prises de compléments alimentaires (whey, créatine, mélatonine...),
      // horodaté précisément pour pouvoir croiser plus tard avec les autres métriques.
      await p.query(`
        CREATE TABLE IF NOT EXISTS supplement_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          supplement VARCHAR(32) NOT NULL,
          date DATE NOT NULL,
          logged_at DATETIME NOT NULL,
          INDEX idx_supplement_date (supplement, date)
        )
      `);
      // Suivi café / repas. `size` ne s'applique qu'aux repas (petit/moyen/grand).
      await p.query(`
        CREATE TABLE IF NOT EXISTS nutrition_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          category VARCHAR(16) NOT NULL,
          size VARCHAR(16) NULL,
          date DATE NOT NULL,
          logged_at DATETIME NOT NULL,
          INDEX idx_category_date (category, date)
        )
      `);
      await p.query(`
        CREATE TABLE IF NOT EXISTS todos (
          id INT AUTO_INCREMENT PRIMARY KEY,
          text VARCHAR(500) NOT NULL,
          category VARCHAR(100) NULL,
          due_date DATE NULL,
          done TINYINT(1) NOT NULL DEFAULT 0,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          completed_at DATETIME NULL
        )
      `);
      await p.query(`
        CREATE TABLE IF NOT EXISTS push_subscriptions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          endpoint VARCHAR(512) NOT NULL UNIQUE,
          p256dh VARCHAR(255) NOT NULL,
          auth VARCHAR(255) NOT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      // Événements du calendrier perso. `recurrence` + `start_date` (date ancre) suffisent
      // à reconstruire toutes les occurrences (voir lib/calendarEvents.ts:expandEvents).
      await p.query(`
        CREATE TABLE IF NOT EXISTS calendar_events (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          start_date DATE NOT NULL,
          start_time TIME NULL,
          recurrence VARCHAR(16) NOT NULL DEFAULT 'none',
          end_date DATE NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      // Activités sportives saisies à la main (secours quand la montre n'était pas portée).
      // `linked_activity_id` pointe vers `activities.activity_id` quand la synchro a trouvé
      // une activité Garmin correspondante le même jour (voir lib/manualActivities.ts).
      await p.query(`
        CREATE TABLE IF NOT EXISTS manual_activities (
          id INT AUTO_INCREMENT PRIMARY KEY,
          sport VARCHAR(32) NOT NULL,
          duration_minutes INT NOT NULL,
          date DATE NOT NULL,
          estimated_calories INT NULL,
          linked_activity_id BIGINT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      // Pesées manuelles, une ligne par pesée (historique complet, pas juste la dernière
      // valeur) — sert aussi de source de vérité pour le poids utilisé dans l'estimation
      // de calories des activités manuelles (voir getLatestWeightKg).
      await p.query(`
        CREATE TABLE IF NOT EXISTS weight_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          weight_kg DECIMAL(5,2) NOT NULL,
          date DATE NOT NULL,
          logged_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_weight_logs_date (date)
        )
      `);
      // Sous-catégories de patrimoine = "contenants" (ex: "Ledger", "Binance", "Trade
      // Republic", "Compte courant BNP"), regroupés sous une des 3 catégories fixes
      // (crypto / tradfi / cash). Voir lib/networth.ts pour la valorisation en direct.
      await p.query(`
        CREATE TABLE IF NOT EXISTS networth_containers (
          id INT AUTO_INCREMENT PRIMARY KEY,
          category VARCHAR(16) NOT NULL,
          name VARCHAR(100) NOT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      // Possessions détenues dans un contenant (ex: "Solana" dans "Ledger", "Coca-Cola" dans
      // "Trade Republic"). `symbol` sert à récupérer le prix en direct (identifiant CoinGecko
      // pour crypto, ticker Yahoo Finance pour tradfi) ; `currency` n'est utilisé que pour la
      // catégorie cash.
      await p.query(`
        CREATE TABLE IF NOT EXISTS networth_holdings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          container_id INT NOT NULL,
          name VARCHAR(100) NOT NULL,
          symbol VARCHAR(32) NULL,
          currency VARCHAR(8) NOT NULL DEFAULT 'EUR',
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_networth_holdings_container (container_id),
          FOREIGN KEY (container_id) REFERENCES networth_containers(id) ON DELETE CASCADE
        )
      `);
      // Historique des ajouts/retraits sur une possession. `quantity` signée (positif =
      // achat/dépôt, négatif = vente/retrait) ; la quantité détenue actuelle = SUM(quantity).
      await p.query(`
        CREATE TABLE IF NOT EXISTS networth_transactions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          holding_id INT NOT NULL,
          quantity DECIMAL(24,8) NOT NULL,
          date DATE NOT NULL,
          note VARCHAR(255) NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_networth_tx_holding (holding_id),
          FOREIGN KEY (holding_id) REFERENCES networth_holdings(id) ON DELETE CASCADE
        )
      `);
      // Instantané quotidien du Net Worth total (une ligne par jour, upsertée au fil de la
      // journée à mesure que les prix bougent — voir lib/networth.ts:runNetworthSnapshot,
      // programmé dans instrumentation.ts). Sert au graphique d'évolution du dashboard.
      await p.query(`
        CREATE TABLE IF NOT EXISTS networth_snapshots (
          date DATE PRIMARY KEY,
          total_eur DECIMAL(14,2) NOT NULL,
          crypto_eur DECIMAL(14,2) NOT NULL,
          tradfi_eur DECIMAL(14,2) NOT NULL,
          cash_eur DECIMAL(14,2) NOT NULL,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      // Jetons OAuth du compte Gmail dédié (voir lib/gmail.ts). Une seule ligne (id=1) : usage
      // strictement personnel, un seul compte connecté à la fois. `refresh_token` est le seul
      // champ qui compte vraiment (longue durée) ; `access_token`/`access_token_expires_at`
      // sont juste un cache pour éviter de rafraîchir à chaque appel API.
      await p.query(`
        CREATE TABLE IF NOT EXISTS mail_oauth_tokens (
          id TINYINT PRIMARY KEY DEFAULT 1,
          refresh_token TEXT NOT NULL,
          access_token TEXT NULL,
          access_token_expires_at DATETIME NULL,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
    })();
  }
  await schemaReady;
}

export type DailyMetricsUpsert = {
  date: string;
  steps?: number | null;
  sleepTotalMinutes?: number | null;
  sleepDeepMinutes?: number | null;
  sleepLightMinutes?: number | null;
  sleepRemMinutes?: number | null;
  sleepAwakeMinutes?: number | null;
  sleepScore?: number | null;
  restingHr?: number | null;
  avgHrv?: number | null;
  hrMin?: number | null;
  hrMax?: number | null;
  bodyBatteryMin?: number | null;
  bodyBatteryMax?: number | null;
  bodyBatteryCharged?: number | null;
  bodyBatteryDrained?: number | null;
  caloriesTotal?: number | null;
  caloriesActive?: number | null;
  caloriesBmr?: number | null;
};

// Upsert "défensif" : un champ non fourni (undefined/null) ne remplace pas une valeur déjà
// connue en base (COALESCE), pour ne pas effacer des données lors d'une resynchronisation
// partielle (ex: Garmin qui répond temporairement sans les données de sommeil).
export async function upsertDailyMetrics(data: DailyMetricsUpsert): Promise<void> {
  if (!isHealthDbEnabled()) return;
  await ensureSchema();
  const p = getPool();
  await p.query(
    `INSERT INTO daily_metrics (
       date, steps, sleep_total_minutes, sleep_deep_minutes, sleep_light_minutes,
       sleep_rem_minutes, sleep_awake_minutes, sleep_score, resting_hr, avg_hrv,
       hr_min, hr_max,
       body_battery_min, body_battery_max, body_battery_charged, body_battery_drained,
       calories_total, calories_active, calories_bmr
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       steps = COALESCE(VALUES(steps), steps),
       sleep_total_minutes = COALESCE(VALUES(sleep_total_minutes), sleep_total_minutes),
       sleep_deep_minutes = COALESCE(VALUES(sleep_deep_minutes), sleep_deep_minutes),
       sleep_light_minutes = COALESCE(VALUES(sleep_light_minutes), sleep_light_minutes),
       sleep_rem_minutes = COALESCE(VALUES(sleep_rem_minutes), sleep_rem_minutes),
       sleep_awake_minutes = COALESCE(VALUES(sleep_awake_minutes), sleep_awake_minutes),
       sleep_score = COALESCE(VALUES(sleep_score), sleep_score),
       resting_hr = COALESCE(VALUES(resting_hr), resting_hr),
       avg_hrv = COALESCE(VALUES(avg_hrv), avg_hrv),
       hr_min = COALESCE(VALUES(hr_min), hr_min),
       hr_max = COALESCE(VALUES(hr_max), hr_max),
       body_battery_min = COALESCE(VALUES(body_battery_min), body_battery_min),
       body_battery_max = COALESCE(VALUES(body_battery_max), body_battery_max),
       body_battery_charged = COALESCE(VALUES(body_battery_charged), body_battery_charged),
       body_battery_drained = COALESCE(VALUES(body_battery_drained), body_battery_drained),
       calories_total = COALESCE(VALUES(calories_total), calories_total),
       calories_active = COALESCE(VALUES(calories_active), calories_active),
       calories_bmr = COALESCE(VALUES(calories_bmr), calories_bmr)`,
    [
      data.date,
      data.steps ?? null,
      data.sleepTotalMinutes ?? null,
      data.sleepDeepMinutes ?? null,
      data.sleepLightMinutes ?? null,
      data.sleepRemMinutes ?? null,
      data.sleepAwakeMinutes ?? null,
      data.sleepScore ?? null,
      data.restingHr ?? null,
      data.avgHrv ?? null,
      data.hrMin ?? null,
      data.hrMax ?? null,
      data.bodyBatteryMin ?? null,
      data.bodyBatteryMax ?? null,
      data.bodyBatteryCharged ?? null,
      data.bodyBatteryDrained ?? null,
      data.caloriesTotal ?? null,
      data.caloriesActive ?? null,
      data.caloriesBmr ?? null,
    ],
  );
}

export type ActivityUpsert = {
  activityId: number;
  name: string;
  type: string;
  startTime: string;
  durationMinutes: number;
  distanceKm: number | null;
  calories: number | null;
  avgHr: number | null;
};

export async function upsertActivities(activities: ActivityUpsert[]): Promise<void> {
  if (!isHealthDbEnabled() || activities.length === 0) return;
  await ensureSchema();
  const p = getPool();
  for (const a of activities) {
    await p.query(
      `INSERT INTO activities (activity_id, name, type, start_time, duration_minutes, distance_km, calories, avg_hr)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         type = VALUES(type),
         start_time = VALUES(start_time),
         duration_minutes = VALUES(duration_minutes),
         distance_km = VALUES(distance_km),
         calories = VALUES(calories),
         avg_hr = VALUES(avg_hr)`,
      [a.activityId, a.name, a.type, a.startTime, a.durationMinutes, a.distanceKm, a.calories, a.avgHr],
    );
  }
}

export async function upsertBodyBatteryPoints(
  date: string,
  points: { timestamp: number; level: number }[],
): Promise<void> {
  if (!isHealthDbEnabled() || points.length === 0) return;
  await ensureSchema();
  const p = getPool();
  const rows = points.map((pt) => [date, pt.timestamp, pt.level]);
  await p.query(
    `INSERT INTO body_battery_points (date, ts, level) VALUES ?
     ON DUPLICATE KEY UPDATE level = VALUES(level)`,
    [rows],
  );
}

export async function upsertHeartRatePoints(
  date: string,
  points: { timestamp: number; bpm: number }[],
): Promise<void> {
  if (!isHealthDbEnabled() || points.length === 0) return;
  await ensureSchema();
  const p = getPool();
  const rows = points.map((pt) => [date, pt.timestamp, pt.bpm]);
  await p.query(
    `INSERT INTO heart_rate_points (date, ts, bpm) VALUES ?
     ON DUPLICATE KEY UPDATE bpm = VALUES(bpm)`,
    [rows],
  );
}

export async function getBodyBatteryPointsFromDb(
  date: string,
): Promise<{ timestamp: number; level: number }[]> {
  if (!isHealthDbEnabled()) return [];
  await ensureSchema();
  const p = getPool();
  const [rows] = await p.query(`SELECT ts, level FROM body_battery_points WHERE date = ? ORDER BY ts ASC`, [
    date,
  ]);
  return (rows as any[]).map((r) => ({ timestamp: Number(r.ts), level: r.level }));
}

export async function getHeartRatePointsFromDb(
  date: string,
): Promise<{ timestamp: number; bpm: number }[]> {
  if (!isHealthDbEnabled()) return [];
  await ensureSchema();
  const p = getPool();
  const [rows] = await p.query(`SELECT ts, bpm FROM heart_rate_points WHERE date = ? ORDER BY ts ASC`, [
    date,
  ]);
  return (rows as any[]).map((r) => ({ timestamp: Number(r.ts), bpm: r.bpm }));
}

export type StepsDayRow = { date: string; steps: number };

export async function getStepsHistoryFromDb(days: number): Promise<StepsDayRow[]> {
  if (!isHealthDbEnabled()) return [];
  await ensureSchema();
  const p = getPool();
  const [rows] = await p.query(
    `SELECT date, steps FROM daily_metrics
     WHERE date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     ORDER BY date ASC`,
    [days - 1],
  );
  return (rows as any[]).map((r) => ({ date: r.date, steps: r.steps ?? 0 }));
}

export type CaloriesDayRow = { date: string; totalKcal: number; activeKcal: number };

export async function getCaloriesHistoryFromDb(days: number): Promise<CaloriesDayRow[]> {
  if (!isHealthDbEnabled()) return [];
  await ensureSchema();
  const p = getPool();
  const [rows] = await p.query(
    `SELECT date, calories_total, calories_active FROM daily_metrics
     WHERE date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     ORDER BY date ASC`,
    [days - 1],
  );
  return (rows as any[]).map((r) => ({
    date: r.date,
    totalKcal: r.calories_total ?? 0,
    activeKcal: r.calories_active ?? 0,
  }));
}

export type SleepRow = {
  date: string;
  totalMinutes: number;
  deepMinutes: number;
  lightMinutes: number;
  remMinutes: number;
  awakeMinutes: number;
  score: number | null;
  restingHr: number | null;
  avgHrv: number | null;
};

export async function getLatestSleepFromDb(): Promise<SleepRow | null> {
  if (!isHealthDbEnabled()) return null;
  await ensureSchema();
  const p = getPool();
  const [rows] = await p.query(
    `SELECT date, sleep_total_minutes, sleep_deep_minutes, sleep_light_minutes,
            sleep_rem_minutes, sleep_awake_minutes, sleep_score, resting_hr, avg_hrv
     FROM daily_metrics
     WHERE sleep_total_minutes IS NOT NULL
     ORDER BY date DESC
     LIMIT 1`,
  );
  const row = (rows as any[])[0];
  if (!row) return null;
  return {
    date: row.date,
    totalMinutes: row.sleep_total_minutes,
    deepMinutes: row.sleep_deep_minutes ?? 0,
    lightMinutes: row.sleep_light_minutes ?? 0,
    remMinutes: row.sleep_rem_minutes ?? 0,
    awakeMinutes: row.sleep_awake_minutes ?? 0,
    score: row.sleep_score,
    restingHr: row.resting_hr,
    avgHrv: row.avg_hrv,
  };
}

const MAX_DOSES_PER_DAY = 3;

// Renvoie, pour chaque complément pris aujourd'hui, la liste des heures de prise ("HH:MM").
export async function getSupplementStatusToday(): Promise<Record<string, string[]>> {
  if (!isHealthDbEnabled()) return {};
  await ensureSchema();
  const p = getPool();
  const [rows] = await p.query(
    `SELECT supplement, logged_at FROM supplement_logs WHERE date = CURDATE() ORDER BY logged_at ASC`,
  );
  const result: Record<string, string[]> = {};
  for (const r of rows as any[]) {
    const time = String(r.logged_at).slice(11, 16);
    (result[r.supplement] ??= []).push(time);
  }
  return result;
}

export async function logSupplementDose(
  supplement: string,
): Promise<{ ok: boolean; times: string[] }> {
  if (!isHealthDbEnabled()) return { ok: false, times: [] };
  await ensureSchema();
  const p = getPool();

  const [countRows] = await p.query(
    `SELECT COUNT(*) AS c FROM supplement_logs WHERE supplement = ? AND date = CURDATE()`,
    [supplement],
  );
  const count = Number((countRows as any[])[0].c);

  if (count >= MAX_DOSES_PER_DAY) {
    const status = await getSupplementStatusToday();
    return { ok: false, times: status[supplement] ?? [] };
  }

  await p.query(`INSERT INTO supplement_logs (supplement, date, logged_at) VALUES (?, CURDATE(), NOW())`, [
    supplement,
  ]);

  const status = await getSupplementStatusToday();
  return { ok: true, times: status[supplement] ?? [] };
}

export async function undoLastSupplementDose(supplement: string): Promise<string[]> {
  if (!isHealthDbEnabled()) return [];
  await ensureSchema();
  const p = getPool();
  await p.query(
    `DELETE FROM supplement_logs WHERE supplement = ? AND date = CURDATE() ORDER BY logged_at DESC LIMIT 1`,
    [supplement],
  );
  const status = await getSupplementStatusToday();
  return status[supplement] ?? [];
}

export type SupplementHistoryRow = { date: string; supplement: string; count: number };

export async function getSupplementHistory(days: number): Promise<SupplementHistoryRow[]> {
  if (!isHealthDbEnabled()) return [];
  await ensureSchema();
  const p = getPool();
  const [rows] = await p.query(
    `SELECT date, supplement, COUNT(*) AS count
     FROM supplement_logs
     WHERE date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     GROUP BY date, supplement
     ORDER BY date ASC`,
    [days - 1],
  );
  return (rows as any[]).map((r) => ({
    date: r.date,
    supplement: r.supplement,
    count: Number(r.count),
  }));
}

export type MealSize = "petit" | "moyen" | "grand";
export type AlcoholLevel = "un_peu" | "moyen" | "beaucoup";
export type MealEntry = { time: string; size: MealSize };
export type AlcoholEntry = { time: string; level: AlcoholLevel };
export type NutritionStatus = {
  coffeeTimes: string[];
  meals: MealEntry[];
  alcohol: AlcoholEntry[];
};

const EMPTY_NUTRITION_STATUS: NutritionStatus = { coffeeTimes: [], meals: [], alcohol: [] };

// Renvoie l'état du jour (heures des cafés, repas avec taille, alcool avec niveau).
export async function getNutritionStatusToday(): Promise<NutritionStatus> {
  if (!isHealthDbEnabled()) return EMPTY_NUTRITION_STATUS;
  await ensureSchema();
  const p = getPool();
  const [rows] = await p.query(
    `SELECT category, size, logged_at FROM nutrition_logs WHERE date = CURDATE() ORDER BY logged_at ASC`,
  );

  const coffeeTimes: string[] = [];
  const meals: MealEntry[] = [];
  const alcohol: AlcoholEntry[] = [];
  for (const r of rows as any[]) {
    const time = String(r.logged_at).slice(11, 16);
    if (r.category === "cafe") {
      coffeeTimes.push(time);
    } else if (r.category === "repas") {
      meals.push({ time, size: r.size });
    } else if (r.category === "alcool") {
      alcohol.push({ time, level: r.size });
    }
  }
  return { coffeeTimes, meals, alcohol };
}

export async function logCoffee(): Promise<NutritionStatus> {
  if (!isHealthDbEnabled()) return EMPTY_NUTRITION_STATUS;
  await ensureSchema();
  const p = getPool();
  await p.query(
    `INSERT INTO nutrition_logs (category, size, date, logged_at) VALUES ('cafe', NULL, CURDATE(), NOW())`,
  );
  return getNutritionStatusToday();
}

export async function undoLastCoffee(): Promise<NutritionStatus> {
  if (!isHealthDbEnabled()) return EMPTY_NUTRITION_STATUS;
  await ensureSchema();
  const p = getPool();
  await p.query(
    `DELETE FROM nutrition_logs WHERE category = 'cafe' AND date = CURDATE() ORDER BY logged_at DESC LIMIT 1`,
  );
  return getNutritionStatusToday();
}

export async function logMeal(size: MealSize): Promise<NutritionStatus> {
  if (!isHealthDbEnabled()) return EMPTY_NUTRITION_STATUS;
  await ensureSchema();
  const p = getPool();
  await p.query(
    `INSERT INTO nutrition_logs (category, size, date, logged_at) VALUES ('repas', ?, CURDATE(), NOW())`,
    [size],
  );
  return getNutritionStatusToday();
}

export async function undoLastMeal(): Promise<NutritionStatus> {
  if (!isHealthDbEnabled()) return EMPTY_NUTRITION_STATUS;
  await ensureSchema();
  const p = getPool();
  await p.query(
    `DELETE FROM nutrition_logs WHERE category = 'repas' AND date = CURDATE() ORDER BY logged_at DESC LIMIT 1`,
  );
  return getNutritionStatusToday();
}

export async function logAlcohol(level: AlcoholLevel): Promise<NutritionStatus> {
  if (!isHealthDbEnabled()) return EMPTY_NUTRITION_STATUS;
  await ensureSchema();
  const p = getPool();
  await p.query(
    `INSERT INTO nutrition_logs (category, size, date, logged_at) VALUES ('alcool', ?, CURDATE(), NOW())`,
    [level],
  );
  return getNutritionStatusToday();
}

export async function undoLastAlcohol(): Promise<NutritionStatus> {
  if (!isHealthDbEnabled()) return EMPTY_NUTRITION_STATUS;
  await ensureSchema();
  const p = getPool();
  await p.query(
    `DELETE FROM nutrition_logs WHERE category = 'alcool' AND date = CURDATE() ORDER BY logged_at DESC LIMIT 1`,
  );
  return getNutritionStatusToday();
}

export type NutritionHistoryRow = {
  date: string;
  category: "cafe" | "repas" | "alcool";
  count: number;
};

export async function getNutritionHistory(days: number): Promise<NutritionHistoryRow[]> {
  if (!isHealthDbEnabled()) return [];
  await ensureSchema();
  const p = getPool();
  const [rows] = await p.query(
    `SELECT date, category, COUNT(*) AS count
     FROM nutrition_logs
     WHERE date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     GROUP BY date, category
     ORDER BY date ASC`,
    [days - 1],
  );
  return (rows as any[]).map((r) => ({
    date: r.date,
    category: r.category,
    count: Number(r.count),
  }));
}

export type TodoRow = {
  id: number;
  text: string;
  category: string | null;
  dueDate: string | null;
  done: boolean;
  createdAt: string;
};

export async function listTodos(): Promise<TodoRow[]> {
  if (!isHealthDbEnabled()) return [];
  await ensureSchema();
  const p = getPool();
  const [rows] = await p.query(
    `SELECT id, text, category, due_date, done, created_at FROM todos
     ORDER BY done ASC, (due_date IS NULL) ASC, due_date ASC, created_at DESC`,
  );
  return (rows as any[]).map((r) => ({
    id: r.id,
    text: r.text,
    category: r.category,
    dueDate: r.due_date,
    done: Boolean(r.done),
    createdAt: r.created_at,
  }));
}

export async function listTodoCategories(): Promise<string[]> {
  if (!isHealthDbEnabled()) return [];
  await ensureSchema();
  const p = getPool();
  const [rows] = await p.query(
    `SELECT DISTINCT category FROM todos WHERE category IS NOT NULL AND category != '' ORDER BY category ASC`,
  );
  return (rows as any[]).map((r) => r.category);
}

export async function createTodo(data: {
  text: string;
  category: string | null;
  dueDate: string | null;
}): Promise<void> {
  if (!isHealthDbEnabled()) return;
  await ensureSchema();
  const p = getPool();
  await p.query(`INSERT INTO todos (text, category, due_date) VALUES (?, ?, ?)`, [
    data.text,
    data.category || null,
    data.dueDate || null,
  ]);
}

export async function setTodoDone(id: number, done: boolean): Promise<void> {
  if (!isHealthDbEnabled()) return;
  await ensureSchema();
  const p = getPool();
  await p.query(`UPDATE todos SET done = ?, completed_at = ? WHERE id = ?`, [
    done ? 1 : 0,
    done ? new Date() : null,
    id,
  ]);
}

export async function deleteTodo(id: number): Promise<void> {
  if (!isHealthDbEnabled()) return;
  await ensureSchema();
  const p = getPool();
  await p.query(`DELETE FROM todos WHERE id = ?`, [id]);
}

export type ActivityListRow = {
  id: number;
  name: string;
  type: string;
  startTime: string;
  durationMinutes: number;
  distanceKm: number | null;
  calories: number | null;
};

export async function getRecentActivitiesFromDb(limit: number): Promise<ActivityListRow[]> {
  if (!isHealthDbEnabled()) return [];
  await ensureSchema();
  const p = getPool();
  const [rows] = await p.query(
    `SELECT activity_id, name, type, start_time, duration_minutes, distance_km, calories
     FROM activities
     ORDER BY start_time DESC
     LIMIT ?`,
    [limit],
  );
  return (rows as any[]).map((r) => ({
    id: r.activity_id,
    name: r.name,
    type: r.type,
    startTime: r.start_time,
    durationMinutes: r.duration_minutes,
    distanceKm: r.distance_km != null ? Number(r.distance_km) : null,
    calories: r.calories,
  }));
}

export type CorrelationDayRow = {
  date: string;
  sleepTotalMinutes: number | null;
  sleepScore: number | null;
  bodyBatteryMin: number | null;
  bodyBatteryMax: number | null;
  bodyBatteryCharged: number | null;
  restingHr: number | null;
  steps: number | null;
  caloriesTotal: number | null;
  supplements: string[];
  coffeeCount: number;
  mealSizes: string[];
  alcoholLevels: string[];
};

// Fusionne daily_metrics + supplement_logs + nutrition_logs par jour calendaire, pour
// la page Analyse (comparaison "jours avec X" vs "jours sans X").
export async function getCorrelationData(days: number): Promise<CorrelationDayRow[]> {
  if (!isHealthDbEnabled()) return [];
  await ensureSchema();
  const p = getPool();

  const [metricsRows] = await p.query(
    `SELECT date, sleep_total_minutes, sleep_score, body_battery_min, body_battery_max,
            body_battery_charged, resting_hr, steps, calories_total
     FROM daily_metrics WHERE date >= DATE_SUB(CURDATE(), INTERVAL ? DAY) ORDER BY date ASC`,
    [days - 1],
  );
  const [supplementRows] = await p.query(
    `SELECT date, supplement FROM supplement_logs WHERE date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)`,
    [days - 1],
  );
  const [nutritionRows] = await p.query(
    `SELECT date, category, size FROM nutrition_logs WHERE date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)`,
    [days - 1],
  );

  const byDate = new Map<string, CorrelationDayRow>();
  const getDay = (date: string): CorrelationDayRow => {
    let row = byDate.get(date);
    if (!row) {
      row = {
        date,
        sleepTotalMinutes: null,
        sleepScore: null,
        bodyBatteryMin: null,
        bodyBatteryMax: null,
        bodyBatteryCharged: null,
        restingHr: null,
        steps: null,
        caloriesTotal: null,
        supplements: [],
        coffeeCount: 0,
        mealSizes: [],
        alcoholLevels: [],
      };
      byDate.set(date, row);
    }
    return row;
  };

  for (const r of metricsRows as any[]) {
    const row = getDay(r.date);
    row.sleepTotalMinutes = r.sleep_total_minutes;
    row.sleepScore = r.sleep_score;
    row.bodyBatteryMin = r.body_battery_min;
    row.bodyBatteryMax = r.body_battery_max;
    row.bodyBatteryCharged = r.body_battery_charged;
    row.restingHr = r.resting_hr;
    row.steps = r.steps;
    row.caloriesTotal = r.calories_total;
  }
  for (const r of supplementRows as any[]) {
    getDay(r.date).supplements.push(r.supplement);
  }
  for (const r of nutritionRows as any[]) {
    const row = getDay(r.date);
    if (r.category === "cafe") row.coffeeCount += 1;
    else if (r.category === "repas") row.mealSizes.push(r.size);
    else if (r.category === "alcool") row.alcoholLevels.push(r.size);
  }

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

// ---------------------------------------------------------------------------
// Export CSV : récupération intégrale (pas de fenêtre de temps), pour analyse externe.
// ---------------------------------------------------------------------------

export async function getAllDailyMetrics(): Promise<Record<string, unknown>[]> {
  if (!isHealthDbEnabled()) return [];
  await ensureSchema();
  const p = getPool();
  const [rows] = await p.query(`SELECT * FROM daily_metrics ORDER BY date ASC`);
  return rows as Record<string, unknown>[];
}

export async function getAllActivitiesForExport(): Promise<Record<string, unknown>[]> {
  if (!isHealthDbEnabled()) return [];
  await ensureSchema();
  const p = getPool();
  const [rows] = await p.query(
    `SELECT activity_id, name, type, start_time, duration_minutes, distance_km, calories, avg_hr
     FROM activities ORDER BY start_time ASC`,
  );
  return rows as Record<string, unknown>[];
}

export async function getAllSupplementLogsForExport(): Promise<Record<string, unknown>[]> {
  if (!isHealthDbEnabled()) return [];
  await ensureSchema();
  const p = getPool();
  const [rows] = await p.query(
    `SELECT supplement, date, logged_at FROM supplement_logs ORDER BY logged_at ASC`,
  );
  return rows as Record<string, unknown>[];
}

export async function getAllNutritionLogsForExport(): Promise<Record<string, unknown>[]> {
  if (!isHealthDbEnabled()) return [];
  await ensureSchema();
  const p = getPool();
  const [rows] = await p.query(
    `SELECT category, size, date, logged_at FROM nutrition_logs ORDER BY logged_at ASC`,
  );
  return rows as Record<string, unknown>[];
}

// ---------------------------------------------------------------------------
// Vérifications utilisées par les rappels du soir (voir lib/reminders.ts).
// ---------------------------------------------------------------------------

export async function getTodayMetricsUpdatedAt(): Promise<string | null> {
  if (!isHealthDbEnabled()) return null;
  await ensureSchema();
  const p = getPool();
  const [rows] = await p.query(`SELECT updated_at FROM daily_metrics WHERE date = CURDATE()`);
  const row = (rows as any[])[0];
  return row?.updated_at ?? null;
}

export async function hasSupplementLogToday(): Promise<boolean> {
  if (!isHealthDbEnabled()) return true;
  await ensureSchema();
  const p = getPool();
  const [rows] = await p.query(`SELECT COUNT(*) AS c FROM supplement_logs WHERE date = CURDATE()`);
  return Number((rows as any[])[0].c) > 0;
}

export async function hasMealLogToday(): Promise<boolean> {
  if (!isHealthDbEnabled()) return true;
  await ensureSchema();
  const p = getPool();
  const [rows] = await p.query(
    `SELECT COUNT(*) AS c FROM nutrition_logs WHERE category = 'repas' AND date = CURDATE()`,
  );
  return Number((rows as any[])[0].c) > 0;
}

export type PushSubscriptionRow = { endpoint: string; p256dh: string; auth: string };

export async function savePushSubscription(sub: {
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<void> {
  if (!isHealthDbEnabled()) return;
  await ensureSchema();
  const p = getPool();
  await p.query(
    `INSERT INTO push_subscriptions (endpoint, p256dh, auth) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE p256dh = VALUES(p256dh), auth = VALUES(auth)`,
    [sub.endpoint, sub.p256dh, sub.auth],
  );
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  if (!isHealthDbEnabled()) return;
  await ensureSchema();
  const p = getPool();
  await p.query(`DELETE FROM push_subscriptions WHERE endpoint = ?`, [endpoint]);
}

export async function listPushSubscriptions(): Promise<PushSubscriptionRow[]> {
  if (!isHealthDbEnabled()) return [];
  await ensureSchema();
  const p = getPool();
  const [rows] = await p.query(`SELECT endpoint, p256dh, auth FROM push_subscriptions`);
  return rows as PushSubscriptionRow[];
}

export type CalendarEventRow = {
  id: number;
  title: string;
  startDate: string;
  startTime: string | null;
  recurrence: string;
  endDate: string | null;
};

export async function listCalendarEvents(): Promise<CalendarEventRow[]> {
  if (!isHealthDbEnabled()) return [];
  await ensureSchema();
  const p = getPool();
  const [rows] = await p.query(
    `SELECT id, title, start_date, start_time, recurrence, end_date
     FROM calendar_events ORDER BY start_date ASC`,
  );
  return (rows as any[]).map((r) => ({
    id: r.id,
    title: r.title,
    startDate: r.start_date,
    startTime: r.start_time ? String(r.start_time).slice(0, 5) : null,
    recurrence: r.recurrence,
    endDate: r.end_date,
  }));
}

export async function createCalendarEvent(data: {
  title: string;
  startDate: string;
  startTime: string | null;
  recurrence: string;
  endDate: string | null;
}): Promise<CalendarEventRow> {
  await ensureSchema();
  const p = getPool();
  const [result] = await p.query(
    `INSERT INTO calendar_events (title, start_date, start_time, recurrence, end_date)
     VALUES (?, ?, ?, ?, ?)`,
    [data.title, data.startDate, data.startTime, data.recurrence, data.endDate],
  );
  const insertId = (result as any).insertId as number;
  return {
    id: insertId,
    title: data.title,
    startDate: data.startDate,
    startTime: data.startTime,
    recurrence: data.recurrence,
    endDate: data.endDate,
  };
}

export async function deleteCalendarEvent(id: number): Promise<void> {
  if (!isHealthDbEnabled()) return;
  await ensureSchema();
  const p = getPool();
  await p.query(`DELETE FROM calendar_events WHERE id = ?`, [id]);
}

export type ManualActivityRow = {
  id: number;
  sport: string;
  durationMinutes: number;
  date: string;
  estimatedCalories: number | null;
  linkedActivityId: number | null;
  linkedName: string | null;
  linkedCalories: number | null;
  linkedDistanceKm: number | null;
  linkedAvgHr: number | null;
};

export async function createManualActivity(data: {
  sport: string;
  durationMinutes: number;
  date: string;
}): Promise<ManualActivityRow> {
  await ensureSchema();
  const p = getPool();
  const [result] = await p.query(
    `INSERT INTO manual_activities (sport, duration_minutes, date) VALUES (?, ?, ?)`,
    [data.sport, data.durationMinutes, data.date],
  );
  return {
    id: (result as any).insertId,
    sport: data.sport,
    durationMinutes: data.durationMinutes,
    date: data.date,
    estimatedCalories: null,
    linkedActivityId: null,
    linkedName: null,
    linkedCalories: null,
    linkedDistanceKm: null,
    linkedAvgHr: null,
  };
}

export async function listManualActivities(limit: number): Promise<ManualActivityRow[]> {
  if (!isHealthDbEnabled()) return [];
  await ensureSchema();
  const p = getPool();
  const [rows] = await p.query(
    `SELECT m.id, m.sport, m.duration_minutes, m.date, m.estimated_calories, m.linked_activity_id,
            a.name AS linked_name, a.calories AS linked_calories,
            a.distance_km AS linked_distance_km, a.avg_hr AS linked_avg_hr
     FROM manual_activities m
     LEFT JOIN activities a ON a.activity_id = m.linked_activity_id
     ORDER BY m.date DESC, m.created_at DESC
     LIMIT ?`,
    [limit],
  );
  return (rows as any[]).map((r) => ({
    id: r.id,
    sport: r.sport,
    durationMinutes: r.duration_minutes,
    date: r.date,
    estimatedCalories: r.estimated_calories,
    linkedActivityId: r.linked_activity_id != null ? Number(r.linked_activity_id) : null,
    linkedName: r.linked_name,
    linkedCalories: r.linked_calories,
    linkedDistanceKm: r.linked_distance_km != null ? Number(r.linked_distance_km) : null,
    linkedAvgHr: r.linked_avg_hr,
  }));
}

export async function deleteManualActivity(id: number): Promise<void> {
  if (!isHealthDbEnabled()) return;
  await ensureSchema();
  const p = getPool();
  await p.query(`DELETE FROM manual_activities WHERE id = ?`, [id]);
}

export type UnlinkedManualActivity = {
  id: number;
  sport: string;
  durationMinutes: number;
  date: string;
};

export async function getUnlinkedManualActivities(): Promise<UnlinkedManualActivity[]> {
  if (!isHealthDbEnabled()) return [];
  await ensureSchema();
  const p = getPool();
  const [rows] = await p.query(
    `SELECT id, sport, duration_minutes, date FROM manual_activities WHERE linked_activity_id IS NULL`,
  );
  return (rows as any[]).map((r) => ({
    id: r.id,
    sport: r.sport,
    durationMinutes: r.duration_minutes,
    date: r.date,
  }));
}

// Cherche, pour un jour donné, une activité Garmin déjà synchronisée dont le type
// correspond au sport saisi manuellement (voir lib/manualActivities.ts:garminTypesFor).
export async function findMatchingGarminActivity(
  date: string,
  garminTypes: string[],
): Promise<number | null> {
  if (!isHealthDbEnabled() || garminTypes.length === 0) return null;
  await ensureSchema();
  const p = getPool();
  const placeholders = garminTypes.map(() => "?").join(",");
  const [rows] = await p.query(
    `SELECT activity_id FROM activities WHERE DATE(start_time) = ? AND type IN (${placeholders}) LIMIT 1`,
    [date, ...garminTypes],
  );
  const row = (rows as any[])[0];
  return row ? Number(row.activity_id) : null;
}

export async function linkManualActivity(id: number, activityId: number): Promise<void> {
  if (!isHealthDbEnabled()) return;
  await ensureSchema();
  const p = getPool();
  await p.query(
    `UPDATE manual_activities SET linked_activity_id = ?, estimated_calories = NULL WHERE id = ?`,
    [activityId, id],
  );
}

export async function setManualActivityEstimate(id: number, calories: number): Promise<void> {
  if (!isHealthDbEnabled()) return;
  await ensureSchema();
  const p = getPool();
  await p.query(`UPDATE manual_activities SET estimated_calories = ? WHERE id = ?`, [calories, id]);
}

export type WeightLogRow = { id: number; weightKg: number; date: string; loggedAt: string };

export async function logWeight(weightKg: number): Promise<WeightLogRow> {
  await ensureSchema();
  const p = getPool();
  const [result] = await p.query(
    `INSERT INTO weight_logs (weight_kg, date, logged_at) VALUES (?, CURDATE(), NOW())`,
    [weightKg],
  );
  const insertId = (result as any).insertId;
  const [rows] = await p.query(
    `SELECT id, weight_kg, date, logged_at FROM weight_logs WHERE id = ?`,
    [insertId],
  );
  const r = (rows as any[])[0];
  return { id: r.id, weightKg: Number(r.weight_kg), date: r.date, loggedAt: r.logged_at };
}

export async function deleteWeightLog(id: number): Promise<void> {
  if (!isHealthDbEnabled()) return;
  await ensureSchema();
  const p = getPool();
  await p.query(`DELETE FROM weight_logs WHERE id = ?`, [id]);
}

export async function listWeightLogs(limit: number): Promise<WeightLogRow[]> {
  if (!isHealthDbEnabled()) return [];
  await ensureSchema();
  const p = getPool();
  const [rows] = await p.query(
    `SELECT id, weight_kg, date, logged_at FROM weight_logs ORDER BY logged_at ASC LIMIT ?`,
    [limit],
  );
  return (rows as any[]).map((r) => ({
    id: r.id,
    weightKg: Number(r.weight_kg),
    date: r.date,
    loggedAt: r.logged_at,
  }));
}

// Dernier poids logué, utilisé pour affiner l'estimation de calories des activités
// manuelles (voir healthSync.ts). `null` si aucune pesée n'a encore été enregistrée —
// l'appelant retombe alors sur BODY_WEIGHT_KG (voir manualActivities.defaultBodyWeightKg).
export async function getLatestWeightKg(): Promise<number | null> {
  if (!isHealthDbEnabled()) return null;
  await ensureSchema();
  const p = getPool();
  const [rows] = await p.query(`SELECT weight_kg FROM weight_logs ORDER BY logged_at DESC LIMIT 1`);
  const row = (rows as any[])[0];
  return row ? Number(row.weight_kg) : null;
}

// ---------------------------------------------------------------------------
// Net Worth (patrimoine) : catégories fixes (crypto / tradfi / cash) > contenants libres
// (ex: "Ledger", "Trade Republic", "BNP") > possessions détenues dedans, avec historique
// d'ajouts/retraits. Voir lib/networth.ts pour la valorisation en direct.
// ---------------------------------------------------------------------------

export type NetworthCategory = "crypto" | "tradfi" | "cash";

export type NetworthContainerRow = {
  id: number;
  category: NetworthCategory;
  name: string;
};

export async function listNetworthContainers(): Promise<NetworthContainerRow[]> {
  if (!isHealthDbEnabled()) return [];
  await ensureSchema();
  const p = getPool();
  const [rows] = await p.query(
    `SELECT id, category, name FROM networth_containers ORDER BY category ASC, name ASC`,
  );
  return (rows as any[]).map((r) => ({ id: r.id, category: r.category, name: r.name }));
}

export async function createNetworthContainer(data: {
  category: NetworthCategory;
  name: string;
}): Promise<NetworthContainerRow> {
  await ensureSchema();
  const p = getPool();
  const [result] = await p.query(`INSERT INTO networth_containers (category, name) VALUES (?, ?)`, [
    data.category,
    data.name,
  ]);
  return { id: (result as any).insertId, category: data.category, name: data.name };
}

export async function deleteNetworthContainer(id: number): Promise<void> {
  if (!isHealthDbEnabled()) return;
  await ensureSchema();
  const p = getPool();
  await p.query(`DELETE FROM networth_containers WHERE id = ?`, [id]);
}

export type NetworthHoldingRow = {
  id: number;
  containerId: number;
  name: string;
  symbol: string | null;
  currency: string;
  quantity: number;
};

export async function listNetworthHoldings(): Promise<NetworthHoldingRow[]> {
  if (!isHealthDbEnabled()) return [];
  await ensureSchema();
  const p = getPool();
  const [rows] = await p.query(
    `SELECT h.id, h.container_id, h.name, h.symbol, h.currency,
            COALESCE(SUM(t.quantity), 0) AS quantity
     FROM networth_holdings h
     LEFT JOIN networth_transactions t ON t.holding_id = h.id
     GROUP BY h.id, h.container_id, h.name, h.symbol, h.currency
     ORDER BY h.name ASC`,
  );
  return (rows as any[]).map((r) => ({
    id: r.id,
    containerId: r.container_id,
    name: r.name,
    symbol: r.symbol,
    currency: r.currency,
    quantity: Number(r.quantity),
  }));
}

export async function createNetworthHolding(data: {
  containerId: number;
  name: string;
  symbol: string | null;
  currency: string;
}): Promise<NetworthHoldingRow> {
  await ensureSchema();
  const p = getPool();
  const [result] = await p.query(
    `INSERT INTO networth_holdings (container_id, name, symbol, currency) VALUES (?, ?, ?, ?)`,
    [data.containerId, data.name, data.symbol, data.currency],
  );
  return {
    id: (result as any).insertId,
    containerId: data.containerId,
    name: data.name,
    symbol: data.symbol,
    currency: data.currency,
    quantity: 0,
  };
}

export async function deleteNetworthHolding(id: number): Promise<void> {
  if (!isHealthDbEnabled()) return;
  await ensureSchema();
  const p = getPool();
  await p.query(`DELETE FROM networth_holdings WHERE id = ?`, [id]);
}

export type NetworthTransactionRow = {
  id: number;
  holdingId: number;
  quantity: number;
  date: string;
  note: string | null;
};

export async function listAllNetworthTransactions(): Promise<NetworthTransactionRow[]> {
  if (!isHealthDbEnabled()) return [];
  await ensureSchema();
  const p = getPool();
  const [rows] = await p.query(
    `SELECT id, holding_id, quantity, date, note FROM networth_transactions ORDER BY date DESC, id DESC`,
  );
  return (rows as any[]).map((r) => ({
    id: r.id,
    holdingId: r.holding_id,
    quantity: Number(r.quantity),
    date: r.date,
    note: r.note,
  }));
}

export async function addNetworthTransaction(data: {
  holdingId: number;
  quantity: number;
  date: string;
  note: string | null;
}): Promise<NetworthTransactionRow> {
  await ensureSchema();
  const p = getPool();
  const [result] = await p.query(
    `INSERT INTO networth_transactions (holding_id, quantity, date, note) VALUES (?, ?, ?, ?)`,
    [data.holdingId, data.quantity, data.date, data.note],
  );
  return {
    id: (result as any).insertId,
    holdingId: data.holdingId,
    quantity: data.quantity,
    date: data.date,
    note: data.note,
  };
}

export async function deleteNetworthTransaction(id: number): Promise<void> {
  if (!isHealthDbEnabled()) return;
  await ensureSchema();
  const p = getPool();
  await p.query(`DELETE FROM networth_transactions WHERE id = ?`, [id]);
}

export async function getAllNetworthTransactionsForExport(): Promise<Record<string, unknown>[]> {
  if (!isHealthDbEnabled()) return [];
  await ensureSchema();
  const p = getPool();
  const [rows] = await p.query(
    `SELECT c.category, c.name AS container, h.name AS holding, h.symbol, h.currency,
            t.quantity, t.date, t.note
     FROM networth_transactions t
     JOIN networth_holdings h ON h.id = t.holding_id
     JOIN networth_containers c ON c.id = h.container_id
     ORDER BY t.date ASC, t.id ASC`,
  );
  return rows as Record<string, unknown>[];
}

export type NetworthRecentTransactionRow = {
  id: number;
  category: NetworthCategory;
  container: string;
  holding: string;
  quantity: number;
  date: string;
  note: string | null;
};

// Fil des derniers mouvements toutes catégories confondues, pour le dashboard Net Worth.
export async function getRecentNetworthTransactions(limit: number): Promise<NetworthRecentTransactionRow[]> {
  if (!isHealthDbEnabled()) return [];
  await ensureSchema();
  const p = getPool();
  const [rows] = await p.query(
    `SELECT t.id, c.category, c.name AS container, h.name AS holding, t.quantity, t.date, t.note
     FROM networth_transactions t
     JOIN networth_holdings h ON h.id = t.holding_id
     JOIN networth_containers c ON c.id = h.container_id
     ORDER BY t.date DESC, t.id DESC
     LIMIT ?`,
    [limit],
  );
  return (rows as any[]).map((r) => ({
    id: r.id,
    category: r.category,
    container: r.container,
    holding: r.holding,
    quantity: Number(r.quantity),
    date: r.date,
    note: r.note,
  }));
}

export type NetworthSnapshotRow = {
  date: string;
  totalEur: number;
  cryptoEur: number;
  tradfiEur: number;
  cashEur: number;
};

export async function upsertNetworthSnapshot(data: {
  date: string;
  totalEur: number;
  cryptoEur: number;
  tradfiEur: number;
  cashEur: number;
}): Promise<void> {
  if (!isHealthDbEnabled()) return;
  await ensureSchema();
  const p = getPool();
  await p.query(
    `INSERT INTO networth_snapshots (date, total_eur, crypto_eur, tradfi_eur, cash_eur)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       total_eur = VALUES(total_eur),
       crypto_eur = VALUES(crypto_eur),
       tradfi_eur = VALUES(tradfi_eur),
       cash_eur = VALUES(cash_eur)`,
    [data.date, data.totalEur, data.cryptoEur, data.tradfiEur, data.cashEur],
  );
}

export async function getNetworthHistory(days: number): Promise<NetworthSnapshotRow[]> {
  if (!isHealthDbEnabled()) return [];
  await ensureSchema();
  const p = getPool();
  const [rows] = await p.query(
    `SELECT date, total_eur, crypto_eur, tradfi_eur, cash_eur FROM networth_snapshots
     WHERE date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     ORDER BY date ASC`,
    [days - 1],
  );
  return (rows as any[]).map((r) => ({
    date: r.date,
    totalEur: Number(r.total_eur),
    cryptoEur: Number(r.crypto_eur),
    tradfiEur: Number(r.tradfi_eur),
    cashEur: Number(r.cash_eur),
  }));
}

// ---------------------------------------------------------------------------
// Mail (Gmail dédié) : jetons OAuth. Voir lib/gmail.ts pour l'appel de l'API Gmail elle-même.
// ---------------------------------------------------------------------------

export type MailTokensRow = {
  refreshToken: string;
  accessToken: string | null;
  accessTokenExpiresAt: string | null;
};

export async function getMailTokens(): Promise<MailTokensRow | null> {
  if (!isHealthDbEnabled()) return null;
  await ensureSchema();
  const p = getPool();
  const [rows] = await p.query(
    `SELECT refresh_token, access_token, access_token_expires_at FROM mail_oauth_tokens WHERE id = 1`,
  );
  const row = (rows as any[])[0];
  if (!row) return null;
  return {
    refreshToken: row.refresh_token,
    accessToken: row.access_token,
    accessTokenExpiresAt: row.access_token_expires_at,
  };
}

export async function upsertMailTokens(data: {
  refreshToken: string;
  accessToken: string | null;
  accessTokenExpiresAt: string | null;
}): Promise<void> {
  if (!isHealthDbEnabled()) return;
  await ensureSchema();
  const p = getPool();
  await p.query(
    `INSERT INTO mail_oauth_tokens (id, refresh_token, access_token, access_token_expires_at)
     VALUES (1, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       refresh_token = VALUES(refresh_token),
       access_token = VALUES(access_token),
       access_token_expires_at = VALUES(access_token_expires_at)`,
    [data.refreshToken, data.accessToken, data.accessTokenExpiresAt],
  );
}

export async function deleteMailTokens(): Promise<void> {
  if (!isHealthDbEnabled()) return;
  await ensureSchema();
  const p = getPool();
  await p.query(`DELETE FROM mail_oauth_tokens WHERE id = 1`);
}

export async function isMailConnected(): Promise<boolean> {
  if (!isHealthDbEnabled()) return false;
  await ensureSchema();
  const p = getPool();
  const [rows] = await p.query(`SELECT 1 FROM mail_oauth_tokens WHERE id = 1`);
  return (rows as any[]).length > 0;
}
