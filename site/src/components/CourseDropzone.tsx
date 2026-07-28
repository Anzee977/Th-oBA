"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type PendingUpload = {
  path: string;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
};

type CollectedFile = { file: File; path: string };

function readEntryFile(entry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve, reject) => entry.file(resolve, reject));
}

function readAllDirectoryEntries(entry: FileSystemDirectoryEntry): Promise<FileSystemEntry[]> {
  const reader = entry.createReader();
  const all: FileSystemEntry[] = [];

  function readBatch(): Promise<FileSystemEntry[]> {
    return new Promise((resolve, reject) => {
      reader.readEntries((entries) => {
        if (entries.length === 0) {
          resolve(all);
        } else {
          all.push(...entries);
          readBatch().then(resolve).catch(reject);
        }
      }, reject);
    });
  }

  return readBatch();
}

async function walkEntry(entry: FileSystemEntry, basePath: string, out: CollectedFile[]) {
  if (entry.isFile) {
    const file = await readEntryFile(entry as FileSystemFileEntry);
    out.push({ file, path: `${basePath}${entry.name}` });
  } else if (entry.isDirectory) {
    const children = await readAllDirectoryEntries(entry as FileSystemDirectoryEntry);
    for (const child of children) {
      await walkEntry(child, `${basePath}${entry.name}/`, out);
    }
  }
}

async function collectFromDataTransfer(dataTransfer: DataTransfer): Promise<CollectedFile[]> {
  const items = Array.from(dataTransfer.items);
  const entries = items
    .map((item) => item.webkitGetAsEntry?.())
    .filter((entry): entry is FileSystemEntry => entry != null);

  if (entries.length > 0) {
    const out: CollectedFile[] = [];
    for (const entry of entries) {
      await walkEntry(entry, "", out);
    }
    return out;
  }

  // Fallback navigateurs sans FileSystem API : upload à plat, sans sous-dossiers.
  return Array.from(dataTransfer.files).map((file) => ({ file, path: file.name }));
}

export default function CourseDropzone({ course }: { course: string }) {
  const router = useRouter();
  const [active, setActive] = useState(false);
  const [uploads, setUploads] = useState<PendingUpload[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  async function uploadFiles(files: CollectedFile[]) {
    if (files.length === 0) return;

    setUploads(files.map((f) => ({ path: f.path, status: "pending" })));

    for (const { file, path } of files) {
      setUploads((prev) =>
        prev.map((u) => (u.path === path ? { ...u, status: "uploading" } : u)),
      );

      const formData = new FormData();
      formData.append("file", file);
      formData.append("path", path);

      try {
        const res = await fetch(`/api/cours/${encodeURIComponent(course)}/upload`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Échec de l'upload.");
        }

        setUploads((prev) => prev.map((u) => (u.path === path ? { ...u, status: "done" } : u)));
      } catch (error) {
        setUploads((prev) =>
          prev.map((u) =>
            u.path === path
              ? { ...u, status: "error", error: (error as Error).message }
              : u,
          ),
        );
      }
    }

    router.refresh();
  }

  async function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setActive(false);
    const files = await collectFromDataTransfer(event.dataTransfer);
    await uploadFiles(files);
  }

  async function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const fileList = event.target.files;
    if (!fileList) return;

    const files: CollectedFile[] = Array.from(fileList).map((file) => ({
      file,
      // webkitRelativePath est renseigné quand on sélectionne un dossier entier
      path: (file as any).webkitRelativePath || file.name,
    }));

    await uploadFiles(files);
    event.target.value = "";
  }

  return (
    <div>
      <div
        className={`dropzone${active ? " active" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setActive(true);
        }}
        onDragLeave={() => setActive(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        Glisse des fichiers ou un dossier ici, ou clique pour choisir un dossier.
        <input
          ref={inputRef}
          type="file"
          multiple
          // @ts-expect-error attribut non standard mais supporté par les navigateurs
          webkitdirectory=""
          directory=""
          hidden
          onChange={handleInputChange}
        />
      </div>

      {uploads.length > 0 && (
        <ul className="file-list">
          {uploads.map((u) => (
            <li key={u.path}>
              <span>{u.path}</span>
              <span className={u.status === "error" ? "error" : "muted"}>
                {u.status === "done" && "✓"}
                {u.status === "uploading" && "…"}
                {u.status === "pending" && "en attente"}
                {u.status === "error" && (u.error ?? "erreur")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
