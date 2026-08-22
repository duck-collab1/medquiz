import { Link } from "react-router-dom";
import { getUpcomingPlan, COMPLETED_TOPICS, type DayPlan, type ScheduleItem } from "../config/studySchedule";

const WEEKDAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function formatDate(date: Date): string {
  return `${WEEKDAY_LABELS[date.getDay()]} ${date.getDate()}/${date.getMonth() + 1}`;
}

function Item({ item }: { item: ScheduleItem }) {
  return item.subjectId ? (
    <Link to={`/subjects/${item.subjectId}`}>{item.label}</Link>
  ) : (
    <span className="study-schedule-noaudit" title="Chưa có nội dung môn này trong app">
      {item.label}
    </span>
  );
}

function PlanSummary({ plan }: { plan: DayPlan }) {
  if (plan.kind === "recall") {
    return (
      <span>
        🎤 Reactive Recall — trình bày lại & tự chất vấn về{" "}
        <strong>{plan.block ? plan.block.title : COMPLETED_TOPICS.join(", ")}</strong>
      </span>
    );
  }
  if (plan.kind === "review") {
    return (
      <span>
        📝 Ôn tập lại cả tuần + luyện đề — <strong>{plan.block.title}</strong>
      </span>
    );
  }
  return (
    <span>
      {plan.base.map((item, i) => (
        <span key={item.label}>
          {i > 0 && ", "}
          <Item item={item} />
        </span>
      ))}
      {plan.base.length > 0 && plan.clinical.length > 0 && " · "}
      {plan.clinical.map((item, i) => (
        <span key={item.label}>
          {i > 0 && ", "}
          <Item item={item} />
        </span>
      ))}
    </span>
  );
}

export function StudySchedule() {
  const upcoming = getUpcomingPlan(7);
  if (upcoming.length === 0) return null;
  const [today, ...rest] = upcoming;

  return (
    <div className="study-schedule">
      <h3>📅 Lịch ôn hôm nay</h3>
      {today.plan.kind === "weekday" && (
        <p className="study-schedule-topic">{today.plan.block.title}</p>
      )}
      <p className="study-schedule-today">
        <PlanSummary plan={today.plan} />
      </p>
      {rest.length > 0 && (
        <ul className="study-schedule-upcoming">
          {rest.map(({ date, plan }) => (
            <li key={date.toISOString()}>
              <span className="study-schedule-date">{formatDate(date)}</span>
              <PlanSummary plan={plan} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
