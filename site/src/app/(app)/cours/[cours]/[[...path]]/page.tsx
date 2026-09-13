import { listFolder } from "@/lib/nextcloud";
import CourseDropzone from "@/components/CourseDropzone";
import EntryBrowser from "@/components/EntryBrowser";
import NewFolderForm from "@/components/NewFolderForm";
import DeleteCourseButton from "@/components/DeleteCourseButton";
import Breadcrumb from "@/components/Breadcrumb";
import GenerateSynthesisButton from "@/components/GenerateSynthesisButton";
import { isClaudeEnabled } from "@/lib/claude";
import { NOTES_FOLDER, SYNTHESIS_COURSE } from "@/lib/synthesis";

export const dynamic = "force-dynamic";

export default async function CourseFolderPage({
  params,
}: {
  params: Promise<{ cours: string; path?: string[] }>;
}) {
  const { cours, path } = await params;
  const courseName = decodeURIComponent(cours);
  const pathSegments = path ?? [];
  const entries = await listFolder(courseName, pathSegments);
  const basePath = pathSegments.join("/");
  const currentLabel = pathSegments.length ? pathSegments[pathSegments.length - 1] : courseName;

  const hasNotesFolder = entries.some(
    (e) => e.isDirectory && e.name.toLowerCase() === NOTES_FOLDER.toLowerCase(),
  );
  const showSynthesisButton =
    pathSegments.length === 0 &&
    hasNotesFolder &&
    isClaudeEnabled() &&
    courseName !== SYNTHESIS_COURSE;

  return (
    <div>
      <Breadcrumb course={courseName} pathSegments={pathSegments} />

      <div className="page-header">
        <h1>{currentLabel}</h1>
        {pathSegments.length === 0 && <DeleteCourseButton course={courseName} redirectTo="/cours" />}
      </div>

      {showSynthesisButton && <GenerateSynthesisButton course={courseName} />}

      <CourseDropzone course={courseName} basePath={basePath} />

      <div className="toolbar">
        <h2>Contenu</h2>
        <NewFolderForm course={courseName} basePath={basePath} />
      </div>

      <EntryBrowser course={courseName} pathSegments={pathSegments} entries={entries} />
    </div>
  );
}
