"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PlusIcon } from "./icons";

export default function NewFolderForm({ course, basePath }: { course: string; basePath: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const path = basePath ? `${basePath}/${name.trim()}` : name.trim();
      const res = await fetch(`/api/cours/${encodeURIComponent(course)}/folders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Erreur lors de la création.");
        return;
      }

      setName("");
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="btn-secondary" onClick={() => setOpen(true)}>
        <PlusIcon /> <span>Nouveau dossier</span>
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="inline-form">
      <input
        type="text"
        placeholder="Nom du dossier"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
      />
      <button className="btn" type="submit" disabled={loading || name.trim().length === 0}>
        {loading ? "Création..." : "Créer"}
      </button>
      <button
        type="button"
        className="btn-secondary"
        onClick={() => {
          setOpen(false);
          setError(null);
        }}
      >
        Annuler
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
