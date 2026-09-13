"use client";

import { useEffect, useState } from "react";
import { BellIcon } from "./icons";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

type Status = "unsupported" | "checking" | "disabled" | "enabling" | "enabled";

export default function NotificationToggle() {
  const [status, setStatus] = useState<Status>("checking");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function check() {
      if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("unsupported");
        return;
      }
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        const existing = await registration.pushManager.getSubscription();
        setStatus(existing ? "enabled" : "disabled");
      } catch {
        setStatus("disabled");
      }
    }
    check();
  }, []);

  async function enable() {
    setStatus("enabling");
    setError(null);
    try {
      const keyRes = await fetch("/api/push/public-key");
      const keyData = await keyRes.json().catch(() => ({}));
      if (!keyRes.ok) throw new Error(keyData.error ?? "Notifications indisponibles.");

      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Permission refusée.");

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
      });

      const json = subscription.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      if (!res.ok) throw new Error("Échec de l'enregistrement côté serveur.");

      setStatus("enabled");
    } catch (err) {
      setError((err as Error).message);
      setStatus("disabled");
    }
  }

  if (status === "unsupported" || status === "checking") return null;

  return (
    <div>
      <button
        type="button"
        className="btn-secondary"
        onClick={status === "disabled" ? enable : undefined}
        disabled={status === "enabling" || status === "enabled"}
      >
        <BellIcon size={15} />
        <span>
          {status === "enabled"
            ? "Notifications activées"
            : status === "enabling"
              ? "Activation..."
              : "Activer les notifications"}
        </span>
      </button>
      {error && (
        <p className="error" style={{ fontSize: 11.5, marginTop: 4 }}>
          {error}
        </p>
      )}
    </div>
  );
}
