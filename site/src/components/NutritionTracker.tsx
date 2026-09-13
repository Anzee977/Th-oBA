"use client";

import { useState } from "react";
import {
  ALCOHOL_LEVELS,
  alcoholLevelLabel,
  MEAL_SIZES,
  MealSize,
  mealSizeLabel,
  AlcoholLevel,
} from "@/lib/nutrition";
import { CoffeeIcon, UtensilsIcon, WineIcon } from "./icons";

type MealEntry = { time: string; size: MealSize };
type AlcoholEntry = { time: string; level: AlcoholLevel };
type Category = "cafe" | "repas" | "alcool";

export default function NutritionTracker({
  initialCoffeeTimes,
  initialMeals,
  initialAlcohol,
}: {
  initialCoffeeTimes: string[];
  initialMeals: MealEntry[];
  initialAlcohol: AlcoholEntry[];
}) {
  const [coffeeTimes, setCoffeeTimes] = useState<string[]>(initialCoffeeTimes);
  const [meals, setMeals] = useState<MealEntry[]>(initialMeals);
  const [alcohol, setAlcohol] = useState<AlcoholEntry[]>(initialAlcohol);
  const [busy, setBusy] = useState<Category | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send(body: Record<string, unknown>, busyKey: Category) {
    setBusy(busyKey);
    setError(null);
    try {
      const res = await fetch("/api/alimentation/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Échec.");
      setCoffeeTimes(data.coffeeTimes ?? []);
      setMeals(data.meals ?? []);
      setAlcohol(data.alcohol ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="grid nutrition-grid">
        <div className="card nutrition-card">
          <div className="card-header">
            <span className="stat-icon warning">
              <CoffeeIcon size={16} />
            </span>
            <h2>Café</h2>
            <span className="muted" style={{ marginLeft: "auto" }}>
              {coffeeTimes.length} aujourd&apos;hui
            </span>
          </div>

          <button
            type="button"
            className="nutrition-btn"
            disabled={busy === "cafe"}
            onClick={() => send({ category: "cafe" }, "cafe")}
          >
            + Un café
          </button>

          {coffeeTimes.length > 0 && (
            <div className="nutrition-times">
              <span className="muted">{coffeeTimes.join(" · ")}</span>
              <button
                type="button"
                className="link-btn"
                disabled={busy === "cafe"}
                onClick={() => send({ category: "cafe", action: "undo" }, "cafe")}
              >
                Annuler le dernier
              </button>
            </div>
          )}
        </div>

        <div className="card nutrition-card">
          <div className="card-header">
            <span className="stat-icon danger">
              <WineIcon size={16} />
            </span>
            <h2>Alcool</h2>
            <span className="muted" style={{ marginLeft: "auto" }}>
              {alcohol.length} aujourd&apos;hui
            </span>
          </div>

          <div className="meal-size-buttons">
            {ALCOHOL_LEVELS.map((a) => (
              <button
                key={a.id}
                type="button"
                className="meal-size-btn"
                disabled={busy === "alcool"}
                onClick={() => send({ category: "alcool", level: a.id }, "alcool")}
              >
                {a.label}
              </button>
            ))}
          </div>

          {alcohol.length > 0 && (
            <div className="nutrition-times">
              <span className="muted">
                {alcohol.map((a) => `${a.time} · ${alcoholLevelLabel(a.level)}`).join(" — ")}
              </span>
              <button
                type="button"
                className="link-btn"
                disabled={busy === "alcool"}
                onClick={() => send({ category: "alcool", action: "undo" }, "alcool")}
              >
                Annuler le dernier
              </button>
            </div>
          )}
        </div>

        <div className="card nutrition-card">
          <div className="card-header">
            <span className="stat-icon success">
              <UtensilsIcon size={16} />
            </span>
            <h2>Repas</h2>
            <span className="muted" style={{ marginLeft: "auto" }}>
              {meals.length} aujourd&apos;hui
            </span>
          </div>

          <div className="meal-size-buttons">
            {MEAL_SIZES.map((m) => (
              <button
                key={m.id}
                type="button"
                className="meal-size-btn"
                disabled={busy === "repas"}
                onClick={() => send({ category: "repas", size: m.id }, "repas")}
              >
                {m.label}
              </button>
            ))}
          </div>

          {meals.length > 0 && (
            <div className="nutrition-times">
              <span className="muted">
                {meals.map((m) => `${m.time} · ${mealSizeLabel(m.size)}`).join(" — ")}
              </span>
              <button
                type="button"
                className="link-btn"
                disabled={busy === "repas"}
                onClick={() => send({ category: "repas", action: "undo" }, "repas")}
              >
                Annuler le dernier
              </button>
            </div>
          )}
        </div>
      </div>

      {error && <p className="error">{error}</p>}
    </div>
  );
}
