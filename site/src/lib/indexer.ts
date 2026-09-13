import { getCourseFileContents, listCourseFiles, statCourseEntry } from "./nextcloud";
import { extractText } from "./extract";
import { deleteCourseDocuments, deleteDocument, docId, isSearchEnabled, upsertDocument } from "./search";

export async function indexFile(course: string, relativePath: string): Promise<void> {
  if (!isSearchEnabled()) return;

  try {
    const stat = await statCourseEntry(course, relativePath);
    if (!stat || stat.isDirectory) return;

    const buffer = await getCourseFileContents(course, relativePath);
    const filename = relativePath.split("/").pop() ?? relativePath;
    const content = await extractText(filename, buffer);
    const lastmodTs = Math.floor(new Date(stat.lastmod).getTime() / 1000);

    await upsertDocument({
      id: docId(course, relativePath),
      course,
      path: relativePath,
      filename,
      size: stat.size,
      lastmod: stat.lastmod,
      lastmodTs,
      content,
    });
  } catch (error) {
    console.error(`Indexation impossible pour ${course}/${relativePath} :`, error);
  }
}

export async function removeFromIndex(course: string, relativePath: string): Promise<void> {
  if (!isSearchEnabled()) return;
  try {
    await deleteDocument(course, relativePath);
  } catch (error) {
    console.error(error);
  }
}

// Réindexation complète d'un cours : utilisée après une opération sur un dossier
// (suppression/déplacement) où il serait fastidieux de calculer précisément quels
// documents ont bougé.
export async function reindexCourse(course: string): Promise<void> {
  if (!isSearchEnabled()) return;

  try {
    await deleteCourseDocuments(course);
    const files = await listCourseFiles(course);
    for (const file of files.filter((f) => !f.isDirectory)) {
      await indexFile(course, file.path);
    }
  } catch (error) {
    console.error(`Réindexation impossible pour le cours ${course} :`, error);
  }
}
