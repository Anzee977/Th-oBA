import Link from "next/link";
import { listCourseFiles } from "@/lib/nextcloud";
import CourseDropzone from "@/components/CourseDropzone";

export const dynamic = "force-dynamic";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ cours: string }>;
}) {
  const { cours } = await params;
  const courseName = decodeURIComponent(cours);
  const files = await listCourseFiles(courseName);
  const fileEntries = files.filter((f) => !f.isDirectory);

  return (
    <div>
      <Link href="/cours" className="muted">
        ← Tous les cours
      </Link>
      <h1>{courseName}</h1>

      <CourseDropzone course={courseName} />

      <h2 style={{ fontSize: 15, marginTop: 32 }}>Contenu</h2>
      {fileEntries.length === 0 ? (
        <p className="muted">Aucun fichier pour l&apos;instant.</p>
      ) : (
        <ul className="file-list">
          {fileEntries.map((f) => (
            <li key={f.path}>
              <span>{f.path}</span>
              <span className="muted">{formatSize(f.size)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
