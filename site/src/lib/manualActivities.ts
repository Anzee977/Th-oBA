export type Sport =
  | "running"
  | "cycling"
  | "strength_training"
  | "walking"
  | "hiking"
  | "swimming"
  | "fitness_equipment"
  | "other";

// `met` = équivalent métabolique (MET), utilisé pour l'estimation de calories quand
// aucune activité Garmin correspondante n'est trouvée. `garminTypes` = valeurs
// `activityType.typeKey` de l'API Garmin à considérer comme le même sport, pour le
// rapprochement automatique (une entrée manuelle "Course à pied" doit matcher aussi
// bien un running Garmin classique qu'un trail ou un tapis).
export const SPORTS: { id: Sport; label: string; met: number; garminTypes: string[] }[] = [
  {
    id: "running",
    label: "Course à pied",
    met: 9.8,
    garminTypes: ["running", "street_running", "trail_running", "indoor_running"],
  },
  { id: "cycling", label: "Vélo", met: 7.5, garminTypes: ["cycling", "indoor_cycling"] },
  { id: "strength_training", label: "Musculation", met: 5.0, garminTypes: ["strength_training"] },
  { id: "walking", label: "Marche", met: 3.5, garminTypes: ["walking"] },
  { id: "hiking", label: "Randonnée", met: 6.0, garminTypes: ["hiking"] },
  { id: "swimming", label: "Natation", met: 8.0, garminTypes: ["swimming"] },
  { id: "fitness_equipment", label: "Fitness", met: 5.5, garminTypes: ["fitness_equipment"] },
  { id: "other", label: "Autre", met: 5.0, garminTypes: ["other"] },
];

export function isSport(value: string): value is Sport {
  return SPORTS.some((s) => s.id === value);
}

export function sportLabel(id: string): string {
  return SPORTS.find((s) => s.id === id)?.label ?? id;
}

export function garminTypesFor(sport: string): string[] {
  return SPORTS.find((s) => s.id === sport)?.garminTypes ?? [];
}

// Poids de repli utilisé pour l'estimation MET (kcal = MET × poids(kg) × durée(h))
// quand aucune pesée n'a encore été enregistrée (voir healthDb.getLatestWeightKg, qui
// est préféré dès qu'une pesée existe). Configurable via BODY_WEIGHT_KG dans site/.env.
export function defaultBodyWeightKg(): number {
  const fromEnv = Number(process.env.BODY_WEIGHT_KG);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 75;
}

export function estimateCalories(sport: string, durationMinutes: number, weightKg: number): number {
  const met = SPORTS.find((s) => s.id === sport)?.met ?? 5;
  return Math.round(met * weightKg * (durationMinutes / 60));
}
