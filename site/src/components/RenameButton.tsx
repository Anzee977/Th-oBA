"use client";

import { useState } from "react";
import { PencilIcon } from "./icons";

export default function RenameButton({
  currentPath,
  onRename,
}: {
  currentPath: string;
  onRename: (newPath: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(currentPath);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    const trimmed = value.trim();
    if (!trimmed || trimmed === currentPath) {
      setOpen(false);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onRename(trimmed);
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
        className="icon-btn"
        title="Renommer / déplacer"
        aria-label="Renommer / déplacer"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setValue(currentPath);
          setError(null);
          setOpen((v) => !v);
        }}
      >
        <PencilIcon />
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
          <form className="popover" onSubmit={submit}>
            <label className="muted popover-label">Nouveau nom / chemin</label>
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
              style={{ width: "100%" }}
              onClick={(e) => e.stopPropagation()}
            />
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
              <button type="submit" className="btn" disabled={busy}>
                {busy ? "…" : "Renommer"}
              </button>
            </div>
          </form>
        </>
      )}
    </span>
  );
}
