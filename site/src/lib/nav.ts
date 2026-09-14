// Registre central des pages du site. Ajouter une future page revient à ajouter
// une entrée ici (dans le bon groupe) + un dossier sous src/app.
export type NavItem = {
  href: string;
  label: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    label: "Cours",
    items: [
      { href: "/cours", label: "Cours & Drive" },
      { href: "/calendrier", label: "Calendrier" },
      { href: "/horaire", label: "Horaire" },
    ],
  },
  {
    label: "Santé",
    items: [
      { href: "/sante", label: "Santé" },
      { href: "/suivi", label: "Suivi" },
      { href: "/alimentation", label: "Alimentation" },
      { href: "/analyse", label: "Analyse" },
    ],
  },
  {
    label: "Organisation",
    items: [
      { href: "/todo", label: "Todo" },
      { href: "/export", label: "Export" },
    ],
  },
  {
    label: "Net Worth",
    items: [
      { href: "/networth", label: "Vue d'ensemble" },
      { href: "/networth/crypto", label: "Crypto" },
      { href: "/networth/tradfi", label: "Trade Fi" },
      { href: "/networth/cash", label: "Cash" },
    ],
  },
];

export const navItems: NavItem[] = navGroups.flatMap((g) => g.items);
