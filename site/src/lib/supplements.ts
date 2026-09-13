export type SupplementId = "whey" | "creatine" | "melatonine";

export const SUPPLEMENTS: { id: SupplementId; label: string }[] = [
  { id: "whey", label: "Whey" },
  { id: "creatine", label: "Créatine" },
  { id: "melatonine", label: "Mélatonine" },
];

export const MAX_DOSES_PER_DAY = 3;

export function isSupplementId(value: string): value is SupplementId {
  return SUPPLEMENTS.some((s) => s.id === value);
}
