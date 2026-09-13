"use client";

import { useState } from "react";
import { MAX_DOSES_PER_DAY, SUPPLEMENTS, SupplementId } from "@/lib/supplements";
import { CheckIcon } from "./icons";

type TodayState = Record<string, string[]>;

export default function SupplementTracker({ initialToday }: { initialToday: TodayState }) {
  const [today, setToday] = useState<TodayState>(initialToday);
  const [busy, setBusy] = useState<SupplementId | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send(id: SupplementId, action?: "undo") {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch("/api/suivi/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action ? { supplement: id, action } : { supplement: id }),
      });
      const data = await res.json().catch(() => ({}));

      if (data.times) {
        setToday((prev) => ({ ...prev, [id]: data.times }));
      }

      if (!res.ok) {
        throw new Error(data.error ?? "Échec.");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="grid supplement-grid">
        {SUPPLEMENTS.map((s) => {
          const times = today[s.id] ?? [];
          const count = times.length;
          const full = count >= MAX_DOSES_PER_DAY;

          return (
            <div key={s.id} className="card supplement-card">
              <div className="card-header">
                <h3>{s.label}</h3>
                <span className="muted">
                  {count}/{MAX_DOSES_PER_DAY} aujourd&apos;hui
                </span>
              </div>

              <button
                type="button"
                className={`supplement-btn${full ? " full" : ""}`}
                disabled={busy === s.id || full}
                onClick={() => send(s.id)}
              >
                {full ? (
                  <>
                    <CheckIcon size={16} /> Fait pour aujourd&apos;hui
                  </>
                ) : (
                  "Marquer une prise"
                )}
              </button>

              <div className="supplement-dots">
                {Array.from({ length: MAX_DOSES_PER_DAY }).map((_, i) => (
                  <span key={i} className={`supplement-dot${i < count ? " filled" : ""}`} />
                ))}
              </div>

              {times.length > 0 && (
                <div className="supplement-times">
                  <span className="muted">{times.join(" · ")}</span>
                  <button
                    type="button"
                    className="link-btn"
                    disabled={busy === s.id}
                    onClick={() => send(s.id, "undo")}
                  >
                    Annuler la dernière
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="error">{error}</p>}
    </div>
  );
}
