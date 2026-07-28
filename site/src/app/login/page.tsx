"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <form onSubmit={handleSubmit} className="card" style={{ width: 320 }}>
        <h1 style={{ fontSize: 18, marginTop: 0 }}>Connexion</h1>
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          style={{ width: "100%", marginBottom: 12 }}
        />
        <button className="btn" type="submit" disabled={loading} style={{ width: "100%" }}>
          {loading ? "Connexion..." : "Se connecter"}
        </button>
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  );
}
