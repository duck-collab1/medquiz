import { Link } from "react-router-dom";
import { getDueReviews } from "../services/progressService";
import { getSubject } from "../config/subjects";
import { slugify } from "../utils/slug";

export function ReviewReminder() {
  const due = getDueReviews();
  if (due.length === 0) return null;

  return (
    <div className="review-reminder">
      <h3>🔁 Cần ôn lại hôm nay</h3>
      <ul>
        {due.map((item) => {
          const subject = getSubject(item.subject);
          const groupSlug = item.group ? slugify(item.group) : "";
          const chapterSlug = item.chapter ? slugify(item.chapter) : "tat-ca";
          const href = item.group
            ? `/subjects/${item.subject}/${groupSlug}/${chapterSlug}`
            : `/subjects/${item.subject}`;
          const label = [subject?.name, item.group, item.chapter]
            .filter(Boolean)
            .join(" · ");
          return (
            <li key={`${item.subject}:${item.group ?? ""}:${item.chapter ?? ""}`}>
              <Link to={href}>{label}</Link>
              <span className="review-overdue">
                {item.daysOverdue === 0 ? "đến hạn" : `quá hạn ${item.daysOverdue} ngày`}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
