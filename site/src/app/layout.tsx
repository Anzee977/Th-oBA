import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Anzee",
  description: "Espace perso : cours, drive et plus.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
