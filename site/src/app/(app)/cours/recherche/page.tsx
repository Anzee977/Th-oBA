"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RefreshIcon, SearchIcon } from "@/components/icons";
import Highlighted from "@/components/Highlighted";

type Hit = {
  id: string;
  course: string;
  path: string;
  filename: string;
  size: number;
  lastmod: string;
  _formatted?: { filename?: string; content?: string };
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function formatDate(lastmod: string): string {
  const date = new Date(lastmod);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  });
}

function fileHref(course: string, path: string): string {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `/api/cours/${encodeURIComponent(course)}/files/${encoded}`;
}

function folderHref(course: string, path: string): string {
  const segments = path.split("/");
  segments.pop();
  const encoded = segments.map(encodeURIComponent).join("/");
  return `/cours/${encodeURIComponent(course)}${encoded ? `/${encoded}` : ""}`;
}

export default function RecherchePage() {
  const [courses, setCourses] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [course, setCourse] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [reindexMessage, setReindexMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/cours")
      .then((r) => r.json())
      .then((data) => setCourses((data.courses ?? []).map((c: { name: string }) => c.name)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      setLoading(true);
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (course) params.set("course", course);
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      fetch(`/api/search?${params.toString()}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((data) => {
          setHits(data.hits ?? []);
          setAvailable(data.available !== false);
        })
        .catch((err) => {
          if (err.name !== "AbortError") console.error(err);
        })
        .finally(() => setLoading(false));
    }, 250);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query, course, from, to]);

  async function handleReindex() {
    setReindexing(true);
    setReindexMessage(null);
    try {
      const res = await fetch("/api/search/reindex", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Échec de la réindexation.");
      setReindexMessage(`Réindexation terminée (${data.courses} cours parcourus).`);
    } catch (err) {
      setReindexMessage((err as Error).message);
    } finally {
      setReindexing(false);
    }
  }

  return (
    <div>
      <Link href="/cours" className="muted">
        ← Tous les cours
      </Link>
      <h1>Recherche</h1>
      <p className="muted">
        Cherche dans les noms de fichiers et dans le contenu des PDF/notes de tous tes cours.
      </p>

      {!available && (
        <p className="error">
          Recherche plein texte non configurée ou indisponible (Meilisearch injoignable).
        </p>
      )}

      <div className="search-bar card">
        <div className="search-input">
          <SearchIcon />
          <input
            type="text"
            placeholder="Nom de fichier, mot-clé dans un PDF..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        <div className="search-filters">
          <select value={course} onChange={(e) => setCourse(e.target.value)} aria-label="Filtrer par cours">
            <option value="">Tous les cours</option>
            {courses.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Depuis le" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Jusqu'au" />
          <button type="button" className="btn-secondary" onClick={handleReindex} disabled={reindexing}>
            <RefreshIcon /> <span>{reindexing ? "Réindexation..." : "Réindexer tout"}</span>
          </button>
        </div>
        {reindexMessage && <p className="muted">{reindexMessage}</p>}
      </div>

      {loading && <p className="muted">Recherche...</p>}
      {!loading && hits.length === 0 && (query || course || from || to) && (
        <p className="muted">Aucun résultat.</p>
      )}

      <ul className="search-results">
        {hits.map((hit) => (
          <li key={hit.id} className="card search-result">
            <a href={fileHref(hit.course, hit.path)} target="_blank" rel="noreferrer" className="entry-name">
              <Highlighted text={hit._formatted?.filename ?? hit.filename} />
            </a>

            {hit._formatted?.content && (
              <p className="search-snippet muted">
                <Highlighted text={hit._formatted.content} />
              </p>
            )}

            <div className="entry-meta">
              <Link href={folderHref(hit.course, hit.path)} className="badge">
                {hit.course}
              </Link>
              <span className="muted">{formatDate(hit.lastmod)}</span>
              <span className="muted">{formatSize(hit.size)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
