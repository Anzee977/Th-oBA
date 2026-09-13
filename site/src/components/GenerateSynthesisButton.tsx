"use client";

import { useState } from "react";
import { SparkleIcon } from "./icons";

export default function GenerateSynthesisButton({ course }: { course: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ path: string; content: string } | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/cours/${encodeURIComponent(course)}/synthese`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error ?? "Échec de la génération.");
      }

      setResult({ path: data.path, content: data.content });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="synthesis-block">
      <button type="button" className="btn-secondary" onClick={handleClick} disabled={loading}>
        <SparkleIcon />
        <span>{loading ? "Génération en cours..." : "Générer ma synthèse de la semaine"}</span>
      </button>

      {error && <p className="error">{error}</p>}

      {result && (
        <div className="card synthesis-result">
          <div className="card-header">
            <h3>Synthèse générée</h3>
            <span className="muted">
              Enregistrée dans « Synthèse de semaine » — {result.path}
            </span>
          </div>
          <pre className="synthesis-preview">{result.content}</pre>
        </div>
      )}
    </div>
  );
}
