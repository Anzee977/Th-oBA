import {
  getBodyBatteryToday,
  getCaloriesHistory,
  getHeartRateToday,
  getLastNightSleep,
  getRecentActivities,
  getStepsHistory,
  isGarminEnabled,
} from "@/lib/garmin";
import StepsChart from "@/components/StepsChart";
import BodyBatteryChart from "@/components/BodyBatteryChart";
import HeartRateChart from "@/components/HeartRateChart";
import CaloriesChart from "@/components/CaloriesChart";
import SleepCard from "@/components/SleepCard";
import ActivityList from "@/components/ActivityList";
import ManualActivityTracker from "@/components/ManualActivityTracker";
import WeightTracker from "@/components/WeightTracker";
import { ActivityIcon, BatteryIcon, FlameIcon, HeartIcon, MoonIcon, ZapIcon } from "@/components/icons";
import { listManualActivities, listWeightLogs } from "@/lib/healthDb";

export const dynamic = "force-dynamic";

export default async function SantePage() {
  if (!isGarminEnabled()) {
    return (
      <div>
        <h1>Santé</h1>
        <p className="error">
          Connexion Garmin non configurée (GARMIN_EMAIL / GARMIN_PASSWORD manquants dans
          site/.env).
        </p>
      </div>
    );
  }

  let steps: Awaited<ReturnType<typeof getStepsHistory>> = [];
  let sleep: Awaited<ReturnType<typeof getLastNightSleep>> = null;
  let bodyBattery: Awaited<ReturnType<typeof getBodyBatteryToday>> = [];
  let heartRate: Awaited<ReturnType<typeof getHeartRateToday>> = { points: [], min: null, max: null, resting: null };
  let calories: Awaited<ReturnType<typeof getCaloriesHistory>> = [];
  let activities: Awaited<ReturnType<typeof getRecentActivities>> = [];
  let manualActivities: Awaited<ReturnType<typeof listManualActivities>> = [];
  let weightLogs: Awaited<ReturnType<typeof listWeightLogs>> = [];
  let error: string | null = null;

  try {
    [steps, sleep, bodyBattery, heartRate, calories, activities, manualActivities, weightLogs] =
      await Promise.all([
        getStepsHistory(7),
        getLastNightSleep(),
        getBodyBatteryToday(),
        getHeartRateToday(),
        getCaloriesHistory(7),
        getRecentActivities(8),
        listManualActivities(15),
        listWeightLogs(60),
      ]);
  } catch (e) {
    error = (e as Error).message;
  }

  const todaySteps = steps[steps.length - 1]?.steps ?? 0;
  const todayCalories = calories[calories.length - 1];

  return (
    <div>
      <h1>Santé</h1>
      <p className="muted">Données synchronisées depuis ta montre Garmin.</p>

      {error && <p className="error">Impossible de récupérer les données Garmin : {error}</p>}

      <div className="health-grid">
        <section className="card">
          <div className="card-header">
            <span className="stat-icon accent">
              <FlameIcon size={16} />
            </span>
            <h2>Pas</h2>
          </div>
          <p className="chart-highlight">
            {todaySteps.toLocaleString("fr-FR")} <span className="muted">aujourd&apos;hui</span>
          </p>
          <StepsChart days={steps} />
        </section>

        <section className="card">
          <div className="card-header">
            <span className="stat-icon success">
              <BatteryIcon size={16} />
            </span>
            <h2>Body Battery</h2>
          </div>
          <BodyBatteryChart points={bodyBattery} />
        </section>

        <section className="card">
          <div className="card-header">
            <span className="stat-icon danger">
              <HeartIcon size={16} />
            </span>
            <h2>Fréquence cardiaque</h2>
          </div>
          <HeartRateChart
            points={heartRate.points}
            min={heartRate.min}
            max={heartRate.max}
            resting={heartRate.resting}
          />
        </section>

        <section className="card">
          <div className="card-header">
            <span className="stat-icon accent">
              <ZapIcon size={16} />
            </span>
            <h2>Calories</h2>
          </div>
          <p className="chart-highlight">
            {(todayCalories?.totalKcal ?? 0).toLocaleString("fr-FR")}{" "}
            <span className="muted">kcal aujourd&apos;hui</span>
          </p>
          {todayCalories != null && todayCalories.activeKcal > 0 && (
            <p className="muted" style={{ marginTop: -8, marginBottom: 8 }}>
              dont {todayCalories.activeKcal.toLocaleString("fr-FR")} actives
            </p>
          )}
          <CaloriesChart days={calories} />
        </section>

        <WeightTracker initialLogs={weightLogs} />

        <section className="card">
          <div className="card-header">
            <span className="stat-icon info">
              <MoonIcon size={16} />
            </span>
            <h2>Sommeil</h2>
          </div>
          <SleepCard sleep={sleep} />
        </section>

        <section className="card health-activities">
          <div className="card-header">
            <span className="stat-icon warning">
              <ActivityIcon size={16} />
            </span>
            <h2>Activités récentes</h2>
          </div>
          <ActivityList activities={activities} />
        </section>

        <ManualActivityTracker initialActivities={manualActivities} />
      </div>
    </div>
  );
}
