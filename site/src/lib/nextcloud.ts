import { createClient, WebDAVClient } from "webdav";

const BASE_FOLDER = process.env.NEXTCLOUD_BASE_FOLDER || "Cours";

let client: WebDAVClient | null = null;

function getClient(): WebDAVClient {
  if (client) return client;

  const url = process.env.NEXTCLOUD_URL;
  const username = process.env.NEXTCLOUD_USERNAME;
  const password = process.env.NEXTCLOUD_APP_PASSWORD;

  if (!url || !username || !password) {
    throw new Error(
      "Variables NEXTCLOUD_URL / NEXTCLOUD_USERNAME / NEXTCLOUD_APP_PASSWORD manquantes.",
    );
  }

  client = createClient(`${url.replace(/\/$/, "")}/remote.php/dav/files/${encodeURIComponent(username)}`, {
    username,
    password,
  });

  return client;
}

// N'autorise que des noms "simples" : pas de traversée de chemin, pas de séparateurs.
const SEGMENT_PATTERN = /^[^/\\]+$/;

export class InvalidPathError extends Error {}

function assertSafeSegment(segment: string, label: string) {
  if (!segment || segment === "." || segment === ".." || !SEGMENT_PATTERN.test(segment)) {
    throw new InvalidPathError(`${label} invalide : "${segment}"`);
  }
}

// Valide un chemin relatif fichier (peut contenir des sous-dossiers, ex: dossier/note.pdf),
// segment par segment, et rejette toute tentative de sortie du dossier du cours.
function assertSafeRelativePath(relativePath: string) {
  const segments = relativePath.split("/");
  for (const segment of segments) {
    assertSafeSegment(segment, "Segment de chemin");
  }
}

async function ensureDirectory(path: string) {
  const c = getClient();
  const exists = await c.exists(path);
  if (!exists) {
    await c.createDirectory(path, { recursive: true });
  }
}

export async function ensureBaseFolder() {
  await ensureDirectory(`/${BASE_FOLDER}`);
}

export type CourseEntry = {
  name: string;
};

