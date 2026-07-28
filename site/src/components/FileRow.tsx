"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ConfirmButton from "@/components/ConfirmButton";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDate(lastmod: string): string {
  const date = new Date(lastmod);
  if (Number.isNaN(date.getTime())) return "";
  return dateFormatter.format(date);
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export default function FileRow({
  course,
  path,
  size,
  lastmod,
}: {
  course: string;
  path: string;
  size: number;
  lastmod: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const fileUrl = `/api/cours/${encodeURIComponent(course)}/file?path=${encodeURIComponent(path)}`;

  async function handleDelete() {
    setError(null);
    try {
      const res = await fetch(fileUrl, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Échec de la suppression.");
        return;
      }
      router.refresh();
    } catch {
      setError("Échec de la suppression.");
    }
  }

  return (
    <li style={{ flexWrap: "wrap", gap: 8 }}>
      <a href={fileUrl} target="_blank" rel="noopener noreferrer">
        {path}
      </a>
      <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span className="muted">{formatDate(lastmod)}</span>
        <span className="muted">{formatSize(size)}</span>
        <ConfirmButton label="Supprimer" confirmLabel="Confirmer ?" onConfirm={handleDelete} />
        {error && <span className="error">{error}</span>}
      </span>
    </li>
  );
}
