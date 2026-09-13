const TEXT_EXTENSIONS = new Set(["txt", "md", "csv", "json"]);
const MAX_CONTENT_LENGTH = 200_000;

// Extrait le texte d'un fichier pour l'indexation plein texte. Renvoie undefined pour les
// types non supportés (le fichier reste quand même cherchable par son nom).
export async function extractText(filename: string, buffer: Buffer): Promise<string | undefined> {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";

  try {
    if (ext === "pdf") {
      const mod: any = await import("pdf-parse");
      const pdfParse = mod.default ?? mod;
      const data = await pdfParse(buffer);
      return data.text.slice(0, MAX_CONTENT_LENGTH);
    }

    if (ext === "docx") {
      const mod: any = await import("mammoth");
      const mammoth = mod.default ?? mod;
      const result = await mammoth.extractRawText({ buffer });
      return result.value.slice(0, MAX_CONTENT_LENGTH);
    }

    if (TEXT_EXTENSIONS.has(ext)) {
      return buffer.toString("utf-8").slice(0, MAX_CONTENT_LENGTH);
    }
  } catch (error) {
    console.error(`Extraction de texte impossible pour "${filename}" :`, error);
  }

  return undefined;
}
