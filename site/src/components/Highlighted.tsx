// Affiche un texte contenant des balises <mark>...</mark> (issues du surlignage Meilisearch)
// en éléments React réels, sans jamais injecter de HTML brut (le reste du texte reste échappé).
export default function Highlighted({ text }: { text: string }) {
  const parts = text.split(/(<mark>|<\/mark>)/g);
  const nodes: React.ReactNode[] = [];
  let highlighting = false;

  parts.forEach((part, i) => {
    if (part === "<mark>") {
      highlighting = true;
    } else if (part === "</mark>") {
      highlighting = false;
    } else if (part) {
      nodes.push(highlighting ? <mark key={i}>{part}</mark> : <span key={i}>{part}</span>);
    }
  });

  return <>{nodes}</>;
}
