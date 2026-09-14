"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "./icons";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("theme", theme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    "content",
    theme === "light" ? "#faf8f3" : "#0d0c0a",
  );
}

export default function ThemeToggle() {
  // null tant que non monté, pour éviter un mismatch d'hydratation (le rendu serveur ne
  // connaît pas la préférence stockée en localStorage) — voir layout.tsx pour le script
  // inline qui applique déjà le bon thème au <html> avant la peinture initiale.
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  }, []);

  if (theme === null) return null;

  function toggle() {
    const next: Theme = theme === "light" ? "dark" : "light";
    applyTheme(next);
    setTheme(next);
  }

  return (
    <button type="button" className="btn-secondary" onClick={toggle}>
      {theme === "light" ? <MoonIcon size={15} /> : <SunIcon size={15} />}
      <span>{theme === "light" ? "Mode sombre" : "Mode clair"}</span>
    </button>
  );
}
