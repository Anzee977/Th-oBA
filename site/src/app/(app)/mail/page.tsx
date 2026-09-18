import MailDisconnectButton from "@/components/MailDisconnectButton";
import MailView from "@/components/MailView";
import { isGmailConfigured, listInboxMessages } from "@/lib/gmail";
import { isHealthDbEnabled, isMailConnected } from "@/lib/healthDb";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: "Connexion annulée.",
  missing_code: "Réponse de Google incomplète, réessaie.",
  no_refresh_token:
    "Google n'a pas renvoyé de jeton de rafraîchissement — révoque l'accès existant sur myaccount.google.com/permissions puis réessaie.",
  exchange_failed: "Échec de la connexion à Gmail.",
};

export default async function MailPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  if (!isHealthDbEnabled() || !isGmailConfigured()) {
    return (
      <div>
        <h1>Mail</h1>
        <p className="muted">
          Nécessite <code>HEALTH_DB_*</code> et <code>GOOGLE_CLIENT_ID</code>/
          <code>GOOGLE_CLIENT_SECRET</code> dans <code>site/.env</code>.
        </p>
      </div>
    );
  }

  const connected = await isMailConnected();

  if (!connected) {
    return (
      <div>
        <h1>Mail</h1>
        <p className="muted">Connecte ton compte Gmail dédié pour voir et traiter tes mails ici.</p>
        {error && <p className="error">{ERROR_MESSAGES[error] ?? `Erreur : ${error}`}</p>}
        <a href="/api/mail/oauth/start" className="btn" style={{ marginTop: 12, display: "inline-flex" }}>
          Connecter Gmail
        </a>
      </div>
    );
  }

  let messages: Awaited<ReturnType<typeof listInboxMessages>> = [];
  let loadError: string | null = null;
  try {
    messages = await listInboxMessages(25);
  } catch (err) {
    loadError = (err as Error).message;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Mail</h1>
        <MailDisconnectButton />
      </div>
      <p className="muted">Les 25 derniers mails de ta boîte de réception.</p>
      {loadError && <p className="error">{loadError}</p>}
      <div style={{ marginTop: 20 }}>
        <MailView initialMessages={messages} />
      </div>
    </div>
  );
}
