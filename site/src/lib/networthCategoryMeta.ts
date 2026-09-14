import { NetworthCategory } from "./healthDb";

// Données pures (pas de JSX) pour rester importables depuis du code serveur ET client sans
// ambiguïté de frontière "use client". Les icônes (JSX) restent définies localement dans les
// composants client qui en ont besoin (voir NetWorthCategoryView.tsx).
export const NETWORTH_CATEGORY_LABELS: Record<NetworthCategory, string> = {
  crypto: "Crypto",
  tradfi: "Trade Fi",
  cash: "Cash",
};

export const NETWORTH_CATEGORY_COLORS: Record<NetworthCategory, string> = {
  crypto: "var(--warning)",
  tradfi: "var(--info)",
  cash: "var(--success)",
};

export const NETWORTH_CATEGORY_STAT_CLASS: Record<NetworthCategory, string> = {
  crypto: "warning",
  tradfi: "info",
  cash: "success",
};
