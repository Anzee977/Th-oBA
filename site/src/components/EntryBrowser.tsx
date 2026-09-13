"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import ConfirmDeleteButton from "./ConfirmDeleteButton";
import RenameButton from "./RenameButton";
import { FileIcon, FolderIcon } from "./icons";

type DirEntry = {
  name: string;
  isDirectory: boolean;
  size: number;
  lastmod: string;
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

export default function EntryBrowser({
  course,
  pathSegments,
  entries,
}: {
  course: string;
  pathSegments: string[];
  entries: DirEntry[];
}) {
  const router = useRouter();

  function segmentsFor(name: string) {
    return [...pathSegments, name];
  }

  function folderHref(name: string) {
    const segs = segmentsFor(name).map(encodeURIComponent);
    return `/cours/${encodeURIComponent(course)}/${segs.join("/")}`;
  }

  function fileApiHref(name: string) {
    const segs = segmentsFor(name).map(encodeURIComponent);
    return `/api/cours/${encodeURIComponent(course)}/files/${segs.join("/")}`;
  }

  async function handleDelete(name: string) {
    const res = await fetch(fileApiHref(name), { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Échec de la suppression.");
    }
    router.refresh();
  }

  async function handleRename(name: string, toPath: string) {
    const res = await fetch(fileApiHref(name), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: toPath }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Échec du renommage/déplacement.");
    }
    router.refresh();
  }

  if (entries.length === 0) {
    return <p className="muted">Dossier vide.</p>;
  }

  return (
    <ul className="entry-list">
      {entries.map((entry) => {
        const path = segmentsFor(entry.name).join("/");
        return (
          <li key={entry.name} className="entry-row">
            <div className="entry-main">
              <span className={`entry-icon${entry.isDirectory ? " folder" : ""}`}>
                {entry.isDirectory ? <FolderIcon /> : <FileIcon />}
              </span>
              {entry.isDirectory ? (
                <Link href={folderHref(entry.name)} className="entry-name">
                  {entry.name}
                </Link>
              ) : (
                <a href={fileApiHref(entry.name)} target="_blank" rel="noreferrer" className="entry-name">
                  {entry.name}
                </a>
              )}
            </div>

            <div className="entry-meta">
              {!entry.isDirectory && <span className="muted">{formatDate(entry.lastmod)}</span>}
              {!entry.isDirectory && <span className="muted">{formatSize(entry.size)}</span>}
            </div>

            <div className="entry-actions">
              <RenameButton currentPath={path} onRename={(toPath) => handleRename(entry.name, toPath)} />
              <ConfirmDeleteButton
                iconOnly
                label={entry.isDirectory ? "Supprimer le dossier" : "Supprimer le fichier"}
                confirmText={
                  entry.isDirectory
                    ? "Supprimer ce dossier et tout son contenu ?"
                    : "Supprimer ce fichier ?"
                }
                onConfirm={() => handleDelete(entry.name)}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
