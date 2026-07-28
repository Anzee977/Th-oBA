import Link from "next/link";
import { listCourses } from "@/lib/nextcloud";
import NewCourseForm from "@/components/NewCourseForm";

export const dynamic = "force-dynamic";

export default async function CoursPage() {
  const courses = await listCourses();

  return (
    <div>
      <h1>Cours & Drive</h1>
      <p className="muted">
        Un dossier par cours, stocké sur ton Nextcloud. Dépose-y tes synthèses, cours et notes du
        jour.
      </p>

      <NewCourseForm />

      {courses.length === 0 ? (
        <p className="muted">Aucun cours pour l&apos;instant. Crée le premier ci-dessus.</p>
      ) : (
        <div className="grid">
          {courses.map((course) => (
            <Link key={course.name} href={`/cours/${encodeURIComponent(course.name)}`} className="card">
              {course.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
