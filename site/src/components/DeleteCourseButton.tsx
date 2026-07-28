"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ConfirmButton from "@/components/ConfirmButton";

export default function DeleteCourseButton({ course }: { course: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    try {
      const res = await fetch(`/api/cours/${encodeURIComponent(course)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Échec de la suppression du cours.");
        return;
      }
      router.push("/cours");
      router.refresh();
    } catch {
      setError("Échec de la suppression du cours.");
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <ConfirmButton
        label="Supprimer ce cours"
        confirmLabel="Confirmer la suppression ?"
        onConfirm={handleDelete}
      />
      {error && <span className="error">{error}</span>}
    </div>
  );
}
