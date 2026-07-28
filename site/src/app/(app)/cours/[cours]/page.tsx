import Link from "next/link";
import { listCourseFiles } from "@/lib/nextcloud";
import CourseDropzone from "@/components/CourseDropzone";
import DeleteCourseButton from "@/components/DeleteCourseButton";
import FileRow from "@/components/FileRow";

export const dynamic = "force-dynamic";

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

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
        }}
      >
        <h1>{courseName}</h1>
        <DeleteCourseButton course={courseName} />
      </div>

      <CourseDropzone course={courseName} />

      <h2 style={{ fontSize: 15, marginTop: 32 }}>Contenu</h2>
      {fileEntries.length === 0 ? (
        <p className="muted">Aucun fichier pour l&apos;instant.</p>
      ) : (
        <ul className="file-list">
          {fileEntries.map((f) => (
            <FileRow key={f.path} course={courseName} path={f.path} size={f.size} lastmod={f.lastmod} />
          ))}
        </ul>
      )}
    </div>
  );
}
