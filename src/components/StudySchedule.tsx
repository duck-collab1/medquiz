import { Link } from "react-router-dom";
import { getUpcomingStudyPlan, type ScheduleItem } from "../config/studySchedule";

const WEEKDAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function formatDate(date: Date): string {
  return `${WEEKDAY_LABELS[date.getDay()]} ${date.getDate()}/${date.getMonth() + 1}`;
}

function ScheduleItems({ items }: { items: ScheduleItem[] }) {
  return (
    <>
      {items.map((item, i) => (
        <span key={item.label}>
          {i > 0 && " + "}
          {item.subjectId ? (
            <Link to={`/subjects/${item.subjectId}`}>{item.label}</Link>
          ) : (
            <span className="study-schedule-noaudit" title="Chưa có nội dung môn này trong app">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </>
  );
}

export function StudySchedule() {
  const upcoming = getUpcomingStudyPlan(7);
  if (upcoming.length === 0) return null;
  const [today, ...rest] = upcoming;

  return (
    <div className="study-schedule">
      <h3>📅 Lịch ôn hôm nay</h3>
      <p className="study-schedule-today">
        <ScheduleItems items={today.items} />
      </p>
      {rest.length > 0 && (
        <ul className="study-schedule-upcoming">
          {rest.map(({ date, items }) => (
            <li key={date.toISOString()}>
              <span className="study-schedule-date">{formatDate(date)}</span>
              <ScheduleItems items={items} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
