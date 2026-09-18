"use client";

import { useRouter } from "next/navigation";
import ConfirmDeleteButton from "./ConfirmDeleteButton";

export default function MailDisconnectButton() {
  const router = useRouter();

  async function disconnect() {
    const res = await fetch("/api/mail/oauth", { method: "DELETE" });
    if (!res.ok) throw new Error("Échec de la déconnexion.");
    router.refresh();
  }

  return (
    <ConfirmDeleteButton
      onConfirm={disconnect}
      label="Déconnecter Gmail"
      confirmText="Déconnecter ce compte Gmail ? Tu pourras le reconnecter à tout moment."
    />
  );
}
