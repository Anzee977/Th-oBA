import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function isClaudeEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function getClient(): Anthropic {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY manquant.");
  }
  client = new Anthropic({ apiKey });
  return client;
}

const SYSTEM_PROMPT = `Tu es un assistant qui aide un étudiant à réviser ses cours.
On te donne des notes de cours brutes, prises pendant une semaine, pour une matière donnée.
Produis une courte synthèse en français, au format Markdown, qui :
- identifie les chapitres/thèmes/parties du cours abordés cette semaine (ex: "Chapitre 1 à 3", ou les titres si les chapitres ne sont pas numérotés) ;
- résume en quelques points les notions clés de chaque partie ;
- se termine par une liste "À réviser en priorité" avec les points qui semblent les plus importants ou les moins clairs dans les notes.
Reste concis : l'objectif est d'aider à démarrer une révision, pas de tout réexpliquer.`;

export async function generateWeeklySynthesisText({
  course,
  weekNumber,
  notesText,
}: {
  course: string;
  weekNumber: number;
  notesText: string;
}): Promise<string> {
  const anthropic = getClient();

  const stream = anthropic.messages.stream({
    model: "claude-opus-4-8",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Voici mes notes de cours de "${course}" prises cette semaine (semaine ${weekNumber}). Génère une synthèse pour m'aider à commencer à réviser.\n\n${notesText}`,
      },
    ],
  });

  const finalMessage = await stream.finalMessage();
  const textBlock = finalMessage.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text",
  );

  if (!textBlock) {
    throw new Error("Réponse vide de Claude.");
  }

  return textBlock.text;
}
