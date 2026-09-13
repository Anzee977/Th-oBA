"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LockIcon } from "@/components/icons";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Erreur de connexion.");
        return;
      }

      router.push("/cours");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <form onSubmit={handleSubmit} className="card login-card">
        <span className="login-lock">
          <LockIcon size={20} />
        </span>
        <h1>Anzee</h1>
        <p className="muted" style={{ marginBottom: 20 }}>
          Entre ton mot de passe pour accéder à ton espace.
        </p>
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          style={{ width: "100%", marginBottom: 12 }}
        />
        <button className="btn" type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
          {loading ? "Connexion..." : "Se connecter"}
        </button>
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  );
}
