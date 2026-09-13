"use client";

import { useEffect, useRef, useState } from "react";

// Bouton à double confirmation : premier clic affiche "Confirmer ?", second clic déclenche
// réellement l'action. Se réinitialise après quelques secondes si non confirmé.
export default function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  disabled,
}: {
  label: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  disabled?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function handleClick() {
    if (!confirming) {
      setConfirming(true);
      timeoutRef.current = setTimeout(() => setConfirming(false), 4000);
      return;
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setLoading(true);
    Promise.resolve(onConfirm()).finally(() => {
      setLoading(false);
      setConfirming(false);
    });
  }

  return (
    <button
      type="button"
      className="btn btn-secondary"
      style={confirming ? { borderColor: "var(--danger)", color: "var(--danger)" } : undefined}
      onClick={handleClick}
      disabled={disabled || loading}
    >
      {loading ? "..." : confirming ? confirmLabel : label}
    </button>
  );
}
