export type MealSize = "petit" | "moyen" | "grand";

export const MEAL_SIZES: { id: MealSize; label: string }[] = [
  { id: "petit", label: "Petit" },
  { id: "moyen", label: "Moyen" },
  { id: "grand", label: "Grand" },
];

export function isMealSize(value: string): value is MealSize {
  return MEAL_SIZES.some((m) => m.id === value);
}

export function mealSizeLabel(size: MealSize): string {
  return MEAL_SIZES.find((m) => m.id === size)?.label ?? size;
}

export type AlcoholLevel = "un_peu" | "moyen" | "beaucoup";

export const ALCOHOL_LEVELS: { id: AlcoholLevel; label: string }[] = [
  { id: "un_peu", label: "Un peu" },
  { id: "moyen", label: "Moyen" },
  { id: "beaucoup", label: "Beaucoup" },
];

export function isAlcoholLevel(value: string): value is AlcoholLevel {
  return ALCOHOL_LEVELS.some((a) => a.id === value);
}

export function alcoholLevelLabel(level: AlcoholLevel): string {
  return ALCOHOL_LEVELS.find((a) => a.id === level)?.label ?? level;
}
