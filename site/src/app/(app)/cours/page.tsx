import Link from "next/link";
import { listCourses } from "@/lib/nextcloud";
import NewCourseForm from "@/components/NewCourseForm";
import DeleteCourseButton from "@/components/DeleteCourseButton";
import { FolderIcon, SearchIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function CoursPage() {
  const courses = await listCourses();

  return (
    <div>
      <div className="page-header">
        <h1>Cours & Drive</h1>
        <Link href="/cours/recherche" className="btn-secondary">
          <SearchIcon size={15} />
          <span>Rechercher</span>
        </Link>
      </div>
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
            <div key={course.name} className="card course-card">
              <Link href={`/cours/${encodeURIComponent(course.name)}`} className="course-card-link">
                <span className="entry-icon folder">
                  <FolderIcon size={20} />
                </span>
                <span className="entry-name">{course.name}</span>
              </Link>
              <DeleteCourseButton course={course.name} iconOnly />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
