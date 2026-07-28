import { Link } from "react-router-dom";

export interface EntityGridItem {
  slug: string;
  title: string;
  subtitle?: string;
  icon?: string;
}

interface EntityGridProps {
  items: EntityGridItem[];
  basePath: string;
}

export function EntityGrid({ items, basePath }: EntityGridProps) {
  return (
    <div className="subject-grid">
      {items.map((item) => (
        <Link key={item.slug} to={`${basePath}/${item.slug}`} className="subject-card">
          <span className="subject-card-icon">{item.icon || "📚"}</span>
          <span className="subject-card-name">{item.title}</span>
          {item.subtitle && <span className="subject-card-desc">{item.subtitle}</span>}
        </Link>
      ))}
    </div>
  );
}
