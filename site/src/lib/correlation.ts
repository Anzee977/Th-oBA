import type { CorrelationDayRow } from "./healthDb";

export type FactorDef = {
  id: string;
  label: string;
  test: (day: CorrelationDayRow) => boolean;
};

// Comparaison naïve : "jour où le facteur a été pris" vs "jour où il ne l'a pas été",
// en comparant aux métriques de santé du même jour calendaire. Suffisant pour repérer
// une tendance grossière une fois assez de données accumulées ; pas une vraie analyse
// statistique (pas de test de significativité, petits échantillons au départ).
export const FACTORS: FactorDef[] = [
  { id: "whey", label: "Whey", test: (d) => d.supplements.includes("whey") },
  { id: "creatine", label: "Créatine", test: (d) => d.supplements.includes("creatine") },
  { id: "melatonine", label: "Mélatonine", test: (d) => d.supplements.includes("melatonine") },
  { id: "cafe", label: "Café (au moins 1)", test: (d) => d.coffeeCount > 0 },
  { id: "repas_grand", label: "Repas copieux (grand)", test: (d) => d.mealSizes.includes("grand") },
  { id: "alcool", label: "Alcool (tout niveau)", test: (d) => d.alcoholLevels.length > 0 },
  {
    id: "alcool_beaucoup",
    label: "Alcool (beaucoup)",
    test: (d) => d.alcoholLevels.includes("beaucoup"),
  },
];

export type FactorAverages = {
  sleepMinutes: number | null;
  sleepScore: number | null;
  bodyBatteryCharged: number | null;
  bodyBatteryMin: number | null;
  restingHr: number | null;
};

export type FactorStats = {
  withCount: number;
  withoutCount: number;
  withAvg: FactorAverages;
  withoutAvg: FactorAverages;
};

function average(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v != null);
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

function averagesFor(rows: CorrelationDayRow[]): FactorAverages {
  return {
    sleepMinutes: average(rows.map((r) => r.sleepTotalMinutes)),
    sleepScore: average(rows.map((r) => r.sleepScore)),
    bodyBatteryCharged: average(rows.map((r) => r.bodyBatteryCharged)),
    bodyBatteryMin: average(rows.map((r) => r.bodyBatteryMin)),
    restingHr: average(rows.map((r) => r.restingHr)),
  };
}

// Ne compare que les jours où on a effectivement des données de sommeil synchronisées,
// pour ne pas fausser les moyennes avec des jours vides.
export function computeFactorStats(
  days: CorrelationDayRow[],
  test: (day: CorrelationDayRow) => boolean,
): FactorStats {
  const withDays = days.filter((d) => test(d) && d.sleepTotalMinutes != null);
  const withoutDays = days.filter((d) => !test(d) && d.sleepTotalMinutes != null);
  return {
    withCount: withDays.length,
    withoutCount: withoutDays.length,
    withAvg: averagesFor(withDays),
    withoutAvg: averagesFor(withoutDays),
  };
}
