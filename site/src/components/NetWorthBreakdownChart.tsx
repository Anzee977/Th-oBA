import { NetworthCategory } from "@/lib/healthDb";
import { NETWORTH_CATEGORY_COLORS, NETWORTH_CATEGORY_LABELS } from "@/lib/networthCategoryMeta";

function formatEur(value: number): string {
  return value.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

const CATEGORIES: NetworthCategory[] = ["crypto", "tradfi", "cash"];

export default function NetWorthBreakdownChart({
  breakdown,
}: {
  breakdown: Record<NetworthCategory, number>;
}) {
  const total = breakdown.crypto + breakdown.tradfi + breakdown.cash;

  if (total <= 0) {
    return <p className="muted">Pas encore de possession valorisée.</p>;
  }

  const size = 140;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulative = 0;
  const segments = CATEGORIES.filter((c) => breakdown[c] > 0).map((c) => {
    const dash = (breakdown[c] / total) * circumference;
    const offset = cumulative;
    cumulative += dash;
    return { category: c, dash, offset };
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: "rotate(-90deg)", flexShrink: 0 }}
      >
        {segments.map((s) => (
          <circle
            key={s.category}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={NETWORTH_CATEGORY_COLORS[s.category]}
            strokeWidth={strokeWidth}
            strokeDasharray={`${s.dash} ${circumference - s.dash}`}
            strokeDashoffset={-s.offset}
          />
        ))}
      </svg>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {CATEGORIES.map((c) => (
          <li key={c} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: NETWORTH_CATEGORY_COLORS[c],
                flexShrink: 0,
              }}
            />
            <span style={{ minWidth: 68 }}>{NETWORTH_CATEGORY_LABELS[c]}</span>
            <span className="muted">
              {formatEur(breakdown[c])} · {Math.round((breakdown[c] / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
