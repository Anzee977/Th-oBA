"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewCourseForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/cours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Erreur lors de la création.");
        return;
      }

      setName("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, marginBottom: 24 }}>
      <input
        type="text"
        placeholder="Nom du nouveau cours (ex: Analyse 2)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ flex: 1 }}
      />
      <button className="btn" type="submit" disabled={loading || name.trim().length === 0}>
        {loading ? "Création..." : "Créer le cours"}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
