import Link from "next/link";
import { ChevronRightIcon } from "./icons";

export default function Breadcrumb({
  course,
  pathSegments,
}: {
  course: string;
  pathSegments: string[];
}) {
  const crumbs = pathSegments.map((seg, i) => ({
    label: seg,
    href: `/cours/${encodeURIComponent(course)}/${pathSegments
      .slice(0, i + 1)
      .map(encodeURIComponent)
      .join("/")}`,
  }));

  return (
    <nav className="breadcrumb" aria-label="Fil d'ariane">
      <Link href="/cours" className="muted">
        Cours
      </Link>
      <span className="breadcrumb-item">
        <ChevronRightIcon />
        {crumbs.length === 0 ? (
          <span>{course}</span>
        ) : (
          <Link href={`/cours/${encodeURIComponent(course)}`}>{course}</Link>
        )}
      </span>
      {crumbs.map((crumb, i) => (
        <span key={crumb.href} className="breadcrumb-item">
          <ChevronRightIcon />
          {i === crumbs.length - 1 ? <span>{crumb.label}</span> : <Link href={crumb.href}>{crumb.label}</Link>}
        </span>
      ))}
    </nav>
  );
}
