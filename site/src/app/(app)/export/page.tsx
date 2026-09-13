import { isHealthDbEnabled } from "@/lib/healthDb";
import { DownloadIcon } from "@/components/icons";

const DATASETS = [
  {
    id: "sante",
    label: "Santé",
    description: "Pas, sommeil, Body Battery, fréquence cardiaque, calories — un jour par ligne.",
  },
  {
    id: "complements",
    label: "Compléments",
    description: "Chaque prise de whey/créatine/mélatonine, horodatée.",
  },
  {
    id: "alimentation",
    label: "Alimentation",
    description: "Chaque café et repas (avec taille), horodatés.",
  },
  {
    id: "activites",
    label: "Activités",
    description: "Historique des activités Garmin synchronisées.",
  },
];

export const dynamic = "force-dynamic";

export default function ExportPage() {
  if (!isHealthDbEnabled()) {
    return (
      <div>
        <h1>Export</h1>
        <p className="muted">
          L&apos;export nécessite la base de données santé (variables HEALTH_DB_* dans site/.env).
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1>Export</h1>
      <p className="muted">Télécharge tes données au format CSV pour une analyse externe.</p>

      <div className="grid" style={{ marginTop: 20, gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
        {DATASETS.map((d) => (
          <div key={d.id} className="card export-card">
            <h3>{d.label}</h3>
            <p className="muted">{d.description}</p>
            <a href={`/api/export/${d.id}`} download className="btn-secondary" style={{ marginTop: 8 }}>
              <DownloadIcon size={15} /> Télécharger le CSV
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
