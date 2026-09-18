"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { navGroups } from "@/lib/nav";
import NotificationToggle from "./NotificationToggle";
import ThemeToggle from "./ThemeToggle";
import {
  ActivityIcon,
  CalendarIcon,
  ChecklistIcon,
  CloseIcon,
  CoffeeIcon,
  DownloadIcon,
  FolderIcon,
  HomeIcon,
  LogOutIcon,
  MailIcon,
  MenuIcon,
  PillIcon,
  TrendingUpIcon,
} from "./icons";

const NAV_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  "/aujourdhui": HomeIcon,
  "/cours": FolderIcon,
  "/calendrier": CalendarIcon,
  "/sante": ActivityIcon,
  "/suivi": PillIcon,
  "/alimentation": CoffeeIcon,
  "/todo": ChecklistIcon,
  "/mail": MailIcon,
  "/analyse": TrendingUpIcon,
  "/export": DownloadIcon,
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="layout">
      <aside className={`sidebar${open ? " open" : ""}`}>
        <div>
          <div className="sidebar-top">
            <div className="brand">
              <span className="brand-mark">T</span>
              <div>
                <div className="brand-name">Théo</div>
                <div className="brand-sub">Espace perso</div>
              </div>
            </div>
            <button
              className="icon-btn sidebar-close"
              onClick={() => setOpen(false)}
              aria-label="Fermer le menu"
            >
              <CloseIcon />
            </button>
          </div>
          <nav style={{ marginTop: 24 }}>
            {navGroups.map((group) => (
              <div key={group.label} className="nav-group">
                <div className="nav-group-label">{group.label}</div>
                {group.items.map((item) => {
                  const Icon = NAV_ICONS[item.href];
                  const active = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`nav-link${active ? " active" : ""}`}
                      onClick={() => setOpen(false)}
                    >
                      {Icon && <Icon size={17} />}
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
          <ThemeToggle />
          <NotificationToggle />
          <button className="btn-secondary" onClick={handleLogout}>
            <LogOutIcon size={15} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {open && <div className="sidebar-backdrop" onClick={() => setOpen(false)} />}

      <div className="main-column">
        <header className="topbar">
          <button className="icon-btn" onClick={() => setOpen(true)} aria-label="Ouvrir le menu">
            <MenuIcon />
          </button>
          <h1>Théo</h1>
          <span style={{ width: 32 }} />
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
