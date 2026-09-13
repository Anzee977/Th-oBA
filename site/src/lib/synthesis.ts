import { createCourse, getCourseFileContents, listCourseFiles, uploadCourseFile } from "./nextcloud";
import { extractText } from "./extract";
import { generateWeeklySynthesisText } from "./claude";
import { indexFile } from "./indexer";

export const NOTES_FOLDER = "notes de cours";
export const SYNTHESIS_COURSE = "Synthèse de semaine";

const MAX_TOTAL_NOTES_CHARS = 150_000;

export class NoNotesError extends Error {}

function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const weekday = (d.getDay() + 6) % 7; // 0 = lundi
  d.setDate(d.getDate() - weekday);
  return d;
}

function addDays(date: Date, delta: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + delta);
  return d;
}

// Numéro de semaine ISO 8601 (1-53, semaine du jeudi).
function isoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstThursdayDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstThursdayDayNum + 3);
  const diff = d.getTime() - firstThursday.getTime();
  return 1 + Math.round(diff / (7 * 24 * 3600 * 1000));
}

export async function generateWeeklySynthesis(
  course: string,
): Promise<{ path: string; content: string }> {
  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekEndExclusive = addDays(weekStart, 7);
  const weekNumber = isoWeekNumber(now);

  const allFiles = await listCourseFiles(course);
  const notesPrefix = `${NOTES_FOLDER.toLowerCase()}/`;
  const notesFiles = allFiles.filter((file) => {
    if (file.isDirectory) return false;
    if (!file.path.toLowerCase().startsWith(notesPrefix)) return false;
    const modified = new Date(file.lastmod);
    return modified >= weekStart && modified < weekEndExclusive;
  });

  if (notesFiles.length === 0) {
    throw new NoNotesError(
      `Aucune note trouvée cette semaine dans « ${NOTES_FOLDER} ».`,
    );
  }

  const sections: string[] = [];
  let totalLength = 0;

  for (const file of notesFiles) {
    if (totalLength >= MAX_TOTAL_NOTES_CHARS) break;

    const buffer = await getCourseFileContents(course, file.path);
    const filename = file.path.split("/").pop() ?? file.path;
    const text = await extractText(filename, buffer);
    if (!text) continue;

    const remaining = MAX_TOTAL_NOTES_CHARS - totalLength;
    const truncated = text.slice(0, remaining);
    sections.push(`## ${filename}\n\n${truncated}`);
    totalLength += truncated.length;
  }

  if (sections.length === 0) {
    throw new NoNotesError(
      "Des notes ont été trouvées cette semaine, mais leur contenu n'a pas pu être extrait (format non supporté).",
    );
  }

  const notesText = sections.join("\n\n---\n\n");
  const synthesis = await generateWeeklySynthesisText({ course, weekNumber, notesText });

  await createCourse(SYNTHESIS_COURSE);
  const filename = `${course} S${weekNumber}.md`;
  await uploadCourseFile(SYNTHESIS_COURSE, filename, Buffer.from(synthesis, "utf-8"));
  await indexFile(SYNTHESIS_COURSE, filename);

  return { path: filename, content: synthesis };
}
