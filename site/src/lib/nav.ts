// Registre central des pages du site. Ajouter une future page (Todo, Calendrier,
// Sport...) revient simplement à ajouter une entrée ici + un dossier sous src/app.
export type NavItem = {
  href: string;
  label: string;
};

export const navItems: NavItem[] = [
  { href: "/cours", label: "Cours & Drive" },
  { href: "/horaire", label: "Horaire" },
  // { href: "/todo", label: "Todo list" },
  // { href: "/sport", label: "Sport" },
];