export async function listCourses(): Promise<CourseEntry[]> {
  await ensureBaseFolder();
  const c = getClient();
  const items = await c.getDirectoryContents(`/${BASE_FOLDER}`);

  return items
    .filter((item) => item.type === "directory")
    .map((item) => ({ name: item.basename }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

export async function createCourse(name: string): Promise<void> {
  assertSafeSegment(name, "Nom de cours");
  await ensureBaseFolder();
  await ensureDirectory(`/${BASE_FOLDER}/${name}`);
}

export type FileEntry = {
  path: string; // chemin relatif au dossier du cours
  isDirectory: boolean;
  size: number;
  lastmod: string;
};

export async function listCourseFiles(course: string): Promise<FileEntry[]> {
  assertSafeSegment(course, "Nom de cours");
  const c = getClient();
  const coursePath = `/${BASE_FOLDER}/${course}`;

  if (!(await c.exists(coursePath))) {
    return [];
  }

  const items = await c.getDirectoryContents(coursePath, { deep: true });

  return items
    .map((item) => ({
      path: item.filename.replace(`${coursePath}/`, ""),
      isDirectory: item.type === "directory",
      size: item.size ?? 0,
      lastmod: item.lastmod,
    }))
    .sort((a, b) => a.path.localeCompare(b.path, "fr"));
}

export async function deleteCourse(name: string): Promise<void> {
  assertSafeSegment(name, "Nom de cours");
  const c = getClient();
  const coursePath = `/${BASE_FOLDER}/${name}`;
  if (await c.exists(coursePath)) {
    await c.deleteFile(coursePath);
  }
}

// Fonctionne pour un fichier comme pour un dossier (DELETE WebDAV est récursif sur une collection).
export async function deleteCourseEntry(course: string, relativePath: string): Promise<void> {
  assertSafeSegment(course, "Nom de cours");
  assertSafeRelativePath(relativePath);
  const c = getClient();
  await c.deleteFile(`/${BASE_FOLDER}/${course}/${relativePath}`);
}

export async function statCourseEntry(
  course: string,
  relativePath: string,
): Promise<{ isDirectory: boolean; size: number; lastmod: string } | null> {
  assertSafeSegment(course, "Nom de cours");
  assertSafeRelativePath(relativePath);
  const c = getClient();
  const fullPath = `/${BASE_FOLDER}/${course}/${relativePath}`;
  if (!(await c.exists(fullPath))) return null;

  const result: any = await c.stat(fullPath);
  const item = result?.data ?? result;
  return { isDirectory: item.type === "directory", size: item.size ?? 0, lastmod: item.lastmod };
}

// Renomme ou déplace un fichier/dossier vers un autre chemin du même cours. Crée les
// dossiers intermédiaires de destination si besoin.
export async function moveCourseEntry(
  course: string,
  fromPath: string,
  toPath: string,
): Promise<void> {
  assertSafeSegment(course, "Nom de cours");
  assertSafeRelativePath(fromPath);
  assertSafeRelativePath(toPath);

  const c = getClient();
  const coursePath = `/${BASE_FOLDER}/${course}`;

  const destSegments = toPath.split("/");
  destSegments.pop();
  let currentPath = coursePath;
  for (const segment of destSegments) {
    currentPath = `${currentPath}/${segment}`;
    await ensureDirectory(currentPath);
  }

  await c.moveFile(`${coursePath}/${fromPath}`, `${coursePath}/${toPath}`);
}

export async function createFolder(course: string, relativePath: string): Promise<void> {
  assertSafeSegment(course, "Nom de cours");
  assertSafeRelativePath(relativePath);

  const c = getClient();
  const coursePath = `/${BASE_FOLDER}/${course}`;
  let currentPath = coursePath;
  for (const segment of relativePath.split("/")) {
    currentPath = `${currentPath}/${segment}`;
    await ensureDirectory(currentPath);
  }
}

export type DirEntry = {
  name: string;
  isDirectory: boolean;
  size: number;
  lastmod: string;
};

// Liste le contenu direct (non récursif) d'un dossier de cours, pour la navigation dans l'UI.
export async function listFolder(course: string, folderSegments: string[]): Promise<DirEntry[]> {
  assertSafeSegment(course, "Nom de cours");
  folderSegments.forEach((s) => assertSafeSegment(s, "Segment de chemin"));

  const c = getClient();
  const coursePath = `/${BASE_FOLDER}/${course}`;
  const targetPath = folderSegments.length ? `${coursePath}/${folderSegments.join("/")}` : coursePath;

  if (!(await c.exists(targetPath))) return [];

  const items = await c.getDirectoryContents(targetPath);
  return items
    .map((item) => ({
      name: item.basename,
      isDirectory: item.type === "directory",
      size: item.size ?? 0,
      lastmod: item.lastmod,
    }))
    .sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name, "fr");
    });
}

export async function getCourseFileContents(course: string, relativePath: string): Promise<Buffer> {
  assertSafeSegment(course, "Nom de cours");
  assertSafeRelativePath(relativePath);
  const c = getClient();
  const content = await c.getFileContents(`/${BASE_FOLDER}/${course}/${relativePath}`, {
    format: "binary",
  });
  return Buffer.isBuffer(content) ? content : Buffer.from(content as ArrayBuffer);
}

export async function uploadCourseFile(
  course: string,
  relativePath: string,
  content: Buffer,
): Promise<void> {
  assertSafeSegment(course, "Nom de cours");
  assertSafeRelativePath(relativePath);

  const c = getClient();
  const coursePath = `/${BASE_FOLDER}/${course}`;
  await ensureDirectory(coursePath);

  const segments = relativePath.split("/");
  const fileName = segments.pop()!;

  let currentPath = coursePath;
  for (const segment of segments) {
    currentPath = `${currentPath}/${segment}`;
    await ensureDirectory(currentPath);
  }

  await c.putFileContents(`${currentPath}/${fileName}`, content, { overwrite: true });
}

export async function getCourseFile(
  course: string,
  relativePath: string,
): Promise<Buffer> {
  assertSafeSegment(course, "Nom de cours");
  assertSafeRelativePath(relativePath);

  const c = getClient();
  const coursePath = `/${BASE_FOLDER}/${course}`;
  const content = await c.getFileContents(`${coursePath}/${relativePath}`);

  if (!Buffer.isBuffer(content)) {
    throw new Error("Contenu de fichier inattendu.");
  }

  return content;
}

