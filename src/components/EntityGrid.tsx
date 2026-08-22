import { Link } from "react-router-dom";
import { SubjectIcon } from "./SubjectIcon";
import type { IconName } from "../config/icons";

export interface EntityGridItem {
  slug: string;
  title: string;
  subtitle?: string;
  icon?: IconName;
  isExamTopic?: boolean;
}

interface EntityGridProps {
  items: EntityGridItem[];
  basePath: string;
}

export function EntityGrid({ items, basePath }: EntityGridProps) {
  return (
    <div className="subject-grid">
      {items.map((item) => (
        <Link
          key={item.slug}
          to={`${basePath}/${item.slug}`}
          className={item.isExamTopic ? "subject-card subject-card-exam" : "subject-card"}
        >
          {item.isExamTopic && (
            <span className="subject-card-exam-badge" title="Có trong danh mục thi nội trú">
              📌
            </span>
          )}
          <span className="subject-card-icon">
            <SubjectIcon name={item.icon ?? "book"} />
          </span>
          <span className="subject-card-name">{item.title}</span>
          {item.subtitle && <span className="subject-card-desc">{item.subtitle}</span>}
        </Link>
      ))}
    </div>
  );
}
