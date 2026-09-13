import { createHash } from "crypto";
import { MeiliSearch } from "meilisearch";

const INDEX_NAME = "files";

let client: MeiliSearch | null = null;
let indexReady: Promise<void> | null = null;

export function isSearchEnabled(): boolean {
  return Boolean(process.env.MEILISEARCH_URL && process.env.MEILISEARCH_KEY);
}

function getMeiliClient(): MeiliSearch | null {
  if (!isSearchEnabled()) return null;
  if (!client) {
    client = new MeiliSearch({
      host: process.env.MEILISEARCH_URL!,
      apiKey: process.env.MEILISEARCH_KEY!,
    });
  }
  return client;
}

async function ensureIndex(): Promise<MeiliSearch | null> {
  const c = getMeiliClient();
  if (!c) return null;

  if (!indexReady) {
    indexReady = (async () => {
      await c.createIndex(INDEX_NAME, { primaryKey: "id" }).catch(() => {});
      const index = c.index(INDEX_NAME);
      await index.updateFilterableAttributes(["course", "lastmodTs"]);
      await index.updateSortableAttributes(["lastmodTs"]);
      await index.updateSearchableAttributes(["filename", "content", "path"]);
    })();
  }

  await indexReady;
  return c;
}

// Identifiant stable et valide pour Meilisearch, dérivé du chemin du fichier.
export function docId(course: string, path: string): string {
  return createHash("sha1").update(`${course}::${path}`).digest("hex");
}

export type SearchDoc = {
  id: string;
  course: string;
  path: string;
  filename: string;
  size: number;
  lastmod: string;
  lastmodTs: number;
  content?: string;
};

export async function upsertDocument(doc: SearchDoc): Promise<void> {
  const c = await ensureIndex();
  if (!c) return;
  await c.index(INDEX_NAME).addDocuments([doc]);
}

export async function deleteDocument(course: string, path: string): Promise<void> {
  const c = await ensureIndex();
  if (!c) return;
  await c.index(INDEX_NAME).deleteDocument(docId(course, path));
}

export async function deleteCourseDocuments(course: string): Promise<void> {
  const c = await ensureIndex();
  if (!c) return;
  await c.index(INDEX_NAME).deleteDocuments({ filter: `course = "${course.replace(/"/g, "")}"` });
}

export async function searchDocuments(params: {
  query: string;
  course?: string;
  fromTs?: number;
  toTs?: number;
}): Promise<{ available: boolean; hits: any[] }> {
  const c = await ensureIndex();
  if (!c) return { available: false, hits: [] };

  const filters: string[] = [];
  if (params.course) filters.push(`course = "${params.course.replace(/"/g, "")}"`);
  if (params.fromTs != null) filters.push(`lastmodTs >= ${params.fromTs}`);
  if (params.toTs != null) filters.push(`lastmodTs <= ${params.toTs}`);

  const result = await c.index(INDEX_NAME).search(params.query, {
    filter: filters.length ? filters.join(" AND ") : undefined,
    limit: 50,
    attributesToCrop: ["content"],
    cropLength: 24,
    attributesToHighlight: ["filename", "content"],
    highlightPreTag: "<mark>",
    highlightPostTag: "</mark>",
  });

  return { available: true, hits: result.hits };
}
