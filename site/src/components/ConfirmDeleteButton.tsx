"use client";

import { useState } from "react";
import { TrashIcon } from "./icons";

export default function ConfirmDeleteButton({
  onConfirm,
  label = "Supprimer",
  confirmText = "Supprimer définitivement ?",
  iconOnly = false,
}: {
  onConfirm: () => Promise<void>;
  label?: string;
  confirmText?: string;
  iconOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      setOpen(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="popover-anchor" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className={iconOnly ? "icon-btn danger" : "btn-secondary danger"}
        title={label}
        aria-label={label}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setError(null);
          setOpen((v) => !v);
        }}
      >
        <TrashIcon />
        {!iconOnly && <span>{label}</span>}
      </button>

      {open && (
        <>
          <div
            className="popover-backdrop"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
          />
          <div className="popover" role="dialog">
            <p>{confirmText}</p>
            {error && <p className="error">{error}</p>}
            <div className="popover-actions">
              <button
                type="button"
                className="btn-secondary"
                disabled={busy}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpen(false);
                }}
              >
                Annuler
              </button>
              <button type="button" className="btn btn-danger" disabled={busy} onClick={confirm}>
                {busy ? "…" : "Supprimer"}
              </button>
            </div>
          </div>
        </>
      )}
    </span>
  );
}
