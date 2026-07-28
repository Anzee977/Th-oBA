"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { navItems } from "@/lib/nav";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="sidebar">
      <div>
        <h1>Anzee</h1>
        <nav>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname.startsWith(item.href) ? "active" : ""}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <button className="btn btn-secondary" onClick={handleLogout} style={{ marginTop: "auto" }}>
        Déconnexion
      </button>
    </aside>
  );
}
